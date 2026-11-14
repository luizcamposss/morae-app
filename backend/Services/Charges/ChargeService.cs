using System.Globalization;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using AutoMapper;
using backend.Constants;
using backend.Data;
using backend.DTOs.Charge;
using backend.Enums;
using backend.Exceptions;
using backend.Models;
using backend.Services.MercadoPago;
using backend.Services.Email;
using backend.Services.Notifications;
using backend.Services.Permissions;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace backend.Services.Charges;

public class ChargeService : IChargeService
{
    // Shared with the spreadsheet import, which applies the same rules.
    public const string PastDueDateMessage = "O vencimento não pode ser uma data passada.";

    public static bool IsPastDueDate(DateTime dueDate) => dueDate.Date < AppTimeZone.Today;

    private readonly AppDbContext _context;
    private readonly IMapper _mapper;
    private readonly IPermissionService _permissionService;
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly INotificationService _notificationService;
    private readonly IChargeEmailNotifier _chargeEmailNotifier;
    private readonly IMercadoPagoService _mercadoPagoService;

    public ChargeService(
        AppDbContext context,
        IMapper mapper,
        IPermissionService permissionService,
        UserManager<ApplicationUser> userManager,
        INotificationService notificationService,
        IChargeEmailNotifier chargeEmailNotifier,
        IMercadoPagoService mercadoPagoService)
    {
        _context = context;
        _mapper = mapper;
        _permissionService = permissionService;
        _userManager = userManager;
        _notificationService = notificationService;
        _chargeEmailNotifier = chargeEmailNotifier;
        _mercadoPagoService = mercadoPagoService;
    }

