using System.Globalization;
using backend.Constants;
using backend.Data;
using backend.DTOs.Charge;
using backend.DTOs.Invoice;
using backend.Enums;
using backend.Exceptions;
using backend.Models;
using backend.Services.Charges;
using backend.Services.Permissions;
using Microsoft.EntityFrameworkCore;

namespace backend.Services.Invoices;

// Monthly bills: one charge (category MonthlyBill) per unit, payer and month, made of items
// (rent, water, light...). It stays a draft (hidden from residents) until the management sends it;
// from then on it is paid like any other charge.
public class InvoiceService : IInvoiceService
{
    private static readonly CultureInfo PtBr = CultureInfo.GetCultureInfo("pt-BR");

    // The owner's rent bill reaches the tenant this many days before it is due.
    public const int OwnerSendDaysBefore = 10;

    // Items that have their own flow and never go inside a monthly bill.
    private static readonly HashSet<ChargeCategory> NotAllowedItemCategories =
        [ChargeCategory.MonthlyBill, ChargeCategory.Agreement, ChargeCategory.Reservation];

    private readonly AppDbContext _context;
    private readonly IPermissionService _permissionService;
    private readonly IChargeService _chargeService;
    private readonly ILogger<InvoiceService> _logger;

    public InvoiceService(
        AppDbContext context,
        IPermissionService permissionService,
        IChargeService chargeService,
        ILogger<InvoiceService> logger)
    {
        _context = context;
        _permissionService = permissionService;
        _chargeService = chargeService;
        _logger = logger;
    }

    public async Task<InvoiceMonthDto> GetMonthAsync(int userId, int condominiumId, string? month)
    {
        await EnsureCanViewAsync(userId, condominiumId);

        var start = ParseMonth(month);
        var managedBuildingIds = await _permissionService.GetManagedBuildingIdsAsync(userId, condominiumId);
        var condominium = await _context.Condominiums
            .AsNoTracking()
            .Where(c => c.Id == condominiumId)
            .Select(c => new { c.BillingDueDay, c.InvoiceAutoSendDaysBefore })
            .FirstAsync();

        var query = BillsQuery()
            .Where(charge =>
                charge.CondominiumId == condominiumId &&
                charge.ReferenceMonth == start &&
                charge.Status != ChargeStatus.Canceled &&
                // The owner's rent is private to the owner (#201).
                charge.ReceiverPersonId == null);

        if (managedBuildingIds is not null)
            query = query.Where(charge => managedBuildingIds.Contains(charge.Unit!.BuildingId));

        var bills = await query.ToListAsync();

        return new InvoiceMonthDto
        {
            CondominiumId = condominiumId,
            Month = start.ToString("yyyy-MM", CultureInfo.InvariantCulture),
            DefaultDueDate = ChargeLateFees.DueDateIn(start.Year, start.Month, condominium.BillingDueDay),
            AutoSendDaysBefore = condominium.InvoiceAutoSendDaysBefore,
            Invoices = bills
                .OrderBy(bill => bill.Unit!.Building.Name)
                .ThenBy(bill => bill.Unit!.Number)
                .ThenBy(bill => bill.Id)
                .Select(ToResponse)
                .ToList()
        };
    }

    public async Task<InvoiceResponseDto> AddItemAsync(int userId, int condominiumId, AddInvoiceItemDto dto)
    {
        await EnsureCanEditAsync(userId, condominiumId);
        await EnsureUnitManagedAsync(userId, condominiumId, dto.UnitId);
        await _chargeService.EnsureRecipientLinkedAsync(dto.RecipientPersonId, dto.UnitId);

        var (chargeId, _) = await AddItemToDraftAsync(new InvoiceItemRequest(
            condominiumId,
            dto.UnitId,
            dto.RecipientPersonId,
            ParseMonth(dto.Month),
            dto.Category,
            dto.Description,
            dto.Amount,
            userId));

        return await GetResponseAsync(chargeId);
    }

