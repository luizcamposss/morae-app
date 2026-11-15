using System.Globalization;
using backend.Constants;
using backend.Data;
using backend.DTOs.Rental;
using backend.Enums;
using backend.Exceptions;
using backend.Models;
using backend.Services.Charges;
using backend.Services.Invoices;
using backend.Services.Notifications;
using backend.Services.Permissions;
using Microsoft.EntityFrameworkCore;

namespace backend.Services.Rentals;

public class RentalContractService : IRentalContractService
{
    // The rent enters the draft bill this many days before it is due (before any automatic send).
    public const int GenerateDaysBefore = 20;
    private const int AdjustmentReminderDays = 30;
    private static readonly CultureInfo PtBr = CultureInfo.GetCultureInfo("pt-BR");

    private readonly AppDbContext _context;
    private readonly IPermissionService _permissionService;
    private readonly IInvoiceService _invoiceService;
    private readonly INotificationService _notificationService;
    private readonly ILogger<RentalContractService> _logger;

    public RentalContractService(
        AppDbContext context,
        IPermissionService permissionService,
        IInvoiceService invoiceService,
        INotificationService notificationService,
        ILogger<RentalContractService> logger)
    {
        _context = context;
        _permissionService = permissionService;
        _invoiceService = invoiceService;
        _notificationService = notificationService;
        _logger = logger;
    }

    public async Task<IEnumerable<RentalContractResponseDto>> GetByCondominiumAsync(int userId, int condominiumId)
    {
        await _permissionService.EnsureCondominiumPermissionAsync(userId, condominiumId, AppPermissions.RentalsManage);
        var managedBuildingIds = await _permissionService.GetManagedBuildingIdsAsync(userId, condominiumId);

        var query = ContractsQuery().Where(contract => contract.CondominiumId == condominiumId);

        if (managedBuildingIds is not null)
            query = query.Where(contract => managedBuildingIds.Contains(contract.Unit.BuildingId));

        var contracts = await query.ToListAsync();

        return contracts
            .OrderBy(contract => contract.Status)
            .ThenBy(contract => contract.Unit.Building.Name)
            .ThenBy(contract => contract.Unit.Number)
            .Select(contract => contract.ReceiverPersonId.HasValue ? ToManagementView(contract) : ToResponse(contract));
    }

    public async Task<IEnumerable<RentalContractResponseDto>> GetMineAsync(int userId)
    {
        var personId = await _context.Users
            .Where(user => user.Id == userId)
            .Select(user => user.PersonId)
            .FirstOrDefaultAsync();

        var contracts = await ContractsQuery()
            .Where(contract =>
                contract.TenantPersonId == personId &&
                contract.Status == RentalContractStatus.Active &&
                contract.Condominium.Status == Status.Active &&
                contract.Condominium.EnabledModules.Contains(AppModules.Rentals))
            .ToListAsync();

        return contracts.Select(ToResponse);
    }

    public async Task<RentalContractResponseDto> CreateAsync(int userId, int condominiumId, SaveRentalContractDto dto)
    {
        await _permissionService.EnsureCondominiumPermissionAsync(userId, condominiumId, AppPermissions.RentalsManage);
        await EnsureUnitManagedAsync(userId, condominiumId, dto.UnitId);

        return await CreateContractAsync(userId, condominiumId, dto, receiverPersonId: null);
    }