    public async Task<ChargeResponseDto> CreateAsync(int userId, CreateChargeDto dto)
    {
        await ValidateCreateAsync(userId, dto);

        var charge = _mapper.Map<Charge>(dto);

        // The due date is a calendar day, not an instant: keep only the date, without a time zone.
        charge.DueDate = DateTime.SpecifyKind(dto.DueDate.Date, DateTimeKind.Unspecified);

        charge.CreatedByUserId = userId;
        charge.Status = ChargeStatus.Pending;
        charge.CreatedAt = DateTime.UtcNow;

        if (charge.Scope == ChargeScope.Platform)
        {
            charge.TargetUserId = null;
            charge.UnitId = null;
            // Category and recipient only matter inside the condominium.
            charge.Category = ChargeCategory.CondominiumFee;
            charge.RecipientPersonId = null;
        }
        else
        {
            (charge.FinePercent, charge.MonthlyInterestPercent) = await GetLateFeeRuleAsync(charge.CondominiumId);
        }

        _context.Charges.Add(charge);
        await _context.SaveChangesAsync();
        await CreateChargeNotificationsAsync(charge);
        await _chargeEmailNotifier.QueueNewChargeAsync(charge);

        return await GetChargeResponseOrThrowAsync(charge.Id);
    }
    public async Task<IEnumerable<ChargeResponseDto>> GetPlatformAsync(int userId)
    {
        var user = await GetUserOrThrowAsync(userId);

        IQueryable<Charge> query = BuildChargeResponseQuery()
            .Where(c => c.Scope == ChargeScope.Platform);

        if (await _userManager.IsInRoleAsync(user, AppRoles.Master))
        {
            var charges = await query
                .Where(c => c.Condominium.CreatedByUserId == userId)
                .OrderByDescending(c => c.CreatedAt)
                .ToListAsync();

            return await MapWithPaymentInfoAsync(charges);
        }

        if (await _userManager.IsInRoleAsync(user, AppRoles.Admin))
        {
            var charges = await query
                .Where(c => _context.UserCondominiums.Any(uc =>
                    uc.UserId == userId &&
                    uc.CondominiumId == c.CondominiumId &&
                    uc.Role == AppRoles.Admin &&
                    uc.Status == UserCondominiumStatus.Active))
                .OrderByDescending(c => c.CreatedAt)
                .ToListAsync();

            return await MapWithPaymentInfoAsync(charges);
        }

        throw new ForbiddenException("Você não tem acesso às mensalidades da plataforma.");
    }
    public async Task<IEnumerable<ChargeResponseDto>> GetByCondominiumAsync(
        int userId,
        int condominiumId,
        ChargeCategory? category = null)
    {
        var user = await GetUserOrThrowAsync(userId);

        // Role in this condominium, not the user's roles anywhere.
        var role = await _permissionService.GetCondominiumRoleAsync(userId, condominiumId);
        var isSyndic = role == AppRoles.Syndic;

        if (role != AppRoles.Admin && !isSyndic)
            throw new ForbiddenException("Você não tem acesso às cobranças deste condomínio.");

        if (isSyndic)
            await _permissionService.EnsureAnyCondominiumPermissionAsync(userId, condominiumId, AppPermissions.FinanceAccess);

        var query = BuildChargeResponseQuery()
            .Where(c =>
                c.Scope == ChargeScope.Condominium &&
                c.CondominiumId == condominiumId);

        if (category.HasValue)
            query = query.Where(c => c.Category == category.Value);

        var managedBuildingIds = await _permissionService.GetManagedBuildingIdsAsync(userId, condominiumId);

        if (managedBuildingIds is not null)
        {
            query = query.Where(charge =>
                charge.UnitId.HasValue &&
                managedBuildingIds.Contains(charge.Unit!.BuildingId));
        }

        var charges = await query
            .OrderByDescending(c => c.CreatedAt)
            .ToListAsync();

        return await MapWithPaymentInfoAsync(charges);
    }
    public async Task<IEnumerable<ChargeResponseDto>> GetMineAsync(int userId)
    {
        var user = await GetUserOrThrowAsync(userId);

        var unitIds = await _context.PersonUnits
            .AsNoTracking()
            .Where(pu => pu.PersonId == user.PersonId)
            .Select(pu => pu.UnitId)
            .Distinct()
            .ToListAsync();

        var charges = await BuildChargeResponseQuery()
            .Where(c =>
                c.Scope == ChargeScope.Condominium &&
                c.UnitId.HasValue &&
                unitIds.Contains(c.UnitId.Value) &&
                // A charge addressed to one person (e.g. rent) is only theirs.
                (c.RecipientPersonId == null || c.RecipientPersonId == user.PersonId) &&
                c.Condominium.Status == Status.Active)
            .OrderByDescending(c => c.CreatedAt)
            .ToListAsync();

        return await MapWithPaymentInfoAsync(charges);
    }
    public async Task<ChargeResponseDto?> GetByIdAsync(int userId, int id)
    {
        var charge = await BuildChargeResponseQuery()
            .FirstOrDefaultAsync(c => c.Id == id);

        if (charge is null)
            return null;

        await EnsureCanReadAsync(userId, charge);

        return (await MapWithPaymentInfoAsync([charge]))[0];
    }
    public async Task<bool> CancelAsync(int userId, int id, CancelChargeDto dto)
    {
        var charge = await _context.Charges
            .FirstOrDefaultAsync(c => c.Id == id);

        if (charge is null)
            return false;

        await EnsureCanCancelAsync(userId, charge);

        if (charge.Status == ChargeStatus.Paid)
            throw new BadRequestException("Cobranças pagas não podem ser canceladas.");

        if (charge.Status == ChargeStatus.Canceled)
            throw new BadRequestException("Esta cobrança já foi cancelada.");

        charge.Status = ChargeStatus.Canceled;
        charge.CanceledAt = DateTime.UtcNow;
        charge.CancelReason = dto.Reason;

        await _context.SaveChangesAsync();

        // A Pix/boleto generated for this charge must not stay payable after it is cancelled.
        await _mercadoPagoService.CancelOpenPaymentAsync(charge.Id);

        return true;
    }
    public async Task<ChargeBatchResultDto> CreateBatchAsync(
        int userId,
        int condominiumId,
        CreateChargeBatchDto dto)
    {
        var unitIds = dto.UnitIds is { Count: > 0 } ? dto.UnitIds.Distinct().ToList() : null;

        await EnsureBatchTargetValidAsync(userId, condominiumId, dto.BuildingId, dto.UnitValues, unitIds);

        var condominium = await _context.Condominiums
            .AsNoTracking()
            .FirstAsync(c => c.Id == condominiumId);

        var dueDate = dto.DueDate?.Date ?? ChargeLateFees.NextDueDate(condominium.BillingDueDay, AppTimeZone.Today);

        if (dueDate < AppTimeZone.Today)
            throw new BadRequestException("O vencimento não pode ser uma data passada.");

        var result = await GenerateForUnitsAsync(new ChargeGenerationRequest(
            condominiumId,
            dto.BuildingId,
            await _permissionService.GetManagedBuildingIdsAsync(userId, condominiumId),
            dto.Value,
            dto.UnitValues.ToDictionary(item => item.UnitId, item => item.Value),
            dueDate,
            dto.Description.Trim(),
            userId,
            dto.Category ?? ChargeCategory.Apportionment,
            unitIds));

        if (result.CreatedCount == 0 && result.Skipped.Count == 0)
            throw new BadRequestException("Nenhuma unidade encontrada para este lote.");

        return result;
    }

