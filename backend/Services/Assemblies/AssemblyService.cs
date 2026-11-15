using backend.Constants;
using backend.Data;
using backend.DTOs.Assembly;
using backend.Enums;
using backend.Exceptions;
using backend.Models;
using backend.Services.Email;
using backend.Services.Notifications;
using backend.Services.Permissions;
using backend.Services.Storage;
using backend.Settings;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace backend.Services.Assemblies;

// Assemblies are prepared as drafts by the management (Admin, or syndic with
// "assemblies.manage"), then published: from then on the agenda is frozen and everyone in the
// condominium can see it.
public class AssemblyService : IAssemblyService
{
    private static readonly System.Globalization.CultureInfo PtBr = System.Globalization.CultureInfo.GetCultureInfo("pt-BR");

    private const int MaxItems = 30;
    private const int MaxOptions = 10;

    private readonly AppDbContext _context;
    private readonly IPermissionService _permissionService;
    private readonly INotificationService _notificationService;
    private readonly IEmailQueue _emailQueue;
    private readonly AppSettings _appSettings;
    private readonly IFileStorage _fileStorage;
    private readonly ILogger<AssemblyService> _logger;

    public AssemblyService(
        AppDbContext context,
        IPermissionService permissionService,
        INotificationService notificationService,
        IEmailQueue emailQueue,
        IOptions<AppSettings> appSettings,
        IFileStorage fileStorage,
        ILogger<AssemblyService> logger)
    {
        _context = context;
        _permissionService = permissionService;
        _notificationService = notificationService;
        _emailQueue = emailQueue;
        _appSettings = appSettings.Value;
        _fileStorage = fileStorage;
        _logger = logger;
    }

    public async Task<AssemblyResponseDto> CreateAsync(int userId, int condominiumId, SaveAssemblyDto dto)
    {
        await _permissionService.EnsureCondominiumPermissionAsync(userId, condominiumId, AppPermissions.AssembliesManage);

        Validate(dto);

        var assembly = new Assembly
        {
            CondominiumId = condominiumId,
            CreatedByUserId = userId,
            CreatedAt = DateTime.UtcNow
        };

        Apply(assembly, dto);

        _context.Assemblies.Add(assembly);
        await _context.SaveChangesAsync();

        return await GetDetailsAsync(assembly.Id);
    }

    public async Task<IEnumerable<AssemblyResponseDto>> GetByCondominiumAsync(int userId, int condominiumId)
    {
        await _permissionService.EnsureCondominiumAccessAsync(userId, condominiumId);
        await _permissionService.EnsureModuleEnabledAsync(condominiumId, AppModules.Assemblies);

        var canManage = await CanManageAsync(userId, condominiumId);

        var rows = await _context.Assemblies
            .AsNoTracking()
            .Where(assembly =>
                assembly.CondominiumId == condominiumId &&
                (canManage || assembly.Status != AssemblyStatus.Draft))
            .OrderByDescending(assembly => assembly.VotingStartsAt)
            .Select(assembly => new
            {
                assembly,
                ItemsCount = assembly.Items.Count,
                CreatedByName = assembly.CreatedByUser.Person.Name
            })
            .ToListAsync();

        return rows.Select(row => ToResponse(row.assembly, row.ItemsCount, row.CreatedByName, null)).ToList();
    }

    public async Task<AssemblyResponseDto> GetByIdAsync(int userId, int assemblyId)
    {
        var assembly = await _context.Assemblies.AsNoTracking().FirstOrDefaultAsync(item => item.Id == assemblyId)
            ?? throw new NotFoundException("Assembleia não encontrada.");

        await _permissionService.EnsureCondominiumAccessAsync(userId, assembly.CondominiumId);

        await _permissionService.EnsureModuleEnabledAsync(assembly.CondominiumId, AppModules.Assemblies);

        // Drafts exist only for the management.
        if (assembly.Status == AssemblyStatus.Draft && !await CanManageAsync(userId, assembly.CondominiumId))
            throw new NotFoundException("Assembleia não encontrada.");

        return await GetDetailsAsync(assemblyId);
    }

    public async Task<AssemblyResponseDto> UpdateAsync(int userId, int assemblyId, SaveAssemblyDto dto)
    {
        var assembly = await FindDraftAsync(userId, assemblyId);

        Validate(dto);

        var previousOptions = assembly.Items
            .SelectMany(item => item.Options.Select(option => (ItemOrder: item.Order, Option: option)))
            .Where(entry => entry.Option.AttachmentStorageKey != null)
            .ToList();

        _context.AssemblyItems.RemoveRange(assembly.Items);
        assembly.Items.Clear();
        Apply(assembly, dto);

        // The items are recreated on every save: an option that is still there (same item
        // position and same text) keeps its attachment; the files of the others are deleted.
        foreach (var item in assembly.Items)
        {
            foreach (var option in item.Options.Where(option => !option.IsAbstention))
            {
                var previous = previousOptions.FirstOrDefault(entry =>
                    entry.ItemOrder == item.Order && entry.Option.Text == option.Text);

                if (previous.Option is null)
                    continue;

                option.AttachmentFileName = previous.Option.AttachmentFileName;
                option.AttachmentContentType = previous.Option.AttachmentContentType;
                option.AttachmentSizeBytes = previous.Option.AttachmentSizeBytes;
                option.AttachmentStorageKey = previous.Option.AttachmentStorageKey;
                previousOptions.Remove(previous);
            }
        }

        await _context.SaveChangesAsync();

        foreach (var entry in previousOptions)
            await DeleteFileQuietlyAsync(entry.Option.AttachmentStorageKey!);

        return await GetDetailsAsync(assembly.Id);
    }

    public async Task DeleteAsync(int userId, int assemblyId)
    {
        var assembly = await FindDraftAsync(userId, assemblyId);

        var attachmentKeys = GetAttachmentKeys(assembly);

        // Items and options go with the assembly (cascade), and then their files.
        _context.Assemblies.Remove(assembly);
        await _context.SaveChangesAsync();

        foreach (var key in attachmentKeys)
            await DeleteFileQuietlyAsync(key);
    }