    private async Task<RentalContractResponseDto> CreateContractAsync(int userId, int condominiumId, SaveRentalContractDto dto, int? receiverPersonId)
    {
        var tenantLinked = await _context.PersonUnits.AnyAsync(link => link.UnitId == dto.UnitId && link.PersonId == dto.TenantPersonId);

        if (!tenantLinked)
            throw new BadRequestException("O inquilino precisa estar vinculado à unidade. Vincule a pessoa em Unidades antes.");

        var hasActive = await _context.RentalContracts.AnyAsync(contract => contract.UnitId == dto.UnitId && contract.Status == RentalContractStatus.Active);

        if (hasActive)
            throw new ConflictException("Esta unidade já tem um contrato ativo. Encerre-o antes de cadastrar outro.");

        ValidateTerms(dto);

        var contract = new RentalContract
        {
            CondominiumId = condominiumId,
            UnitId = dto.UnitId,
            TenantPersonId = dto.TenantPersonId,
            ReceiverPersonId = receiverPersonId,
            MonthlyRent = Math.Round(dto.MonthlyRent, 2),
            StartDate = dto.StartDate,
            CreatedByUserId = userId,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        ApplyTerms(contract, dto);
        contract.ValueChanges.Add(new RentalContractValueChange
        {
            NewValue = contract.MonthlyRent,
            EffectiveFrom = FirstDay(dto.StartDate),
            ChangedByUserId = userId,
            CreatedAt = DateTime.UtcNow
        });

        _context.RentalContracts.Add(contract);
        await _context.SaveChangesAsync();

        // The first month may already be close: no need to wait for the hourly job.
        await GenerateForContractAsync(contract, AppTimeZone.Today);

        return await GetResponseAsync(contract.Id);
    }

    public async Task<IEnumerable<RentalContractResponseDto>> GetOwnedAsync(int userId)
    {
        var personId = await GetPersonIdAsync(userId);

        var contracts = await ContractsQuery()
            .Where(contract =>
                contract.ReceiverPersonId == personId &&
                contract.Condominium.Status == Status.Active &&
                contract.Condominium.EnabledModules.Contains(AppModules.Rentals))
            .ToListAsync();

        return contracts
            .OrderBy(contract => contract.Status)
            .ThenBy(contract => contract.Unit.Building.Name)
            .ThenBy(contract => contract.Unit.Number)
            .Select(ToResponse);
    }

    public async Task<RentalContractResponseDto> CreateAsOwnerAsync(int userId, SaveRentalContractDto dto)
    {
        var personId = await GetPersonIdAsync(userId);

        var unit = await _context.PersonUnits
            .AsNoTracking()
            .Where(link => link.PersonId == personId && link.UnitId == dto.UnitId && link.RelationshipType == UnitRelationshipType.Owner)
            .Select(link => new { link.Unit.Building.CondominiumId, link.Unit.Building.Condominium.Status })
            .FirstOrDefaultAsync()
            ?? throw new ForbiddenException("Você só aluga as unidades de que é proprietário.");

        if (unit.Status != Status.Active)
            throw new ForbiddenException("Este condomínio está inativo.");

        await _permissionService.EnsureModuleEnabledAsync(unit.CondominiumId, AppModules.Rentals);

        if (dto.TenantPersonId == personId)
            throw new BadRequestException("O inquilino precisa ser outra pessoa.");

        // The condominium fee belongs to the condominium: it never goes in the owner's bill.
        if (dto.IncludesCondominiumFee)
            throw new BadRequestException("A taxa de condomínio é cobrada pelo condomínio, não entra no seu aluguel.");

        return await CreateContractAsync(userId, unit.CondominiumId, dto, receiverPersonId: personId);
    }

    public async Task<RentalContractResponseDto> UpdateAsync(int userId, int contractId, SaveRentalContractDto dto)
    {
        var contract = await GetForManagementAsync(userId, contractId);

        if (contract.Status != RentalContractStatus.Active)
            throw new BadRequestException("Este contrato já foi encerrado.");

        dto.StartDate = contract.StartDate;
        ValidateTerms(dto);

        if (contract.ReceiverPersonId.HasValue && dto.IncludesCondominiumFee)
            throw new BadRequestException("A taxa de condomínio é cobrada pelo condomínio, não entra no seu aluguel.");
        ApplyTerms(contract, dto);
        contract.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        await GenerateForContractAsync(contract, AppTimeZone.Today);

        return await GetResponseAsync(contract.Id);
    }

    public async Task<RentalContractResponseDto> AdjustAsync(int userId, int contractId, AdjustRentDto dto)
    {
        var contract = await GetForManagementAsync(userId, contractId);

        if (contract.Status != RentalContractStatus.Active)
            throw new BadRequestException("Este contrato já foi encerrado.");

        if (dto.NewValue <= 0 || dto.NewValue > 1_000_000)
            throw new BadRequestException("Informe o novo valor do aluguel.");

        var newValue = Math.Round(dto.NewValue, 2);

        // Months already in a bill keep the old value; the next one on gets the new value.
        var effectiveFrom = contract.LastBilledMonth?.AddMonths(1) ?? FirstDay(contract.StartDate);

        _context.RentalContractValueChanges.Add(new RentalContractValueChange
        {
            RentalContractId = contract.Id,
            PreviousValue = contract.MonthlyRent,
            NewValue = newValue,
            EffectiveFrom = effectiveFrom,
            ChangedByUserId = userId,
            CreatedAt = DateTime.UtcNow
        });

        contract.MonthlyRent = newValue;

        if (contract.AdjustmentIndex != RentAdjustmentIndex.None)
        {
            var today = DateOnly.FromDateTime(AppTimeZone.Today);
            var next = contract.NextAdjustmentDate ?? contract.StartDate.AddYears(1);
            while (next <= today) next = next.AddYears(1);
            contract.NextAdjustmentDate = next;
        }

        contract.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return await GetResponseAsync(contract.Id);
    }

    public async Task<RentalContractResponseDto> EndAsync(int userId, int contractId, EndRentalContractDto dto)
    {
        var contract = await GetForManagementAsync(userId, contractId);

        if (contract.Status != RentalContractStatus.Active)
            throw new BadRequestException("Este contrato já foi encerrado.");

        if (dto.EndDate < contract.StartDate)
            throw new BadRequestException("O fim não pode ser antes do início do contrato.");

        contract.EndDate = dto.EndDate;
        contract.EndReason = string.IsNullOrWhiteSpace(dto.Reason) ? null : dto.Reason.Trim();

        // Ends now when the date already came; otherwise the job ends it on that day.
        if (dto.EndDate < DateOnly.FromDateTime(AppTimeZone.Today))
        {
            contract.Status = RentalContractStatus.Ended;
            contract.EndedAt = DateTime.UtcNow;
        }

        contract.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return await GetResponseAsync(contract.Id);
    }

    public async Task GenerateDueRentAsync(CancellationToken cancellationToken)
    {
        var today = AppTimeZone.Today;
        var todayDate = DateOnly.FromDateTime(today);

        var contracts = await _context.RentalContracts
            .Where(contract =>
                contract.Status == RentalContractStatus.Active &&
                contract.Condominium.Status == Status.Active &&
                contract.Condominium.EnabledModules.Contains(AppModules.Rentals))
            .ToListAsync(cancellationToken);

        foreach (var contract in contracts)
        {
            try
            {
                await GenerateForContractAsync(contract, today);

                if (contract.EndDate is { } endDate && endDate < todayDate)
                {
                    contract.Status = RentalContractStatus.Ended;
                    contract.EndedAt = DateTime.UtcNow;
                    await _context.SaveChangesAsync(cancellationToken);
                }
            }
            catch (Exception exception) when (exception is BadRequestException or DbUpdateException)
            {
                _logger.LogWarning(exception, "Rent of contract {ContractId} not generated.", contract.Id);
            }
        }
    }

    public async Task SendAdjustmentRemindersAsync(CancellationToken cancellationToken)
    {
        var limit = DateOnly.FromDateTime(AppTimeZone.Today).AddDays(AdjustmentReminderDays);

        var contracts = await _context.RentalContracts
            .Include(contract => contract.Unit).ThenInclude(unit => unit.Building)
            .Include(contract => contract.TenantPerson)
            .Where(contract =>
                contract.Status == RentalContractStatus.Active &&
                contract.NextAdjustmentDate != null &&
                contract.NextAdjustmentDate <= limit &&
                contract.AdjustmentReminderSentFor != contract.NextAdjustmentDate &&
                contract.Condominium.Status == Status.Active &&
                contract.Condominium.EnabledModules.Contains(AppModules.Rentals))
            .ToListAsync(cancellationToken);

        foreach (var contract in contracts)
        {
            // The owner's contract: the owner is reminded, the management never sees its values.
            if (contract.ReceiverPersonId.HasValue)
            {
                var ownerUserIds = await _context.Users
                    .AsNoTracking()
                    .Where(user => user.PersonId == contract.ReceiverPersonId)
                    .Select(user => user.Id)
                    .ToListAsync(cancellationToken);

                await _notificationService.CreateManyAsync(
                    ownerUserIds,
                    NotificationType.System,
                    "Reajuste de aluguel chegando",
                    $"O aluguel de {contract.Unit.Building.Name} · {contract.Unit.Number} ({contract.TenantPerson.Name}) tem reajuste em " +
                    $"{contract.NextAdjustmentDate!.Value.ToString("dd/MM/yyyy", PtBr)}. Informe o novo valor em Meus aluguéis.",
                    "/resident/rentals",
                    contract.CondominiumId);

                contract.AdjustmentReminderSentFor = contract.NextAdjustmentDate;
                await _context.SaveChangesAsync(cancellationToken);
                continue;
            }

            var managers = await _context.UserCondominiums
                .AsNoTracking()
                .Where(link =>
                    link.CondominiumId == contract.CondominiumId &&
                    link.Status == UserCondominiumStatus.Active &&
                    (link.Role == AppRoles.Admin ||
                     (link.Role == AppRoles.Syndic &&
                      (link.ManagesAllBuildings || link.Buildings.Any(building => building.BuildingId == contract.Unit.BuildingId)) &&
                      _context.UserCondominiumPermissions.Any(permission =>
                          permission.UserCondominiumId == link.Id &&
                          permission.PermissionKey == AppPermissions.RentalsManage))))
                .Select(link => new { link.UserId, link.Role })
                .ToListAsync(cancellationToken);

            var message = $"O aluguel de {contract.Unit.Building.Name} · {contract.Unit.Number} ({contract.TenantPerson.Name}) " +
                          $"tem reajuste em {contract.NextAdjustmentDate!.Value.ToString("dd/MM/yyyy", PtBr)} ({AdjustmentLabel(contract.AdjustmentIndex)}). " +
                          "Informe o novo valor em Aluguéis.";

            foreach (var role in managers.GroupBy(manager => manager.Role))
            {
                await _notificationService.CreateManyAsync(
                    role.Select(manager => manager.UserId),
                    NotificationType.System,
                    "Reajuste de aluguel chegando",
                    message,
                    role.Key == AppRoles.Admin ? "/admin/rentals" : "/syndic/rentals",
                    contract.CondominiumId);
            }

            contract.AdjustmentReminderSentFor = contract.NextAdjustmentDate;
            await _context.SaveChangesAsync(cancellationToken);
        }
    }

    // Puts every month whose day came (GenerateDaysBefore before the due date) in the tenant's draft,
    // in order, never twice. Months already past due when they come up are skipped, as in recurring charges.
    private async Task GenerateForContractAsync(RentalContract contract, DateTime today)
    {
        if (contract.Status != RentalContractStatus.Active)
            return;

        var month = contract.LastBilledMonth?.AddMonths(1) ?? FirstDay(contract.StartDate);
        var lastMonth = contract.EndDate is { } endDate ? FirstDay(endDate) : (DateOnly?)null;

        while ((lastMonth is null || month <= lastMonth) && DueDate(contract, month).AddDays(-GenerateDaysBefore) <= today)
        {
            var dueDate = DueDate(contract, month);
            var tenantLinked = await _context.PersonUnits.AnyAsync(link => link.UnitId == contract.UnitId && link.PersonId == contract.TenantPersonId);

            if (dueDate >= today && tenantLinked)
            {
                await AddItemAsync(contract, month, dueDate, ChargeCategory.Rent, "Aluguel", contract.MonthlyRent);

                if (contract.IncludesCondominiumFee && contract.CondominiumFeeAmount is > 0)
                    await AddItemAsync(contract, month, dueDate, ChargeCategory.CondominiumFee, "Taxa de condomínio", contract.CondominiumFeeAmount.Value);
            }
            else if (!tenantLinked)
            {
                _logger.LogWarning("Rent of contract {ContractId} skipped for {Month}: the tenant left the unit.", contract.Id, month);
            }

            contract.LastBilledMonth = month;
            await _context.SaveChangesAsync();
            month = month.AddMonths(1);
        }
    }

    private Task<InvoiceItemResult> AddItemAsync(RentalContract contract, DateOnly month, DateTime dueDate, ChargeCategory category, string description, decimal amount) =>
        _invoiceService.AddItemToDraftAsync(new InvoiceItemRequest(
            contract.CondominiumId,
            contract.UnitId,
            contract.TenantPersonId,
            month,
            category,
            description,
            amount,
            contract.CreatedByUserId,
            dueDate,
            contract.ReceiverPersonId));

    private static DateTime DueDate(RentalContract contract, DateOnly month) =>
        ChargeLateFees.DueDateIn(month.Year, month.Month, contract.DueDay);

    private static DateOnly FirstDay(DateOnly date) => new(date.Year, date.Month, 1);

    private static void ValidateTerms(SaveRentalContractDto dto)
    {
        if (dto.EndDate is { } endDate && endDate < dto.StartDate)
            throw new BadRequestException("O fim não pode ser antes do início do contrato.");

        if (dto.IncludesCondominiumFee && dto.CondominiumFeeAmount is not > 0)
            throw new BadRequestException("Informe o valor da taxa de condomínio que entra na conta.");

        if (!Enum.IsDefined(dto.CondominiumBillsPaidBy))
            throw new BadRequestException("Diga quem paga as contas do condomínio: o inquilino ou o proprietário.");

        if (!Enum.IsDefined(dto.AdjustmentIndex))
            throw new BadRequestException("Escolha como o aluguel é reajustado.");
    }

    private static void ApplyTerms(RentalContract contract, SaveRentalContractDto dto)
    {
        contract.DueDay = dto.DueDay;
        contract.EndDate = dto.EndDate;
        contract.IncludesWater = dto.IncludesWater;
        contract.IncludesElectricity = dto.IncludesElectricity;
        contract.IncludesGas = dto.IncludesGas;
        contract.IncludesCondominiumFee = dto.IncludesCondominiumFee;
        contract.CondominiumFeeAmount = dto.IncludesCondominiumFee ? Math.Round(dto.CondominiumFeeAmount!.Value, 2) : null;
        contract.CondominiumBillsPaidBy = dto.CondominiumBillsPaidBy;
        contract.AdjustmentIndex = dto.AdjustmentIndex;
        contract.NextAdjustmentDate = dto.AdjustmentIndex == RentAdjustmentIndex.None
            ? null
            : dto.NextAdjustmentDate ?? contract.NextAdjustmentDate ?? dto.StartDate.AddYears(1);
    }

    private static string AdjustmentLabel(RentAdjustmentIndex index) => index switch
    {
        RentAdjustmentIndex.Ipca => "IPCA",
        RentAdjustmentIndex.Igpm => "IGP-M",
        RentAdjustmentIndex.Agreed => "valor combinado",
        _ => "sem índice"
    };

    private async Task<RentalContract> GetForManagementAsync(int userId, int contractId)
    {
        var contract = await _context.RentalContracts.FirstOrDefaultAsync(row => row.Id == contractId)
            ?? throw new NotFoundException("Contrato não encontrado.");

        // The owner's own contract: only the owner changes it (#201).
        if (contract.ReceiverPersonId.HasValue)
        {
            if (contract.ReceiverPersonId != await GetPersonIdAsync(userId))
                throw new ForbiddenException("Só o proprietário altera este contrato.");

            return contract;
        }

        await _permissionService.EnsureCondominiumPermissionAsync(userId, contract.CondominiumId, AppPermissions.RentalsManage);
        await EnsureUnitManagedAsync(userId, contract.CondominiumId, contract.UnitId);

        return contract;
    }

    private async Task EnsureUnitManagedAsync(int userId, int condominiumId, int unitId)
    {
        var buildingId = await _context.Units
            .Where(unit => unit.Id == unitId && unit.Building.CondominiumId == condominiumId)
            .Select(unit => (int?)unit.BuildingId)
            .FirstOrDefaultAsync()
            ?? throw new BadRequestException("A unidade não é deste condomínio.");

        var managedBuildingIds = await _permissionService.GetManagedBuildingIdsAsync(userId, condominiumId);

        if (managedBuildingIds is not null && !managedBuildingIds.Contains(buildingId))
            throw new ForbiddenException("Você não cuida do prédio desta unidade.");
    }

    private async Task<int> GetPersonIdAsync(int userId) =>
        await _context.Users
            .AsNoTracking()
            .Where(user => user.Id == userId)
            .Select(user => (int?)user.PersonId)
            .FirstOrDefaultAsync()
        ?? throw new NotFoundException("Usuário não encontrado.");

    // What the management sees of an owner's contract: the unit is rented and to whom, no values.
    private static RentalContractResponseDto ToManagementView(RentalContract contract)
    {
        var response = ToResponse(contract);
        response.MonthlyRent = 0;
        response.CondominiumFeeAmount = null;
        response.NextAdjustmentDate = null;
        response.ValueChanges = [];
        return response;
    }

    private IQueryable<RentalContract> ContractsQuery() =>
        _context.RentalContracts
            .AsNoTracking()
            .Include(contract => contract.Unit).ThenInclude(unit => unit.Building)
            .Include(contract => contract.TenantPerson)
            .Include(contract => contract.ReceiverPerson)
            .Include(contract => contract.ValueChanges);

    private async Task<RentalContractResponseDto> GetResponseAsync(int contractId)
    {
        var contract = await ContractsQuery().FirstOrDefaultAsync(row => row.Id == contractId)
            ?? throw new NotFoundException("Contrato não encontrado.");

        return ToResponse(contract);
    }

    private static RentalContractResponseDto ToResponse(RentalContract contract) => new()
    {
        Id = contract.Id,
        CondominiumId = contract.CondominiumId,
        UnitId = contract.UnitId,
        UnitNumber = contract.Unit.Number,
        BuildingName = contract.Unit.Building.Name,
        TenantPersonId = contract.TenantPersonId,
        TenantName = contract.TenantPerson.Name,
        MonthlyRent = contract.MonthlyRent,
        DueDay = contract.DueDay,
        StartDate = contract.StartDate,
        EndDate = contract.EndDate,
        IncludesWater = contract.IncludesWater,
        IncludesElectricity = contract.IncludesElectricity,
        IncludesGas = contract.IncludesGas,
        IncludesCondominiumFee = contract.IncludesCondominiumFee,
        CondominiumFeeAmount = contract.CondominiumFeeAmount,
        CondominiumBillsPaidBy = contract.CondominiumBillsPaidBy,
        AdjustmentIndex = contract.AdjustmentIndex,
        NextAdjustmentDate = contract.NextAdjustmentDate,
        Status = contract.Status,
        LastBilledMonth = contract.LastBilledMonth,
        EndReason = contract.EndReason,
        IsOwnerContract = contract.ReceiverPersonId.HasValue,
        OwnerName = contract.ReceiverPerson?.Name,
        ValueChanges = contract.ValueChanges
            .OrderByDescending(change => change.EffectiveFrom)
            .ThenByDescending(change => change.Id)
            .Select(change => new RentValueChangeDto
            {
                PreviousValue = change.PreviousValue,
                NewValue = change.NewValue,
                EffectiveFrom = change.EffectiveFrom,
                CreatedAt = change.CreatedAt
            })
            .ToList()
    };
}