    public async Task EnsureBatchTargetValidAsync(
        int userId,
        int condominiumId,
        int? buildingId,
        IEnumerable<ChargeUnitValueDto> unitValues,
        IReadOnlyCollection<int>? unitIds = null)
    {
        if (await _permissionService.IsMasterAsync(userId))
            throw new ForbiddenException("O Master não cria cobranças de condomínio.");

        await _permissionService.EnsureCondominiumPermissionAsync(userId, condominiumId, AppPermissions.ChargesCreate);

        if (buildingId.HasValue)
        {
            var buildingBelongs = await _context.Buildings
                .AsNoTracking()
                .AnyAsync(b => b.Id == buildingId.Value && b.CondominiumId == condominiumId);

            if (!buildingBelongs)
                throw new BadRequestException("Este prédio não pertence a este condomínio.");

            // A syndic limited to some buildings can only bill those.
            await _permissionService.EnsureBuildingAccessAsync(userId, buildingId.Value);
        }

        var unitValueList = unitValues.ToList();

        if (unitValueList.Select(item => item.UnitId).Distinct().Count() != unitValueList.Count)
            throw new BadRequestException("Cada unidade pode ter só um valor ajustado.");

        if (unitValueList.Any(item => item.Value <= 0))
            throw new BadRequestException("O valor ajustado precisa ser maior que zero.");

        if (unitValueList.Count > 0)
        {
            var valueUnitIds = unitValueList.Select(item => item.UnitId).ToList();

            if (unitIds is not null && valueUnitIds.Any(id => !unitIds.Contains(id)))
                throw new BadRequestException("Uma das unidades com valor ajustado não faz parte deste lote.");

            if (await CountTargetUnitsAsync(userId, condominiumId, buildingId, valueUnitIds) != valueUnitIds.Count)
                throw new BadRequestException("Uma das unidades com valor ajustado não faz parte deste lote.");
        }

        if (unitIds is not null &&
            await CountTargetUnitsAsync(userId, condominiumId, buildingId, unitIds) != unitIds.Count)
        {
            throw new BadRequestException("Uma das unidades escolhidas não faz parte deste condomínio ou prédio.");
        }

        await EnsurePaymentMethodConfiguredAsync(FinancialAccountScope.Condominium, condominiumId);
    }

    // Units of the target (condominium or building) the user may bill, among the given ids.
    private async Task<int> CountTargetUnitsAsync(
        int userId,
        int condominiumId,
        int? buildingId,
        IReadOnlyCollection<int> unitIds)
    {
        var managedBuildingIds = await _permissionService.GetManagedBuildingIdsAsync(userId, condominiumId);

        return await _context.Units
            .AsNoTracking()
            .CountAsync(u =>
                unitIds.Contains(u.Id) &&
                u.Building.CondominiumId == condominiumId &&
                (!buildingId.HasValue || u.BuildingId == buildingId.Value) &&
                (managedBuildingIds == null || managedBuildingIds.Contains(u.BuildingId)));
    }