    public async Task<AssemblyResponseDto> PublishAsync(int userId, int assemblyId)
    {
        var assembly = await FindDraftAsync(userId, assemblyId);

        if (assembly.Items.Count == 0)
            throw new BadRequestException("Inclua pelo menos uma pauta antes de publicar.");

        if (assembly.VotingEndsAt <= DateTime.UtcNow)
            throw new BadRequestException("O fim da votação já passou. Ajuste as datas antes de publicar.");

        assembly.Status = AssemblyStatus.Published;
        assembly.PublishedAt = DateTime.UtcNow;
        assembly.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        await NotifyConvocationAsync(assembly);

        return await GetDetailsAsync(assembly.Id);
    }

    public async Task<AssemblyResponseDto> CancelAsync(int userId, int assemblyId, CancelAssemblyDto dto)
    {
        var assembly = await _context.Assemblies.FirstOrDefaultAsync(item => item.Id == assemblyId)
            ?? throw new NotFoundException("Assembleia não encontrada.");

        await _permissionService.EnsureCondominiumPermissionAsync(userId, assembly.CondominiumId, AppPermissions.AssembliesManage);

        if (assembly.Status == AssemblyStatus.Draft)
            throw new BadRequestException("Rascunhos não são cancelados: apague-o.");

        if (assembly.Status != AssemblyStatus.Published)
            throw new BadRequestException("Esta assembleia já foi encerrada ou cancelada.");

        var reason = dto.Reason?.Trim() ?? string.Empty;

        if (reason.Length < 5)
            throw new BadRequestException("Informe o motivo do cancelamento.");

        if (reason.Length > 500)
            throw new BadRequestException("O motivo pode ter no máximo 500 caracteres.");

        assembly.Status = AssemblyStatus.Canceled;
        assembly.CanceledAt = DateTime.UtcNow;
        assembly.CancelReason = reason;
        assembly.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        await NotifyEveryoneAsync(
            assembly,
            "Assembleia cancelada",
            $"A assembleia \"{assembly.Title}\" foi cancelada. Motivo: {reason}",
            (member, url) => AssemblyEmails.Canceled(member.FirstName, member.CondominiumName, assembly.Title, reason, url));

        return await GetDetailsAsync(assembly.Id);
    }

    public async Task<MyBallotDto> GetMyBallotAsync(int userId, int assemblyId)
    {
        var assembly = await FindVisibleAsync(userId, assemblyId);
        return await BuildBallotAsync(userId, assembly);
    }

    public async Task<MyBallotDto> CastVotesAsync(int userId, int assemblyId, CastVotesDto dto)
    {
        var assembly = await FindVisibleAsync(userId, assemblyId);

        if (GetPhase(assembly, DateTime.UtcNow) != AssemblyPhase.Open)
            throw new BadRequestException("A votação desta assembleia não está aberta.");

        if (dto.Votes.Count == 0)
            throw new BadRequestException("Escolha pelo menos uma pauta para votar.");

        var ballot = await BuildBallotAsync(userId, assembly);
        var unit = ballot.Units.FirstOrDefault(item => item.UnitId == dto.UnitId)
            ?? throw new ForbiddenException("Você não tem vínculo com esta unidade.");

        if (!unit.CanVote)
            throw new ForbiddenException(unit.BlockReason!);

        var options = await _context.AssemblyItemOptions
            .AsNoTracking()
            .Where(option => option.AssemblyItem.AssemblyId == assembly.Id)
            .Select(option => new { option.Id, option.AssemblyItemId })
            .ToListAsync();

        if (dto.Votes.Select(vote => vote.ItemId).Distinct().Count() != dto.Votes.Count)
            throw new BadRequestException("Envie um voto por pauta.");

        foreach (var vote in dto.Votes)
        {
            if (!options.Any(option => option.Id == vote.OptionId && option.AssemblyItemId == vote.ItemId))
                throw new BadRequestException("Opção de voto inválida para esta pauta.");
        }

        var itemIds = dto.Votes.Select(vote => vote.ItemId).ToList();

        var existing = await _context.AssemblyVotes
            .Where(vote => vote.UnitId == dto.UnitId && itemIds.Contains(vote.AssemblyItemId))
            .ToListAsync();

        var now = DateTime.UtcNow;

        foreach (var vote in dto.Votes)
        {
            var current = existing.FirstOrDefault(item => item.AssemblyItemId == vote.ItemId);

            if (current is null)
            {
                _context.AssemblyVotes.Add(new AssemblyVote
                {
                    AssemblyId = assembly.Id,
                    AssemblyItemId = vote.ItemId,
                    AssemblyItemOptionId = vote.OptionId,
                    UnitId = dto.UnitId,
                    VotedByUserId = userId,
                    CreatedAt = now,
                    UpdatedAt = now
                });
            }
            else
            {
                // Changing the vote is allowed until voting closes.
                current.AssemblyItemOptionId = vote.OptionId;
                current.VotedByUserId = userId;
                current.UpdatedAt = now;
            }
        }

        try
        {
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateException)
        {
            // Two people of the same unit voting at the same instant: the unique index keeps one.
            throw new ConflictException("Outra pessoa da unidade votou agora mesmo. Atualize a página e confira.");
        }

        return await BuildBallotAsync(userId, assembly);
    }