    public async Task<LaunchChargeResultDto> LaunchAsync(int userId, int condominiumId, LaunchChargeDto dto)
    {
        await EnsureCanEditAsync(userId, condominiumId);

        var month = ParseMonth(dto.Month);
        var unitIds = dto.Units.Select(row => row.UnitId).Distinct().ToList();

        if (unitIds.Count == 0 || unitIds.Count != dto.Units.Count)
            throw new BadRequestException("Escolha as unidades (cada uma uma vez só).");

        foreach (var unitId in unitIds)
            await EnsureUnitManagedAsync(userId, condominiumId, unitId);

        // One person of the unit pays (e.g. the tenant's rent): only for a single unit.
        if (dto.RecipientPersonId.HasValue)
        {
            if (unitIds.Count != 1)
                throw new BadRequestException("Para cobrar de uma pessoa, escolha uma unidade só.");

            await _chargeService.EnsureRecipientLinkedAsync(dto.RecipientPersonId, unitIds[0]);
        }

        var units = await _context.Units
            .AsNoTracking()
            .Where(unit => unitIds.Contains(unit.Id))
            .Select(unit => new { unit.Id, Label = unit.Building.Name + " · " + unit.Number, HasPeople = _context.PersonUnits.Any(link => link.UnitId == unit.Id) })
            .ToDictionaryAsync(unit => unit.Id);

        var result = new LaunchChargeResultDto();

        foreach (var row in dto.Units)
        {
            if (!units[row.UnitId].HasPeople)
            {
                result.Skipped.Add(units[row.UnitId].Label);
                continue;
            }

            await AddItemToDraftAsync(new InvoiceItemRequest(condominiumId, row.UnitId, dto.RecipientPersonId, month, dto.Category, dto.Description, row.Amount, userId));
            result.CreatedCount++;
            result.Total += Math.Round(row.Amount, 2);
        }

        return result;
    }

    public async Task<InvoiceItemResult> AddItemToDraftAsync(InvoiceItemRequest request)
    {
        var (category, description, amount) = ValidateItem(request.Category, request.Description, request.Amount);

        // A condominium item of a unit whose tenant pays the condominium goes in the tenant's bill,
        // together with the rent when the condominium also receives it: one bill, one Pix (#208).
        if (request.RecipientPersonId is null && request.ReceiverPersonId is null)
        {
            var tenants = await UnitPayers.TenantsWhoPayAsync(_context, [request.UnitId]);
            if (tenants.TryGetValue(request.UnitId, out var tenant) && request.Month >= new DateOnly(tenant.From.Year, tenant.From.Month, 1))
                request = request with { RecipientPersonId = tenant.PersonId };
        }

        var unitBelongs = await _context.Units
            .AnyAsync(unit => unit.Id == request.UnitId && unit.Building.CondominiumId == request.CondominiumId);

        if (!unitBelongs)
            throw new BadRequestException("A unidade não é deste condomínio.");

        // One draft per unit, payer and month; a bill already sent is left alone (a new draft starts).
        var draft = await _context.Charges
            .Include(charge => charge.Items)
            .FirstOrDefaultAsync(charge =>
                charge.CondominiumId == request.CondominiumId &&
                charge.UnitId == request.UnitId &&
                charge.RecipientPersonId == request.RecipientPersonId &&
                // A bill never mixes receivers.
                charge.ReceiverPersonId == request.ReceiverPersonId &&
                charge.Category == ChargeCategory.MonthlyBill &&
                charge.Status == ChargeStatus.Draft &&
                charge.ReferenceMonth == request.Month);

        if (draft is null)
        {
            var dueDay = await _context.Condominiums
                .Where(c => c.Id == request.CondominiumId)
                .Select(c => c.BillingDueDay)
                .FirstAsync();

            draft = new Charge
            {
                Scope = ChargeScope.Condominium,
                CondominiumId = request.CondominiumId,
                UnitId = request.UnitId,
                RecipientPersonId = request.RecipientPersonId,
                ReceiverPersonId = request.ReceiverPersonId,
                Category = ChargeCategory.MonthlyBill,
                Status = ChargeStatus.Draft,
                ReferenceMonth = request.Month,
                Description = BillDescription(request.Month),
                DueDate = DateTime.SpecifyKind(
                    (request.DueDate ?? ChargeLateFees.DueDateIn(request.Month.Year, request.Month.Month, dueDay)).Date,
                    DateTimeKind.Unspecified),
                CreatedByUserId = request.CreatedByUserId,
                CreatedAt = DateTime.UtcNow
            };

            _context.Charges.Add(draft);
        }

        var item = new ChargeItem
        {
            Category = category,
            Description = description,
            Amount = amount,
            RecurringChargeId = request.RecurringChargeId,
            CreatedByUserId = request.CreatedByUserId,
            CreatedAt = DateTime.UtcNow
        };

        draft.Items.Add(item);
        draft.Value = draft.Items.Sum(row => row.Amount);

        await _context.SaveChangesAsync();

        return new InvoiceItemResult(draft.Id, item.Id);
    }