    public async Task EnsureRecipientLinkedAsync(int? recipientPersonId, int unitId)
    {
        if (!recipientPersonId.HasValue)
            return;

        var linked = await _context.PersonUnits
            .AsNoTracking()
            .AnyAsync(pu => pu.PersonId == recipientPersonId.Value && pu.UnitId == unitId);

        if (!linked)
            throw new BadRequestException("Esta pessoa não está vinculada à unidade da cobrança.");
    }

    public async Task<ChargeBatchResultDto> GenerateForUnitsAsync(ChargeGenerationRequest request)
    {
        var allowed = request.AllowedBuildingIds;
        var onlyUnitIds = request.UnitIds;
        var recipientPersonId = request.RecipientPersonId;

        var units = await _context.Units
            .AsNoTracking()
            .Where(u =>
                u.Building.CondominiumId == request.CondominiumId &&
                (!request.BuildingId.HasValue || u.BuildingId == request.BuildingId.Value) &&
                (allowed == null || allowed.Contains(u.BuildingId)) &&
                (onlyUnitIds == null || onlyUnitIds.Contains(u.Id)))
            .OrderBy(u => u.Building.Name)
            .ThenBy(u => u.Number)
            .Select(u => new
            {
                u.Id,
                u.Number,
                BuildingName = u.Building.Name,
                // Residents/tenants get the charge; with no one living there, the owner does.
                HasPeople = _context.PersonUnits.Any(pu => pu.UnitId == u.Id),
                RecipientLinked = recipientPersonId == null ||
                    _context.PersonUnits.Any(pu => pu.UnitId == u.Id && pu.PersonId == recipientPersonId)
            })
            .ToListAsync();

        // Units already billed by this recurrence for this month (the job may run more than once).
        var alreadyBilled = new HashSet<int>();

        if (request.RecurringChargeId.HasValue)
        {
            var billedIds = await _context.Charges
                .AsNoTracking()
                .Where(c =>
                    c.RecurringChargeId == request.RecurringChargeId &&
                    c.ReferenceMonth == request.ReferenceMonth &&
                    c.UnitId != null)
                .Select(c => c.UnitId!.Value)
                .ToListAsync();

            alreadyBilled = billedIds.ToHashSet();
        }

        var dueDate = DateTime.SpecifyKind(request.DueDate.Date, DateTimeKind.Unspecified);
        var (finePercent, monthlyInterestPercent) = await GetLateFeeRuleAsync(request.CondominiumId);
        var result = new ChargeBatchResultDto { DueDate = dueDate };
        var charges = new List<Charge>();

        foreach (var unit in units.Where(u => !alreadyBilled.Contains(u.Id)))
        {
            if (!unit.HasPeople)
            {
                result.Skipped.Add(new SkippedUnitDto
                {
                    UnitId = unit.Id,
                    UnitNumber = unit.Number,
                    BuildingName = unit.BuildingName,
                    Reason = "Unidade sem morador ou proprietário vinculado."
                });
                continue;
            }

            // The recipient moved out: the charge must not fall on the rest of the unit.
            if (!unit.RecipientLinked)
            {
                result.Skipped.Add(new SkippedUnitDto
                {
                    UnitId = unit.Id,
                    UnitNumber = unit.Number,
                    BuildingName = unit.BuildingName,
                    Reason = "A pessoa que recebe esta cobrança não está mais vinculada à unidade."
                });
                continue;
            }

            var charge = new Charge
            {
                Scope = ChargeScope.Condominium,
                CondominiumId = request.CondominiumId,
                UnitId = unit.Id,
                Value = request.UnitValues.TryGetValue(unit.Id, out var unitValue) ? unitValue : request.Value,
                DueDate = dueDate,
                Description = request.Description,
                Category = request.Category,
                RecipientPersonId = recipientPersonId,
                CreatedByUserId = request.CreatedByUserId,
                Status = ChargeStatus.Pending,
                CreatedAt = DateTime.UtcNow,
                RecurringChargeId = request.RecurringChargeId,
                ReferenceMonth = request.ReferenceMonth,
                FinePercent = finePercent,
                MonthlyInterestPercent = monthlyInterestPercent
            };

            charges.Add(charge);
        }

        if (charges.Count == 0)
            return result;

        _context.Charges.AddRange(charges);
        await _context.SaveChangesAsync();

        foreach (var charge in charges)
        {
            await CreateChargeNotificationsAsync(charge);
            await _chargeEmailNotifier.QueueNewChargeAsync(charge);
        }

        var chargeIds = charges.Select(c => c.Id).ToList();
        var created = await BuildChargeResponseQuery()
            .Where(c => chargeIds.Contains(c.Id))
            .OrderBy(c => c.Unit!.Building.Name)
            .ThenBy(c => c.Unit!.Number)
            .ToListAsync();

        result.Charges = _mapper.Map<List<ChargeResponseDto>>(created);
        result.CreatedCount = result.Charges.Count;
        result.TotalValue = charges.Sum(c => c.Value);

        return result;
    }