    public async Task<AssemblyResultsDto> GetResultsAsync(int userId, int assemblyId)
    {
        var assembly = await FindVisibleAsync(userId, assemblyId);

        if (assembly.Status == AssemblyStatus.Canceled)
            throw new BadRequestException("Esta assembleia foi cancelada.");

        var phase = GetPhase(assembly, DateTime.UtcNow);

        // Past the end but not counted yet by the job: close it now, so results never wait.
        if (assembly.Status == AssemblyStatus.Published && phase == AssemblyPhase.Closed)
        {
            await CloseIfDueAsync(assembly.Id);
            assembly = await _context.Assemblies.AsNoTracking().FirstAsync(item => item.Id == assemblyId);
        }

        var votedUnits = await _context.AssemblyVotes
            .Where(vote => vote.AssemblyId == assembly.Id)
            .Select(vote => vote.UnitId)
            .Distinct()
            .CountAsync();

        if (assembly.Status != AssemblyStatus.Closed)
        {
            // While voting, partial counts would influence who has not voted yet: the
            // management sees only the participation.
            if (!await CanManageAsync(userId, assembly.CondominiumId))
                throw new BadRequestException("O resultado sai quando a votação terminar.");

            return new AssemblyResultsDto
            {
                AssemblyId = assembly.Id,
                Title = assembly.Title,
                IsFinal = false,
                VotingEndsAt = assembly.VotingEndsAt,
                EligibleUnits = await CountEligibleUnitsAsync(assembly.CondominiumId),
                VotedUnits = votedUnits
            };
        }

        var eligible = assembly.EligibleUnitsCount ?? 0;

        var items = await _context.AssemblyItems
            .AsNoTracking()
            .Where(item => item.AssemblyId == assembly.Id)
            .Include(item => item.Options)
            .OrderBy(item => item.Order)
            .ToListAsync();

        var votes = await _context.AssemblyVotes
            .AsNoTracking()
            .Where(vote => vote.AssemblyId == assembly.Id)
            .Select(vote => new
            {
                vote.AssemblyItemId,
                vote.AssemblyItemOptionId,
                UnitLabel = vote.Unit.Building.Name + ", unidade " + vote.Unit.Number
            })
            .ToListAsync();

        var minutesTitle = assembly.MinutesDocumentId is null
            ? null
            : await _context.Documents
                .Where(document => document.Id == assembly.MinutesDocumentId)
                .Select(document => document.Title)
                .FirstOrDefaultAsync();

        return new AssemblyResultsDto
        {
            AssemblyId = assembly.Id,
            Title = assembly.Title,
            IsFinal = true,
            VotingEndsAt = assembly.VotingEndsAt,
            ClosedAt = assembly.ClosedAt,
            EligibleUnits = eligible,
            VotedUnits = votedUnits,
            MinutesDocumentId = assembly.MinutesDocumentId,
            MinutesDocumentTitle = minutesTitle,
            Items = items.Select(item =>
            {
                var options = item.Options
                    .OrderBy(option => option.Order)
                    .Select(option =>
                    {
                        var optionVotes = votes
                            .Where(vote => vote.AssemblyItemId == item.Id && vote.AssemblyItemOptionId == option.Id)
                            .ToList();

                        return new AssemblyOptionResultDto
                        {
                            OptionId = option.Id,
                            Text = option.Text,
                            IsAbstention = option.IsAbstention,
                            HasAttachment = option.AttachmentStorageKey != null,
                            AttachmentFileName = option.AttachmentFileName,
                            Votes = optionVotes.Count,
                            Units = item.IsSecret ? null : optionVotes.Select(vote => vote.UnitLabel).OrderBy(label => label).ToList()
                        };
                    })
                    .ToList();

                var (outcome, winner, summary) = Evaluate(item, options, eligible);

                return new AssemblyItemResultDto
                {
                    ItemId = item.Id,
                    Order = item.Order,
                    Title = item.Title,
                    VoteType = item.VoteType,
                    Quorum = item.Quorum,
                    IsSecret = item.IsSecret,
                    TotalVotes = options.Sum(option => option.Votes),
                    Abstentions = options.Where(option => option.IsAbstention).Sum(option => option.Votes),
                    Outcome = outcome,
                    WinnerOptionId = winner,
                    Summary = summary,
                    Options = options
                };
            }).ToList()
        };
    }

    public async Task<AssemblyResponseDto> SetMinutesAsync(int userId, int assemblyId, SetMinutesDto dto)
    {
        var assembly = await _context.Assemblies.FirstOrDefaultAsync(item => item.Id == assemblyId)
            ?? throw new NotFoundException("Assembleia não encontrada.");

        await _permissionService.EnsureCondominiumPermissionAsync(userId, assembly.CondominiumId, AppPermissions.AssembliesManage);

        if (assembly.Status != AssemblyStatus.Closed)
            throw new BadRequestException("A ata só pode ser ligada depois que a votação terminar.");

        if (dto.DocumentId is not null)
        {
            var belongs = await _context.Documents
                .AnyAsync(document => document.Id == dto.DocumentId && document.CondominiumId == assembly.CondominiumId);

            if (!belongs)
                throw new BadRequestException("Documento não encontrado neste condomínio. Publique a ata em Documentos primeiro.");
        }

        assembly.MinutesDocumentId = dto.DocumentId;
        assembly.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return await GetDetailsAsync(assembly.Id);
    }

    public async Task<AssemblyResponseDto> SetOptionAttachmentAsync(int userId, int optionId, IFormFile? file)
    {
        if (file is null || file.Length == 0)
            throw new BadRequestException("Escolha o arquivo do anexo.");

        if (file.Length > UploadedFileInspector.MaxFileSizeBytes)
            throw new BadRequestException("O anexo pode ter no máximo 20 MB.");

        var (option, assembly) = await FindDraftOptionAsync(userId, optionId);
        var previousKey = option.AttachmentStorageKey;

        await using var content = file.OpenReadStream();

        var detected = UploadedFileInspector.Detect(content)
            ?? throw new BadRequestException(UploadedFileInspector.AcceptedTypesMessage);

        option.AttachmentFileName = UploadedFileInspector.BuildFileName(file.FileName, detected, "anexo");
        option.AttachmentContentType = detected.ContentType;
        option.AttachmentSizeBytes = file.Length;
        option.AttachmentStorageKey = $"assemblies/{assembly.CondominiumId}/{Guid.NewGuid():N}";
        assembly.UpdatedAt = DateTime.UtcNow;

        await _fileStorage.SaveAsync(option.AttachmentStorageKey, content);

        try
        {
            await _context.SaveChangesAsync();
        }
        catch
        {
            await DeleteFileQuietlyAsync(option.AttachmentStorageKey);
            throw;
        }

        // Replacing: the old file goes only after the new one is saved.
        if (previousKey is not null)
            await DeleteFileQuietlyAsync(previousKey);

        return await GetDetailsAsync(assembly.Id);
    }

