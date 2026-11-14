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
                charge.Status != ChargeStatus.Canceled);

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

        var chargeId = await AddItemToDraftAsync(new InvoiceItemRequest(
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

    public async Task<int> AddItemToDraftAsync(InvoiceItemRequest request)
    {
        var (category, description, amount) = ValidateItem(request.Category, request.Description, request.Amount);

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

        draft.Items.Add(new ChargeItem
        {
            Category = category,
            Description = description,
            Amount = amount,
            CreatedByUserId = request.CreatedByUserId,
            CreatedAt = DateTime.UtcNow
        });
        draft.Value = draft.Items.Sum(item => item.Amount);

        await _context.SaveChangesAsync();

        return draft.Id;
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
                charge.ReferenceMonth == start);

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