    public async Task<bool> RemoveDraftItemAsync(int itemId)
    {
        var item = await _context.ChargeItems
            .Include(row => row.Charge).ThenInclude(charge => charge.Items)
            .FirstOrDefaultAsync(row => row.Id == itemId);

        // Already gone (e.g. removed by hand in Contas do mês): nothing to undo.
        if (item is null)
            return true;

        if (item.Charge.Status != ChargeStatus.Draft)
            return false;

        var charge = item.Charge;
        charge.Items.Remove(item);
        _context.ChargeItems.Remove(item);

        if (charge.Items.Count == 0)
            _context.Charges.Remove(charge);
        else
            charge.Value = charge.Items.Sum(row => row.Amount);

        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<InvoiceResponseDto> UpdateItemAsync(int userId, int itemId, UpdateInvoiceItemDto dto)
    {
        var item = await _context.ChargeItems
            .Include(row => row.Charge).ThenInclude(charge => charge.Items)
            .FirstOrDefaultAsync(row => row.Id == itemId)
            ?? throw new NotFoundException("Item não encontrado.");

        await EnsureCanEditDraftAsync(userId, item.Charge);

        (item.Category, item.Description, item.Amount) = ValidateItem(dto.Category, dto.Description, dto.Amount);
        item.Charge.Value = item.Charge.Items.Sum(row => row.Amount);

        await _context.SaveChangesAsync();

        return await GetResponseAsync(item.ChargeId);
    }

    public async Task DeleteItemAsync(int userId, int itemId)
    {
        var item = await _context.ChargeItems
            .Include(row => row.Charge).ThenInclude(charge => charge.Items)
            .FirstOrDefaultAsync(row => row.Id == itemId)
            ?? throw new NotFoundException("Item não encontrado.");

        await EnsureCanEditDraftAsync(userId, item.Charge);

        var charge = item.Charge;
        charge.Items.Remove(item);
        _context.ChargeItems.Remove(item);

        // A draft without items is not a bill anymore.
        if (charge.Items.Count == 0)
            _context.Charges.Remove(charge);
        else
            charge.Value = charge.Items.Sum(row => row.Amount);

        await _context.SaveChangesAsync();
    }

    public async Task<InvoiceResponseDto> UpdateAsync(int userId, int chargeId, UpdateInvoiceDto dto)
    {
        var charge = await _context.Charges.FirstOrDefaultAsync(row => row.Id == chargeId && row.Category == ChargeCategory.MonthlyBill)
            ?? throw new NotFoundException("Conta não encontrada.");

        await EnsureCanEditDraftAsync(userId, charge);

        var dueDate = dto.DueDate.Date;

        if (dueDate < AppTimeZone.Today)
            throw new BadRequestException("O vencimento não pode ser uma data que já passou.");

        charge.DueDate = DateTime.SpecifyKind(dueDate, DateTimeKind.Unspecified);
        await _context.SaveChangesAsync();

        return await GetResponseAsync(charge.Id);
    }

    public async Task DeleteDraftAsync(int userId, int chargeId)
    {
        var charge = await _context.Charges.FirstOrDefaultAsync(row => row.Id == chargeId && row.Category == ChargeCategory.MonthlyBill)
            ?? throw new NotFoundException("Conta não encontrada.");

        await EnsureCanEditDraftAsync(userId, charge);

        _context.Charges.Remove(charge);
        await _context.SaveChangesAsync();
    }

    public async Task<SendInvoicesResultDto> SendAsync(int userId, int condominiumId, SendInvoicesDto dto)
    {
        await EnsureCanEditAsync(userId, condominiumId);
        await _chargeService.EnsureCondominiumPaymentMethodAsync(condominiumId);

        var start = ParseMonth(dto.Month);
        var managedBuildingIds = await _permissionService.GetManagedBuildingIdsAsync(userId, condominiumId);

        var query = _context.Charges
            .Include(charge => charge.Unit)
            .Where(charge =>
                charge.CondominiumId == condominiumId &&
                charge.Category == ChargeCategory.MonthlyBill &&
                charge.Status == ChargeStatus.Draft &&
                charge.ReferenceMonth == start &&
                charge.ReceiverPersonId == null);

        if (dto.ChargeIds is { Count: > 0 })
            query = query.Where(charge => dto.ChargeIds.Contains(charge.Id));

        if (managedBuildingIds is not null)
            query = query.Where(charge => managedBuildingIds.Contains(charge.Unit!.BuildingId));

        var drafts = await query.ToListAsync();

        if (drafts.Count == 0)
            throw new BadRequestException("Não há contas em rascunho para enviar neste mês.");

        // A bill would reach the payer already late: the management picks a new due date first.
        var pastDue = drafts.Count(charge => ChargeService.IsPastDueDate(charge.DueDate));

        if (pastDue > 0)
            throw new BadRequestException(pastDue == 1
                ? "1 conta tem vencimento que já passou. Mude o vencimento antes de enviar."
                : $"{pastDue} contas têm vencimento que já passou. Mude o vencimento antes de enviar.");

        return new SendInvoicesResultDto { Sent = await SendDraftsAsync(condominiumId, drafts) };
    }

    public async Task SendDueDraftsAsync(CancellationToken cancellationToken)
    {
        var today = AppTimeZone.Today;

        var drafts = await _context.Charges
            .Include(charge => charge.Condominium)
            .Where(charge =>
                charge.Category == ChargeCategory.MonthlyBill &&
                charge.Status == ChargeStatus.Draft &&
                charge.ReceiverPersonId == null &&
                charge.Condominium.Status == Status.Active &&
                charge.Condominium.InvoiceAutoSendDaysBefore != null)
            .ToListAsync(cancellationToken);

        // Past-due drafts wait for a new due date (they would reach the payer already late).
        var due = drafts
            .Where(charge =>
                charge.DueDate.Date >= today &&
                charge.DueDate.Date.AddDays(-charge.Condominium.InvoiceAutoSendDaysBefore!.Value) <= today)
            .ToList();

        foreach (var condominium in due.GroupBy(charge => charge.CondominiumId))
        {
            try
            {
                await _chargeService.EnsureCondominiumPaymentMethodAsync(condominium.Key);
                var sent = await SendDraftsAsync(condominium.Key, condominium.ToList());
                _logger.LogInformation("Sent {Count} monthly bill(s) of condominium {CondominiumId}.", sent, condominium.Key);
            }
            catch (BadRequestException exception)
            {
                // No way to receive yet: the drafts wait (the management sees them in Contas do mês).
                _logger.LogWarning("Monthly bills of condominium {CondominiumId} not sent: {Reason}", condominium.Key, exception.Message);
            }
        }

        await SendDueOwnerDraftsAsync(today, cancellationToken);
    }

    // The owner's rent has nothing to review: it goes out OwnerSendDaysBefore days before it is due,
    // once the owner has a connected Mercado Pago account (no fine or interest: decided in #201).
    private async Task SendDueOwnerDraftsAsync(DateTime today, CancellationToken cancellationToken)
    {
        var connectedOwners = await _context.MercadoPagoAccounts
            .AsNoTracking()
            .Where(account => account.OwnerPersonId != null && account.AccessToken != string.Empty)
            .Select(account => account.OwnerPersonId!.Value)
            .ToListAsync(cancellationToken);

        var limit = today.AddDays(OwnerSendDaysBefore);
        var drafts = await _context.Charges
            .Where(charge =>
                charge.Category == ChargeCategory.MonthlyBill &&
                charge.Status == ChargeStatus.Draft &&
                charge.ReceiverPersonId != null &&
                connectedOwners.Contains(charge.ReceiverPersonId.Value) &&
                charge.Condominium.Status == Status.Active &&
                charge.DueDate >= today &&
                charge.DueDate <= limit)
            .ToListAsync(cancellationToken);

        var sendable = drafts.Where(charge => charge.Value > 0).ToList();

        foreach (var charge in sendable)
        {
            charge.Status = ChargeStatus.Pending;
            charge.SentAt = DateTime.UtcNow;
            charge.FinePercent = null;
            charge.MonthlyInterestPercent = null;
        }

        await _context.SaveChangesAsync(cancellationToken);

        foreach (var charge in sendable)
            await _chargeService.NotifyNewChargeAsync(charge);

        if (sendable.Count > 0)
            _logger.LogInformation("Sent {Count} owner rent bill(s).", sendable.Count);
    }

    private async Task<int> SendDraftsAsync(int condominiumId, IReadOnlyCollection<Charge> drafts)
    {
        // Fine and interest follow the rule in force when the bill is sent (same as a new charge).
        var (finePercent, monthlyInterestPercent) = await _chargeService.GetLateFeeRuleAsync(condominiumId);
        var sendable = drafts.Where(charge => charge.Value > 0).ToList();

        foreach (var charge in sendable)
        {
            charge.Status = ChargeStatus.Pending;
            charge.SentAt = DateTime.UtcNow;
            charge.FinePercent = finePercent;
            charge.MonthlyInterestPercent = monthlyInterestPercent;
        }

        await _context.SaveChangesAsync();

        foreach (var charge in sendable)
            await _chargeService.NotifyNewChargeAsync(charge);

        return sendable.Count;
    }

    private IQueryable<Charge> BillsQuery()
    {
        return _context.Charges
            .AsNoTracking()
            .Where(charge => charge.Scope == ChargeScope.Condominium && charge.Category == ChargeCategory.MonthlyBill)
            .Include(charge => charge.Items)
            .Include(charge => charge.RecipientPerson)
            .Include(charge => charge.Unit!).ThenInclude(unit => unit.Building);
    }

    private async Task<InvoiceResponseDto> GetResponseAsync(int chargeId)
    {
        var charge = await BillsQuery().FirstOrDefaultAsync(row => row.Id == chargeId)
            ?? throw new NotFoundException("Conta não encontrada.");

        return ToResponse(charge);
    }

    private static InvoiceResponseDto ToResponse(Charge charge) => new()
    {
        ChargeId = charge.Id,
        UnitId = charge.UnitId ?? 0,
        UnitNumber = charge.Unit?.Number ?? string.Empty,
        BuildingName = charge.Unit?.Building.Name ?? string.Empty,
        RecipientPersonId = charge.RecipientPersonId,
        RecipientName = charge.RecipientPerson?.Name,
        // A sent bill past its due date reads as late even before the hourly job runs.
        Status = charge.Status == ChargeStatus.Pending && ChargeService.IsPastDueDate(charge.DueDate) ? ChargeStatus.Overdue : charge.Status,
        DueDate = charge.DueDate,
        Value = charge.Value,
        SentAt = charge.SentAt,
        Items = charge.Items
            .OrderBy(item => item.Id)
            .Select(item => new ChargeItemDto { Id = item.Id, Category = item.Category, Description = item.Description, Amount = item.Amount })
            .ToList()
    };

    private static (ChargeCategory Category, string Description, decimal Amount) ValidateItem(ChargeCategory category, string? description, decimal amount)
    {
        if (!Enum.IsDefined(category) || NotAllowedItemCategories.Contains(category))
            throw new BadRequestException("Escolha o que é este item (aluguel, água, luz, gás, taxa, rateio, multa ou outros).");

        var text = description?.Trim() ?? string.Empty;

        if (text.Length == 0)
            throw new BadRequestException("Descreva o item.");

        if (text.Length > 150)
            throw new BadRequestException("A descrição do item pode ter até 150 caracteres.");

        if (amount <= 0 || amount > 1_000_000)
            throw new BadRequestException("Informe um valor maior que zero.");

        return (category, text, Math.Round(amount, 2));
    }

    // Same access as the charges list: Admin, or a syndic with finance access.
    private async Task EnsureCanViewAsync(int userId, int condominiumId)
    {
        var role = await _permissionService.GetCondominiumRoleAsync(userId, condominiumId);

        if (role == AppRoles.Admin)
            return;

        if (role != AppRoles.Syndic)
            throw new ForbiddenException("Você não tem acesso às contas deste condomínio.");

        await _permissionService.EnsureAnyCondominiumPermissionAsync(userId, condominiumId, AppPermissions.FinanceAccess);
    }

    private Task EnsureCanEditAsync(int userId, int condominiumId) =>
        _permissionService.EnsureCondominiumPermissionAsync(userId, condominiumId, AppPermissions.ChargesCreate);

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

    private async Task EnsureCanEditDraftAsync(int userId, Charge charge)
    {
        if (charge.ReceiverPersonId.HasValue)
            throw new NotFoundException("Conta não encontrada.");

        await EnsureCanEditAsync(userId, charge.CondominiumId);

        if (charge.UnitId.HasValue)
            await EnsureUnitManagedAsync(userId, charge.CondominiumId, charge.UnitId.Value);

        if (charge.Status != ChargeStatus.Draft)
            throw new BadRequestException("Esta conta já foi enviada e não pode mais ser alterada. Cancele-a em A receber, se precisar.");
    }

    private static string BillDescription(DateOnly month) =>
        $"Conta de {month.ToString("MMMM/yyyy", PtBr)}";

    private static DateOnly ParseMonth(string? month)
    {
        if (string.IsNullOrWhiteSpace(month))
        {
            var today = AppTimeZone.Today;
            return new DateOnly(today.Year, today.Month, 1);
        }

        if (DateOnly.TryParseExact(month.Trim(), ["yyyy-MM", "yyyy-MM-dd"], CultureInfo.InvariantCulture, DateTimeStyles.None, out var parsed) &&
            parsed.Year >= 2000 && parsed.Year <= 2100)
            return new DateOnly(parsed.Year, parsed.Month, 1);

        throw new BadRequestException("Informe o mês no formato AAAA-MM.");
    }
}