    public async Task<AssemblyResponseDto> RemoveOptionAttachmentAsync(int userId, int optionId)
    {
        var (option, assembly) = await FindDraftOptionAsync(userId, optionId);
        var key = option.AttachmentStorageKey;

        if (key is null)
            return await GetDetailsAsync(assembly.Id);

        option.AttachmentFileName = null;
        option.AttachmentContentType = null;
        option.AttachmentSizeBytes = null;
        option.AttachmentStorageKey = null;
        assembly.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        await DeleteFileQuietlyAsync(key);

        return await GetDetailsAsync(assembly.Id);
    }

    // Whoever can see the assembly (drafts: the management only).
    public async Task<AssemblyOptionAttachmentDownload> DownloadOptionAttachmentAsync(int userId, int optionId)
    {
        var row = await _context.AssemblyItemOptions
            .AsNoTracking()
            .Where(option => option.Id == optionId)
            .Select(option => new
            {
                option.AttachmentFileName,
                option.AttachmentContentType,
                option.AttachmentStorageKey,
                option.AssemblyItem.Assembly.CondominiumId,
                option.AssemblyItem.Assembly.Status
            })
            .FirstOrDefaultAsync()
            ?? throw new NotFoundException("Opção não encontrada.");

        await _permissionService.EnsureCondominiumAccessAsync(userId, row.CondominiumId);

        await _permissionService.EnsureModuleEnabledAsync(row.CondominiumId, AppModules.Assemblies);

        if (row.Status == AssemblyStatus.Draft && !await CanManageAsync(userId, row.CondominiumId))
            throw new NotFoundException("Opção não encontrada.");

        if (row.AttachmentStorageKey is null)
            throw new NotFoundException("Esta opção não tem anexo.");

        var content = await _fileStorage.OpenReadAsync(row.AttachmentStorageKey);

        if (content is null)
        {
            _logger.LogError("Attachment of assembly option {OptionId} is missing from storage.", optionId);
            throw new NotFoundException("O anexo não está disponível.");
        }

        return new AssemblyOptionAttachmentDownload(content, row.AttachmentContentType!, row.AttachmentFileName!);
    }

    public async Task CloseDueAssembliesAsync(CancellationToken cancellationToken)
    {
        var now = DateTime.UtcNow;

        var dueIds = await _context.Assemblies
            .Where(assembly => assembly.Status == AssemblyStatus.Published && assembly.VotingEndsAt <= now)
            .Select(assembly => assembly.Id)
            .ToListAsync(cancellationToken);

        foreach (var id in dueIds)
            await CloseIfDueAsync(id);
    }

    public async Task SendClosingRemindersAsync(CancellationToken cancellationToken)
    {
        var now = DateTime.UtcNow;

        var assemblies = await _context.Assemblies
            .Where(assembly =>
                assembly.Status == AssemblyStatus.Published &&
                assembly.ClosingReminderSentAt == null &&
                assembly.VotingStartsAt <= now &&
                assembly.VotingEndsAt > now &&
                assembly.VotingEndsAt <= now.AddHours(24) &&
                assembly.Condominium.EnabledModules.Contains(AppModules.Assemblies))
            .ToListAsync(cancellationToken);

        foreach (var assembly in assemblies)
        {
            var itemsCount = await _context.AssemblyItems.CountAsync(item => item.AssemblyId == assembly.Id, cancellationToken);

            // People who can still vote for a unit that has not voted on every item.
            var recipients = await _context.PersonUnits
                .AsNoTracking()
                .Where(personUnit =>
                    personUnit.Unit.Building.CondominiumId == assembly.CondominiumId &&
                    (assembly.VoterRule == AssemblyVoterRule.OwnersAndResidents ||
                     personUnit.RelationshipType == UnitRelationshipType.Owner) &&
                    !_context.Charges.Any(charge => charge.UnitId == personUnit.UnitId && charge.Status == ChargeStatus.Overdue) &&
                    _context.AssemblyVotes.Count(vote => vote.AssemblyId == assembly.Id && vote.UnitId == personUnit.UnitId) < itemsCount)
                .SelectMany(personUnit => _context.Users.Where(user => user.PersonId == personUnit.PersonId))
                .Where(user => user.UserCondominiums.Any(link =>
                    link.CondominiumId == assembly.CondominiumId && link.Status == UserCondominiumStatus.Active))
                .Select(user => new
                {
                    user.Id,
                    user.Email,
                    user.Person.Name,
                    Role = user.UserCondominiums
                        .Where(link => link.CondominiumId == assembly.CondominiumId)
                        .Select(link => link.Role)
                        .FirstOrDefault()
                })
                .Distinct()
                .ToListAsync(cancellationToken);

            var condominiumName = await _context.Condominiums
                .Where(condominium => condominium.Id == assembly.CondominiumId)
                .Select(condominium => condominium.Name)
                .FirstAsync(cancellationToken);

            var endsAt = TimeZoneInfo.ConvertTimeFromUtc(assembly.VotingEndsAt, AppTimeZone.SaoPaulo).ToString("dd/MM 'às' HH:mm", PtBr);

            foreach (var role in recipients.GroupBy(recipient => recipient.Role ?? AppRoles.Resident))
            {
                await _notificationService.CreateManyAsync(
                    role.Select(recipient => recipient.Id),
                    NotificationType.News,
                    "A votação está terminando",
                    $"A votação de \"{assembly.Title}\" termina {endsAt} e a sua unidade ainda não votou em todas as pautas.",
                    GetLink(role.Key, assembly.Id),
                    assembly.CondominiumId);
            }

            foreach (var recipient in recipients.Where(recipient => !string.IsNullOrWhiteSpace(recipient.Email)))
            {
                var firstName = string.IsNullOrWhiteSpace(recipient.Name) ? "condômino(a)" : recipient.Name.Trim().Split(' ')[0];
                var url = _appSettings.BuildFrontendUrl(GetLink(recipient.Role ?? AppRoles.Resident, assembly.Id).TrimStart('/'));

                _emailQueue.Enqueue(AssemblyEmails
                    .ClosingReminder(firstName, condominiumName, assembly.Title, assembly.VotingEndsAt, url)
                    .ToMessage(recipient.Email!));
            }

            assembly.ClosingReminderSentAt = now;
            await _context.SaveChangesAsync(cancellationToken);
        }
    }