    // The condominium's fine/interest rule, copied onto each new charge so turning the rule on
    // or changing it later never alters charges created before. (null, null) = rule off.
    public async Task<(decimal? FinePercent, decimal? MonthlyInterestPercent)> GetLateFeeRuleAsync(int condominiumId)
    {
        var rule = await _context.Condominiums
            .AsNoTracking()
            .Where(c => c.Id == condominiumId)
            .Select(c => new { c.LateFeeEnabled, c.FinePercent, c.MonthlyInterestPercent })
            .FirstOrDefaultAsync();

        if (rule is null || !rule.LateFeeEnabled)
            return (null, null);

        return (
            Math.Min(rule.FinePercent, ChargeLateFees.MaxFinePercent),
            Math.Min(rule.MonthlyInterestPercent, ChargeLateFees.MaxMonthlyInterestPercent));
    }

    private async Task ValidateCreateAsync(int userId, CreateChargeDto dto)
    {
        if (IsPastDueDate(dto.DueDate))
            throw new BadRequestException(PastDueDateMessage);

        var condominiumExists = await _context.Condominiums
            .AsNoTracking()
            .AnyAsync(c => c.Id == dto.CondominiumId);

        if (!condominiumExists)
            throw new NotFoundException("Condomínio não encontrado.");

        if (dto.Scope == ChargeScope.Platform)
        {
            await ValidatePlatformChargeCreateAsync(userId, dto);
            return;
        }

        if (dto.Scope == ChargeScope.Condominium)
        {
            await ValidateCondominiumChargeCreateAsync(userId, dto);
            return;
        }

        throw new BadRequestException("Tipo de cobrança inválido.");
    }
    private async Task ValidatePlatformChargeCreateAsync(int userId, CreateChargeDto dto)
    {
        await _permissionService.EnsureMasterAsync(userId);

        if (dto.UnitId is not null)
            throw new BadRequestException("Mensalidade da plataforma não pode ter unidade.");

        var ownsCondominium = await _context.Condominiums
            .AsNoTracking()
            .AnyAsync(c =>
                c.Id == dto.CondominiumId &&
                c.CreatedByUserId == userId);

        if (!ownsCondominium)
            throw new ForbiddenException("Você só pode criar mensalidades para condomínios cadastrados por você.");

        await EnsurePaymentMethodConfiguredAsync(FinancialAccountScope.Platform, null);
    }

    private async Task ValidateCondominiumChargeCreateAsync(int userId, CreateChargeDto dto)
    {
        if (await _permissionService.IsMasterAsync(userId))
            throw new ForbiddenException("O Master não cria cobranças de condomínio.");

        if (dto.TargetUserId is not null)
            throw new BadRequestException("Cobrança de condomínio não pode ter um usuário de destino.");

        if (dto.UnitId is null)
            throw new BadRequestException("Selecione a unidade da cobrança.");

        await _permissionService.EnsureCondominiumPermissionAsync(
            userId,
            dto.CondominiumId,
            AppPermissions.ChargesCreate);

        if (await _permissionService.GetCondominiumRoleAsync(userId, dto.CondominiumId) == AppRoles.Syndic)
            await _permissionService.EnsureUnitAccessAsync(userId, dto.UnitId.Value);

        var unitBelongsToCondominium = await _context.Units
            .AsNoTracking()
            .AnyAsync(u =>
                u.Id == dto.UnitId.Value &&
                u.Building.CondominiumId == dto.CondominiumId);

        if (!unitBelongsToCondominium)
            throw new BadRequestException("Esta unidade não pertence a este condomínio.");

        await EnsureRecipientLinkedAsync(dto.RecipientPersonId, dto.UnitId.Value);

        await EnsurePaymentMethodConfiguredAsync(FinancialAccountScope.Condominium, dto.CondominiumId);
    }

