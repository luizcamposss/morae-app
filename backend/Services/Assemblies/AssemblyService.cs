using backend.Constants;
using backend.Data;
using backend.DTOs.Assembly;
using backend.Enums;
using backend.Exceptions;
using backend.Models;
using backend.Services.Email;
using backend.Services.Notifications;
using backend.Services.Permissions;
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

    public AssemblyService(
        AppDbContext context,
        IPermissionService permissionService,
        INotificationService notificationService,
        IEmailQueue emailQueue,
        IOptions<AppSettings> appSettings)
    {
        _context = context;
        _permissionService = permissionService;
        _notificationService = notificationService;
        _emailQueue = emailQueue;
        _appSettings = appSettings.Value;
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

        // Drafts exist only for the management.
        if (assembly.Status == AssemblyStatus.Draft && !await CanManageAsync(userId, assembly.CondominiumId))
            throw new NotFoundException("Assembleia não encontrada.");

        return await GetDetailsAsync(assemblyId);
    }

    public async Task<AssemblyResponseDto> UpdateAsync(int userId, int assemblyId, SaveAssemblyDto dto)
    {
        var assembly = await FindDraftAsync(userId, assemblyId);

        Validate(dto);

        _context.AssemblyItems.RemoveRange(assembly.Items);
        assembly.Items.Clear();
        Apply(assembly, dto);

        await _context.SaveChangesAsync();

        return await GetDetailsAsync(assembly.Id);
    }

    public async Task DeleteAsync(int userId, int assemblyId)
    {
        var assembly = await FindDraftAsync(userId, assemblyId);

        _context.Assemblies.Remove(assembly);
        await _context.SaveChangesAsync();
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
                    IsAbstention = option.IsAbstention
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
            Items = items,
            CreatedByName = createdByName,
            CreatedAt = assembly.CreatedAt
        };
    }
}