    // Closes one assembly whose voting ended. The conditional update lets only one caller
    // (the job or a results request) win, so the result is announced exactly once.
    private async Task CloseIfDueAsync(int assemblyId)
    {
        var assembly = await _context.Assemblies.AsNoTracking().FirstAsync(item => item.Id == assemblyId);
        var now = DateTime.UtcNow;
        var eligible = await CountEligibleUnitsAsync(assembly.CondominiumId);

        var closed = await _context.Assemblies
            .Where(item => item.Id == assemblyId && item.Status == AssemblyStatus.Published && item.VotingEndsAt <= now)
            .ExecuteUpdateAsync(setters => setters
                .SetProperty(item => item.Status, AssemblyStatus.Closed)
                .SetProperty(item => item.ClosedAt, now)
                .SetProperty(item => item.EligibleUnitsCount, eligible)
                .SetProperty(item => item.UpdatedAt, now));

        if (closed == 0)
            return;

        var members = await _context.UserCondominiums
            .AsNoTracking()
            .Where(link => link.CondominiumId == assembly.CondominiumId && link.Status == UserCondominiumStatus.Active)
            .Select(link => new { link.UserId, link.Role })
            .ToListAsync();

        foreach (var role in members.GroupBy(member => member.Role))
        {
            await _notificationService.CreateManyAsync(
                role.Select(member => member.UserId),
                NotificationType.News,
                "Resultado da assembleia",
                $"A votação de \"{assembly.Title}\" terminou. Veja o resultado.",
                GetLink(role.Key, assembly.Id),
                assembly.CondominiumId);
        }
    }

    // Units that may vote: every unit of the condominium without an overdue charge.
    private async Task<int> CountEligibleUnitsAsync(int condominiumId)
    {
        return await _context.Units
            .Where(unit =>
                unit.Building.CondominiumId == condominiumId &&
                !_context.Charges.Any(charge => charge.UnitId == unit.Id && charge.Status == ChargeStatus.Overdue))
            .CountAsync();
    }

    // Abstentions never count as approval. Quorums over units use the eligible units frozen at closing.
    private static (AssemblyItemOutcome Outcome, int? WinnerOptionId, string Summary) Evaluate(
        AssemblyItem item,
        List<AssemblyOptionResultDto> options,
        int eligible)
    {
        int Needed() => item.Quorum switch
        {
            AssemblyQuorum.AbsoluteMajorityOfUnits => eligible / 2 + 1,
            AssemblyQuorum.TwoThirdsOfUnits => (int)Math.Ceiling(eligible * 2 / 3.0),
            AssemblyQuorum.Unanimity => eligible,
            _ => 0
        };

        var quorumLabel = item.Quorum switch
        {
            AssemblyQuorum.AbsoluteMajorityOfUnits => "maioria absoluta das unidades",
            AssemblyQuorum.TwoThirdsOfUnits => "2/3 das unidades",
            AssemblyQuorum.Unanimity => "unanimidade",
            _ => "maioria dos votos"
        };

        var choices = options.Where(option => !option.IsAbstention).ToList();

        if (item.VoteType == AssemblyVoteType.YesNo)
        {
            var yes = options.First(option => option.Text == "Sim").Votes;
            var no = options.First(option => option.Text == "Não").Votes;

            if (item.Quorum == AssemblyQuorum.MajorityOfVotes)
            {
                var approved = yes > no;
                return (approved ? AssemblyItemOutcome.Approved : AssemblyItemOutcome.Rejected, null,
                    $"{(approved ? "Aprovada" : "Rejeitada")}: {yes} Sim × {no} Não ({quorumLabel}).");
            }

            var needed = Needed();
            var reached = eligible > 0 && yes >= needed;

            return (reached ? AssemblyItemOutcome.Approved : AssemblyItemOutcome.Rejected, null,
                $"{(reached ? "Aprovada" : "Rejeitada")}: {Votes(yes)} Sim de {eligible} unidades aptas " +
                $"(mínimo {needed}, {quorumLabel}).");
        }

        var top = choices.OrderByDescending(option => option.Votes).ToList();

        if (top.Count == 0 || top[0].Votes == 0)
            return (AssemblyItemOutcome.Undecided, null, "Sem decisão: nenhuma opção recebeu votos.");

        if (top.Count > 1 && top[1].Votes == top[0].Votes)
        {
            var tied = string.Join(" e ", top.Where(option => option.Votes == top[0].Votes).Select(option => option.Text));
            return (AssemblyItemOutcome.Undecided, null, $"Sem decisão: empate entre {tied} ({Votes(top[0].Votes)} cada).");
        }

        var winner = top[0];

        if (item.Quorum == AssemblyQuorum.MajorityOfVotes)
            return (AssemblyItemOutcome.Decided, winner.OptionId, $"Vencedora: {winner.Text} ({Votes(winner.Votes)}, opção mais votada).");

        var minimum = Needed();

        return eligible > 0 && winner.Votes >= minimum
            ? (AssemblyItemOutcome.Decided, winner.OptionId,
                $"Vencedora: {winner.Text} ({winner.Votes} de {eligible} unidades aptas, mínimo {minimum}, {quorumLabel}).")
            : (AssemblyItemOutcome.Undecided, null,
                $"Sem decisão: a mais votada ({winner.Text}) teve {Votes(winner.Votes)}; o mínimo era {minimum} ({quorumLabel}).");
    }

    private static string Votes(int count) => count == 1 ? "1 voto" : $"{count} votos";

    private async Task<Assembly> FindVisibleAsync(int userId, int assemblyId)
    {
        var assembly = await _context.Assemblies.AsNoTracking().FirstOrDefaultAsync(item => item.Id == assemblyId)
            ?? throw new NotFoundException("Assembleia não encontrada.");

        await _permissionService.EnsureCondominiumAccessAsync(userId, assembly.CondominiumId);

        await _permissionService.EnsureModuleEnabledAsync(assembly.CondominiumId, AppModules.Assemblies);

        if (assembly.Status == AssemblyStatus.Draft)
            throw new NotFoundException("Assembleia não encontrada.");

        return assembly;
    }