    public Task EnsureCondominiumPaymentMethodAsync(int condominiumId)
    {
        return EnsurePaymentMethodConfiguredAsync(FinancialAccountScope.Condominium, condominiumId);
    }

    // A charge needs a way to be paid: a Pix key for manual transfer or a connected
    // Mercado Pago account (platform account for platform charges, the condominium's own otherwise).
    private async Task EnsurePaymentMethodConfiguredAsync(
        FinancialAccountScope scope,
        int? condominiumId)
    {
        var hasPixKey = await _context.FinancialAccounts
            .AsNoTracking()
            .AnyAsync(account =>
                account.Scope == scope &&
                account.CondominiumId == condominiumId &&
                !string.IsNullOrWhiteSpace(account.PixKey));

        if (hasPixKey)
            return;

        int? mercadoPagoCondominiumId = scope == FinancialAccountScope.Platform ? null : condominiumId;

        var hasMercadoPago = await _context.MercadoPagoAccounts
            .AsNoTracking()
            .AnyAsync(account =>
                account.CondominiumId == mercadoPagoCondominiumId &&
                account.AccessToken != string.Empty);

        if (hasMercadoPago)
            return;

        var message = scope == FinancialAccountScope.Platform
            ? "Configure uma chave Pix ou conecte o Mercado Pago da plataforma antes de criar cobranças MORAÊ."
            : "Configure uma chave Pix ou conecte o Mercado Pago do condomínio antes de criar cobranças internas.";

        throw new BadRequestException(message);
    }

    private async Task EnsureCanReadAsync(int userId, Charge charge)
    {
        var user = await GetUserOrThrowAsync(userId);

        if (charge.Scope == ChargeScope.Platform)
        {
            if (await _userManager.IsInRoleAsync(user, AppRoles.Master) &&
                await IsMasterCondominiumOwnerAsync(userId, charge.CondominiumId))
            {
                return;
            }

            if (await _permissionService.IsPlatformBillingAdminAsync(userId, charge.CondominiumId))
                return;

            throw new ForbiddenException("Você não tem acesso a esta mensalidade.");
        }

        await _permissionService.EnsureCanReadCondominiumChargeAsync(userId, charge);
    }

    private async Task EnsureCanCancelAsync(int userId, Charge charge)
    {
        var user = await GetUserOrThrowAsync(userId);

        if (charge.Scope == ChargeScope.Platform)
        {
            await _permissionService.EnsureMasterAsync(userId);

            if (!await IsMasterCondominiumOwnerAsync(userId, charge.CondominiumId))
                throw new ForbiddenException("Você só pode cancelar mensalidades de condomínios cadastrados por você.");

            return;
        }

        if (await _userManager.IsInRoleAsync(user, AppRoles.Admin))
        {
            await _permissionService.EnsureCondominiumAdminAsync(userId, charge.CondominiumId);
            return;
        }

        throw new ForbiddenException("Você não tem permissão para cancelar esta cobrança.");
    }
    private async Task<ApplicationUser> GetUserOrThrowAsync(int userId)
    {
        var user = await _userManager.FindByIdAsync(userId.ToString());

        if (user is null)
            throw new NotFoundException("Usuário não encontrado.");

        return user;
    }

    private IQueryable<Charge> BuildChargeResponseQuery()
    {
        return _context.Charges
            .AsNoTracking()
            .Include(c => c.Condominium)
            .Include(c => c.RecipientPerson)
            .Include(c => c.Unit)
                .ThenInclude(u => u!.Building);
    }

    private async Task<ChargeResponseDto> GetChargeResponseOrThrowAsync(int id)
    {
        var charge = await BuildChargeResponseQuery()
            .FirstOrDefaultAsync(c => c.Id == id);

        if (charge is null)
            throw new NotFoundException("Cobrança não encontrada.");

        return (await MapWithPaymentInfoAsync([charge]))[0];
    }