    // The user's units in the condominium and whether each can vote: owners only (or any
    // resident, by the assembly's rule), and no overdue charge (Código Civil, art. 1.335).
    private async Task<MyBallotDto> BuildBallotAsync(int userId, Assembly assembly)
    {
        var personId = await _context.Users
            .Where(user => user.Id == userId)
            .Select(user => user.PersonId)
            .FirstAsync();

        var links = await _context.PersonUnits
            .AsNoTracking()
            .Where(personUnit =>
                personUnit.PersonId == personId &&
                personUnit.Unit.Building.CondominiumId == assembly.CondominiumId)
            .Select(personUnit => new
            {
                personUnit.UnitId,
                personUnit.RelationshipType,
                personUnit.Unit.Number,
                BuildingName = personUnit.Unit.Building.Name
            })
            .ToListAsync();

        var unitIds = links.Select(link => link.UnitId).Distinct().ToList();

        var overdue = await _context.Charges
            .AsNoTracking()
            .Where(charge =>
                charge.CondominiumId == assembly.CondominiumId &&
                charge.UnitId != null &&
                unitIds.Contains(charge.UnitId.Value) &&
                charge.Status == ChargeStatus.Overdue)
            .OrderBy(charge => charge.DueDate)
            .Select(charge => new { UnitId = charge.UnitId!.Value, charge.Description, charge.DueDate })
            .ToListAsync();

        var votes = await _context.AssemblyVotes
            .AsNoTracking()
            .Where(vote => vote.AssemblyId == assembly.Id && unitIds.Contains(vote.UnitId))
            .Select(vote => new
            {
                vote.UnitId,
                vote.AssemblyItemId,
                vote.AssemblyItemOptionId,
                vote.UpdatedAt,
                VotedByName = vote.VotedByUser.Person.Name
            })
            .ToListAsync();

        var units = links
            .GroupBy(link => link.UnitId)
            .Select(group =>
            {
                var first = group.First();
                var isOwner = group.Any(link => link.RelationshipType == UnitRelationshipType.Owner);
                var unitOverdue = overdue.FirstOrDefault(charge => charge.UnitId == group.Key);
                var unitVotes = votes.Where(vote => vote.UnitId == group.Key).ToList();
                var lastVote = unitVotes.OrderByDescending(vote => vote.UpdatedAt).FirstOrDefault();

                string? blockReason = null;

                if (assembly.VoterRule == AssemblyVoterRule.OwnersOnly && !isOwner)
                {
                    blockReason = "Nesta assembleia só os proprietários votam.";
                }
                else if (unitOverdue is not null)
                {
                    blockReason = $"A unidade tem cobrança em atraso (\"{unitOverdue.Description}\", " +
                                  $"vencida em {unitOverdue.DueDate.ToString("dd/MM/yyyy", PtBr)}). Regularize para votar.";
                }

                return new BallotUnitDto
                {
                    UnitId = group.Key,
                    UnitLabel = $"{first.BuildingName}, unidade {first.Number}",
                    CanVote = blockReason is null,
                    BlockReason = blockReason,
                    Votes = unitVotes.ToDictionary(vote => vote.AssemblyItemId, vote => vote.AssemblyItemOptionId),
                    LastVotedByName = lastVote?.VotedByName,
                    LastVotedAt = lastVote?.UpdatedAt
                };
            })
            .OrderBy(unit => unit.UnitLabel)
            .ToList();

        return new MyBallotDto
        {
            AssemblyId = assembly.Id,
            VotingOpen = GetPhase(assembly, DateTime.UtcNow) == AssemblyPhase.Open,
            Units = units
        };
    }

    public static AssemblyPhase GetPhase(Assembly assembly, DateTime utcNow)
    {
        return assembly.Status switch
        {
            AssemblyStatus.Draft => AssemblyPhase.Draft,
            AssemblyStatus.Canceled => AssemblyPhase.Canceled,
            AssemblyStatus.Closed => AssemblyPhase.Closed,
            _ when utcNow < assembly.VotingStartsAt => AssemblyPhase.Scheduled,
            _ when utcNow < assembly.VotingEndsAt => AssemblyPhase.Open,
            // Published and past the end: closed for voting even before the job counts the votes.
            _ => AssemblyPhase.Closed
        };
    }

    private async Task<bool> CanManageAsync(int userId, int condominiumId)
    {
        return await _permissionService.HasCondominiumPermissionAsync(userId, condominiumId, AppPermissions.AssembliesManage);
    }

    private async Task<Assembly> FindDraftAsync(int userId, int assemblyId)
    {
        var assembly = await _context.Assemblies
            .Include(item => item.Items)
            .ThenInclude(item => item.Options)
            .FirstOrDefaultAsync(item => item.Id == assemblyId)
            ?? throw new NotFoundException("Assembleia não encontrada.");

        await _permissionService.EnsureCondominiumPermissionAsync(userId, assembly.CondominiumId, AppPermissions.AssembliesManage);

        if (assembly.Status != AssemblyStatus.Draft)
            throw new BadRequestException("Depois de publicada, a assembleia não pode mais ser alterada.");

        return assembly;
    }

    // A date without offset is São Paulo time (what users type); others are converted to UTC.
    private async Task<(AssemblyItemOption Option, Assembly Assembly)> FindDraftOptionAsync(int userId, int optionId)
    {
        var option = await _context.AssemblyItemOptions
            .Include(item => item.AssemblyItem)
            .ThenInclude(item => item.Assembly)
            .FirstOrDefaultAsync(item => item.Id == optionId)
            ?? throw new NotFoundException("Opção não encontrada.");

        var assembly = option.AssemblyItem.Assembly;

        await _permissionService.EnsureCondominiumPermissionAsync(userId, assembly.CondominiumId, AppPermissions.AssembliesManage);

        if (assembly.Status != AssemblyStatus.Draft)
            throw new BadRequestException("Depois de publicada, a assembleia não pode mais ser alterada.");

        if (option.IsAbstention)
            throw new BadRequestException("A opção \"Abstenção\" não leva anexo.");

        return (option, assembly);
    }

    private static List<string> GetAttachmentKeys(Assembly assembly)
    {
        return assembly.Items
            .SelectMany(item => item.Options)
            .Where(option => option.AttachmentStorageKey != null)
            .Select(option => option.AttachmentStorageKey!)
            .ToList();
    }

    private async Task DeleteFileQuietlyAsync(string key)
    {
        try
        {
            await _fileStorage.DeleteAsync(key);
        }
        catch (Exception exception)
        {
            // The option is already gone for users; a leftover file only takes disk space.
            _logger.LogError(exception, "Could not delete assembly option attachment {StorageKey}.", key);
        }
    }

    private static DateTime? ToUtc(DateTime? value)
    {
        if (value is null)
            return null;

        return value.Value.Kind switch
        {
            DateTimeKind.Utc => value.Value,
            DateTimeKind.Local => value.Value.ToUniversalTime(),
            _ => TimeZoneInfo.ConvertTimeToUtc(value.Value, AppTimeZone.SaoPaulo)
        };
    }

    private static void Validate(SaveAssemblyDto dto)
    {
        dto.VotingStartsAt = ToUtc(dto.VotingStartsAt);
        dto.VotingEndsAt = ToUtc(dto.VotingEndsAt);
        dto.MeetingAt = ToUtc(dto.MeetingAt);

        var title = dto.Title?.Trim() ?? string.Empty;

        if (title.Length < 3)
            throw new BadRequestException("Informe o título da assembleia.");

        if (title.Length > 150)
            throw new BadRequestException("O título pode ter no máximo 150 caracteres.");

        if (dto.Description?.Trim().Length > 2000)
            throw new BadRequestException("A descrição pode ter no máximo 2000 caracteres.");

        if (dto.Type == AssemblyType.Undefined || !Enum.IsDefined(dto.Type))
            throw new BadRequestException("Escolha o tipo da assembleia (ordinária ou extraordinária).");

        if (dto.VoterRule == AssemblyVoterRule.Undefined || !Enum.IsDefined(dto.VoterRule))
            throw new BadRequestException("Escolha quem pode votar.");

        if (dto.VotingStartsAt is null || dto.VotingEndsAt is null)
            throw new BadRequestException("Informe o início e o fim da votação.");

        if (dto.VotingEndsAt <= dto.VotingStartsAt)
            throw new BadRequestException("O fim da votação precisa ser depois do início.");

        if (dto.VotingEndsAt.Value - dto.VotingStartsAt.Value < TimeSpan.FromHours(1))
            throw new BadRequestException("A votação precisa ficar aberta por pelo menos 1 hora.");

        if (dto.MeetingLocation?.Trim().Length > 200)
            throw new BadRequestException("O local pode ter no máximo 200 caracteres.");

        if (dto.Items.Count > MaxItems)
            throw new BadRequestException($"A assembleia pode ter no máximo {MaxItems} pautas.");

        foreach (var item in dto.Items)
        {
            var itemTitle = item.Title?.Trim() ?? string.Empty;

            if (itemTitle.Length < 3)
                throw new BadRequestException("Informe o título de cada pauta.");

            if (itemTitle.Length > 200)
                throw new BadRequestException("O título da pauta pode ter no máximo 200 caracteres.");

            if (item.Description?.Trim().Length > 2000)
                throw new BadRequestException("A descrição da pauta pode ter no máximo 2000 caracteres.");

            if (item.VoteType == AssemblyVoteType.Undefined || !Enum.IsDefined(item.VoteType))
                throw new BadRequestException($"Escolha o tipo de votação da pauta \"{itemTitle}\".");

            if (item.Quorum == AssemblyQuorum.Undefined || !Enum.IsDefined(item.Quorum))
                throw new BadRequestException($"Escolha o quórum da pauta \"{itemTitle}\".");

            if (item.VoteType == AssemblyVoteType.MultipleChoice)
            {
                var options = item.Options.Select(option => option?.Trim() ?? string.Empty).ToList();

                if (options.Count < 2 || options.Count > MaxOptions)
                    throw new BadRequestException($"A pauta \"{itemTitle}\" precisa ter de 2 a {MaxOptions} opções.");

                if (options.Any(option => option.Length == 0 || option.Length > 200))
                    throw new BadRequestException($"Preencha todas as opções da pauta \"{itemTitle}\" (até 200 caracteres).");

                if (options.Distinct(StringComparer.OrdinalIgnoreCase).Count() != options.Count)
                    throw new BadRequestException($"A pauta \"{itemTitle}\" tem opções repetidas.");

            }
        }
    }

    private static void Apply(Assembly assembly, SaveAssemblyDto dto)
    {
        assembly.Title = dto.Title.Trim();
        assembly.Description = string.IsNullOrWhiteSpace(dto.Description) ? null : dto.Description.Trim();
        assembly.Type = dto.Type;
        assembly.VoterRule = dto.VoterRule;
        assembly.MeetingAt = dto.MeetingAt;
        assembly.MeetingLocation = string.IsNullOrWhiteSpace(dto.MeetingLocation) ? null : dto.MeetingLocation.Trim();
        assembly.VotingStartsAt = dto.VotingStartsAt!.Value;
        assembly.VotingEndsAt = dto.VotingEndsAt!.Value;
        assembly.UpdatedAt = DateTime.UtcNow;

        var order = 1;

        foreach (var itemDto in dto.Items)
        {
            var item = new AssemblyItem
            {
                Order = order++,
                Title = itemDto.Title.Trim(),
                Description = string.IsNullOrWhiteSpace(itemDto.Description) ? null : itemDto.Description.Trim(),
                VoteType = itemDto.VoteType,
                Quorum = itemDto.Quorum,
                IsSecret = itemDto.IsSecret
            };

            var optionOrder = 1;

            if (itemDto.VoteType == AssemblyVoteType.YesNo)
            {
                item.Options.Add(new AssemblyItemOption { Order = optionOrder++, Text = "Sim", IsApproval = true });
                item.Options.Add(new AssemblyItemOption { Order = optionOrder++, Text = "Não" });
            }
            else
            {
                foreach (var text in itemDto.Options)
                    item.Options.Add(new AssemblyItemOption { Order = optionOrder++, Text = text.Trim() });
            }

            item.Options.Add(new AssemblyItemOption { Order = optionOrder, Text = "Abstenção", IsAbstention = true });

            assembly.Items.Add(item);
        }
    }