    // Adds what the payment screens need besides the charge itself: whether Mercado Pago is
    // connected for the receiver and the state of the Pix receipts. Two queries for the whole list.
    private async Task<List<ChargeResponseDto>> MapWithPaymentInfoAsync(IReadOnlyCollection<Charge> charges)
    {
        var responses = _mapper.Map<List<ChargeResponseDto>>(charges);

        if (responses.Count == 0)
            return responses;

        var chargeIds = responses.Select(charge => charge.Id).ToList();
        var condominiumIds = responses.Select(charge => charge.CondominiumId).Distinct().ToList();

        // CondominiumId null is the platform account (receives the MORAÊ invoices).
        var connectedReceivers = await _context.MercadoPagoAccounts
            .AsNoTracking()
            .Where(account =>
                account.AccessToken != string.Empty &&
                (account.CondominiumId == null || condominiumIds.Contains(account.CondominiumId.Value)))
            .Select(account => account.CondominiumId)
            .ToListAsync();

        var proofs = await _context.PaymentProofs
            .AsNoTracking()
            .Where(proof => chargeIds.Contains(proof.ChargeId))
            .Select(proof => new { proof.Id, proof.ChargeId, proof.Status, proof.RejectionReason })
            .ToListAsync();

        var proofsByCharge = proofs.ToLookup(proof => proof.ChargeId);

        foreach (var response in responses)
        {
            int? receiver = response.Scope == ChargeScope.Platform ? null : response.CondominiumId;
            response.OnlinePaymentAvailable = connectedReceivers.Contains(receiver);

            var chargeProofs = proofsByCharge[response.Id].ToList();
            var latest = chargeProofs.MaxBy(proof => proof.Id);

            response.PendingProofCount = chargeProofs.Count(proof => proof.Status == PaymentProofStatus.Pending);
            response.LatestProofStatus = latest?.Status;
            response.LatestProofRejectionReason = latest?.Status == PaymentProofStatus.Rejected ? latest.RejectionReason : null;
        }

        return responses;
    }

    private async Task<bool> IsMasterCondominiumOwnerAsync(int userId, int condominiumId)
    {
        return await _context.Condominiums
            .AsNoTracking()
            .AnyAsync(c =>
                c.Id == condominiumId &&
                c.CreatedByUserId == userId);
    }

    private async Task CreateChargeNotificationsAsync(Charge charge)
    {
        var condominiumName = await _context.Condominiums
            .AsNoTracking()
            .Where(condominium => condominium.Id == charge.CondominiumId)
            .Select(condominium => condominium.Name)
            .FirstAsync();

        if (charge.Scope == ChargeScope.Platform)
        {
            var adminUserIds = await _context.UserCondominiums
                .AsNoTracking()
                .Where(userCondominium =>
                    userCondominium.CondominiumId == charge.CondominiumId &&
                    userCondominium.Role == AppRoles.Admin &&
                    userCondominium.Status == UserCondominiumStatus.Active)
                .Select(userCondominium => userCondominium.UserId)
                .Distinct()
                .ToListAsync();

            await _notificationService.CreateManyAsync(
                adminUserIds,
                NotificationType.Charge,
                "Nova cobrança MORAÊ",
                $"Há uma nova cobrança institucional para {condominiumName}.",
                "/admin/payments",
                charge.CondominiumId);

            return;
        }

        if (charge.Scope == ChargeScope.Condominium && charge.UnitId.HasValue)
        {
            // Same people who get the e-mail: only the recipient when the charge has one.
            var residentUserIds = await _chargeEmailNotifier.GetPayerUserIdsAsync(charge);

            await _notificationService.CreateManyAsync(
                residentUserIds,
                NotificationType.Charge,
                "Novo boleto disponível",
                $"Uma cobrança de {charge.Value.ToString("C", CultureInfo.GetCultureInfo("pt-BR"))} foi gerada para sua unidade.",
                "/resident/bills",
                charge.CondominiumId);
        }
    }
}