    private async Task NotifyConvocationAsync(Assembly assembly)
    {
        var itemTitles = assembly.Items.OrderBy(item => item.Order).Select(item => item.Title).ToList();

        await NotifyEveryoneAsync(
            assembly,
            "Nova assembleia",
            $"Você foi convocado para a assembleia \"{assembly.Title}\". " +
            $"Votação até {TimeZoneInfo.ConvertTimeFromUtc(assembly.VotingEndsAt, AppTimeZone.SaoPaulo).ToString("dd/MM 'às' HH:mm", PtBr)}.",
            (member, url) => AssemblyEmails.Convocation(
                member.FirstName,
                member.CondominiumName,
                assembly.Title,
                assembly.Type,
                assembly.VotingStartsAt,
                assembly.VotingEndsAt,
                assembly.MeetingAt,
                assembly.MeetingLocation,
                itemTitles,
                url));
    }

    private record Member(int UserId, string Role, string Email, string FirstName, string CondominiumName);

    // Everyone with active access to the condominium hears about the assembly (sininho and
    // e-mail, always: a convocation must reach the condôminos).
    private async Task NotifyEveryoneAsync(
        Assembly assembly,
        string title,
        string message,
        Func<Member, string, EmailTemplate> buildEmail)
    {
        var rows = await _context.UserCondominiums
            .AsNoTracking()
            .Where(link =>
                link.CondominiumId == assembly.CondominiumId &&
                link.Status == UserCondominiumStatus.Active)
            .Select(link => new
            {
                link.UserId,
                link.Role,
                link.User.Email,
                link.User.Person.Name,
                CondominiumName = link.Condominium.Name
            })
            .ToListAsync();

        foreach (var role in rows.GroupBy(row => row.Role))
        {
            await _notificationService.CreateManyAsync(
                role.Select(row => row.UserId),
                NotificationType.News,
                title,
                message,
                GetLink(role.Key, assembly.Id),
                assembly.CondominiumId);
        }

        foreach (var row in rows.Where(row => !string.IsNullOrWhiteSpace(row.Email)).DistinctBy(row => row.UserId))
        {
            var member = new Member(
                row.UserId,
                row.Role,
                row.Email!,
                string.IsNullOrWhiteSpace(row.Name) ? "condômino(a)" : row.Name.Trim().Split(' ')[0],
                row.CondominiumName);

            _emailQueue.Enqueue(buildEmail(member, _appSettings.BuildFrontendUrl(GetLink(row.Role, assembly.Id).TrimStart('/'))).ToMessage(member.Email));
        }
    }

    private static string GetLink(string role, int assemblyId)
    {
        var area = role switch
        {
            AppRoles.Admin => "admin",
            AppRoles.Syndic => "syndic",
            _ => "resident"
        };

        return $"/{area}/assemblies/{assemblyId}";
    }

    private async Task<AssemblyResponseDto> GetDetailsAsync(int assemblyId)
    {
        var row = await _context.Assemblies
            .AsNoTracking()
            .Where(assembly => assembly.Id == assemblyId)
            .Select(assembly => new
            {
                assembly,
                CreatedByName = assembly.CreatedByUser.Person.Name
            })
            .FirstAsync();

        var items = await _context.AssemblyItems
            .AsNoTracking()
            .Where(item => item.AssemblyId == assemblyId)
            .Include(item => item.Options)
            .OrderBy(item => item.Order)
            .ToListAsync();

        return ToResponse(row.assembly, items.Count, row.CreatedByName, items.Select(item => new AssemblyItemResponseDto
        {
            Id = item.Id,
            Order = item.Order,
            Title = item.Title,
            Description = item.Description,
            VoteType = item.VoteType,
            Quorum = item.Quorum,
            IsSecret = item.IsSecret,
            Options = item.Options
                .OrderBy(option => option.Order)
                .Select(option => new AssemblyOptionResponseDto
                {
                    Id = option.Id,
                    Order = option.Order,
                    Text = option.Text,
                    IsAbstention = option.IsAbstention,
                    HasAttachment = option.AttachmentStorageKey != null,
                    AttachmentFileName = option.AttachmentFileName,
                    AttachmentSizeBytes = option.AttachmentSizeBytes
                })
                .ToList()
        }).ToList());
    }

    private static AssemblyResponseDto ToResponse(
        Assembly assembly,
        int itemsCount,
        string createdByName,
        List<AssemblyItemResponseDto>? items)
    {
        return new AssemblyResponseDto
        {
            Id = assembly.Id,
            CondominiumId = assembly.CondominiumId,
            Title = assembly.Title,
            Description = assembly.Description,
            Type = assembly.Type,
            VoterRule = assembly.VoterRule,
            MeetingAt = assembly.MeetingAt,
            MeetingLocation = assembly.MeetingLocation,
            VotingStartsAt = assembly.VotingStartsAt,
            VotingEndsAt = assembly.VotingEndsAt,
            Status = assembly.Status,
            Phase = GetPhase(assembly, DateTime.UtcNow),
            PublishedAt = assembly.PublishedAt,
            ClosedAt = assembly.ClosedAt,
            CanceledAt = assembly.CanceledAt,
            CancelReason = assembly.CancelReason,
            ItemsCount = itemsCount,
            EligibleUnitsCount = assembly.EligibleUnitsCount,
            MinutesDocumentId = assembly.MinutesDocumentId,
            Items = items,
            CreatedByName = createdByName,
            CreatedAt = assembly.CreatedAt
        };
    }
}
