using System.Globalization;
using backend.Constants;
using backend.Data;
using backend.DTOs.Agreement;
using backend.Enums;
using backend.Exceptions;
using backend.Models;
using backend.Services.Charges;
using backend.Services.Email;
using backend.Services.MercadoPago;
using backend.Services.Notifications;
using backend.Services.Permissions;
using Microsoft.EntityFrameworkCore;

namespace backend.Services.Agreements;

public class AgreementService : IAgreementService
{
    public const int DefaultBreakAfterDaysLate = 30;
    private const string BrokenReason = "Acordo quebrado por atraso de parcela.";
    private const string CanceledReason = "Acordo cancelado pela gestão.";

    private static readonly CultureInfo PtBr = CultureInfo.GetCultureInfo("pt-BR");

    private readonly AppDbContext _context;
    private readonly IPermissionService _permissionService;
    private readonly IChargeService _chargeService;
    private readonly IMercadoPagoService _mercadoPagoService;
    private readonly INotificationService _notificationService;
    private readonly IChargeEmailNotifier _chargeEmailNotifier;
    private readonly ILogger<AgreementService> _logger;

    public AgreementService(
        AppDbContext context,
        IPermissionService permissionService,
        IChargeService chargeService,
        IMercadoPagoService mercadoPagoService,
        INotificationService notificationService,
        IChargeEmailNotifier chargeEmailNotifier,
        ILogger<AgreementService> logger)
    {
        _context = context;
        _permissionService = permissionService;
        _chargeService = chargeService;
        _mercadoPagoService = mercadoPagoService;
        _notificationService = notificationService;
        _chargeEmailNotifier = chargeEmailNotifier;
        _logger = logger;
    }

    public async Task<IEnumerable<AgreementResponseDto>> GetByCondominiumAsync(int userId, int condominiumId)
    {
        // Same access as the condominium's charge list: Admin, or a syndic with finance access.
        var role = await _permissionService.GetCondominiumRoleAsync(userId, condominiumId);

        if (role != AppRoles.Admin && role != AppRoles.Syndic)
            throw new ForbiddenException("Você não tem acesso aos acordos deste condomínio.");

        if (role == AppRoles.Syndic)
            await _permissionService.EnsureAnyCondominiumPermissionAsync(userId, condominiumId, AppPermissions.FinanceAccess);

        var managedBuildingIds = await _permissionService.GetManagedBuildingIdsAsync(userId, condominiumId);

        var query = BuildQuery().Where(a => a.CondominiumId == condominiumId);

        if (managedBuildingIds is not null)
            query = query.Where(a => managedBuildingIds.Contains(a.Unit.BuildingId));

        var agreements = await query.OrderByDescending(a => a.CreatedAt).ToListAsync();

        return agreements.Select(MapResponse);
    }

    public async Task<IEnumerable<AgreementResponseDto>> GetMineAsync(int userId)
    {
        var personId = await _context.Users
            .AsNoTracking()
            .Where(user => user.Id == userId)
            .Select(user => (int?)user.PersonId)
            .FirstOrDefaultAsync()
            ?? throw new NotFoundException("Usuário não encontrado.");

        var unitIds = await _context.PersonUnits
            .AsNoTracking()
            .Where(pu => pu.PersonId == personId)
            .Select(pu => pu.UnitId)
            .Distinct()
            .ToListAsync();

        // Same rule as the charges: an agreement addressed to one person is only theirs.
        var agreements = await BuildQuery()
            .Where(a =>
                unitIds.Contains(a.UnitId) &&
                (a.RecipientPersonId == null || a.RecipientPersonId == personId) &&
                a.Condominium.Status == Status.Active)
            .OrderByDescending(a => a.CreatedAt)
            .ToListAsync();

        return agreements.Select(MapResponse);
    }

    public async Task<AgreementResponseDto> GetByIdAsync(int userId, int id)
    {
        var agreement = await BuildQuery().FirstOrDefaultAsync(a => a.Id == id)
            ?? throw new NotFoundException("Acordo não encontrado.");

        // Whoever may read the installments (payers, Admin, syndic with finance access) reads the agreement.
        await _permissionService.EnsureCanReadCondominiumChargeAsync(userId, AsCharge(agreement));

        return MapResponse(agreement);
    }

    public async Task<AgreementResponseDto> CreateAsync(int userId, int condominiumId, CreateAgreementDto dto)
    {
        await EnsureCanManageAsync(userId, condominiumId, dto.UnitId);

        var unitBelongs = await _context.Units
            .AsNoTracking()
            .AnyAsync(u => u.Id == dto.UnitId && u.Building.CondominiumId == condominiumId);

        if (!unitBelongs)
            throw new BadRequestException("Esta unidade não pertence a este condomínio.");

        await _chargeService.EnsureRecipientLinkedAsync(dto.RecipientPersonId, dto.UnitId);
        await _chargeService.EnsureCondominiumPaymentMethodAsync(condominiumId);

        var chargeIds = dto.ChargeIds.Distinct().ToList();

        if (chargeIds.Count == 0)
            throw new BadRequestException("Escolha ao menos uma cobrança atrasada.");

        var today = AppTimeZone.Today;

        var charges = await _context.Charges
            .Where(c => chargeIds.Contains(c.Id))
            .OrderBy(c => c.DueDate)
            .ToListAsync();

        if (charges.Count != chargeIds.Count)
            throw new BadRequestException("Uma das cobranças escolhidas não foi encontrada.");

        foreach (var charge in charges)
        {
            if (charge.Scope != ChargeScope.Condominium || charge.CondominiumId != condominiumId || charge.UnitId != dto.UnitId)
                throw new BadRequestException("Todas as cobranças do acordo precisam ser da mesma unidade.");

            if (charge.AgreementId.HasValue)
                throw new BadRequestException($"A cobrança \"{charge.Description}\" já é parcela de um acordo.");

            if (charge.Status == ChargeStatus.Renegotiated)
                throw new BadRequestException($"A cobrança \"{charge.Description}\" já está num acordo ativo.");

            var isOverdue = charge.Status == ChargeStatus.Overdue ||
                            (charge.Status == ChargeStatus.Pending && charge.DueDate.Date < today);

            if (!isOverdue)
                throw new BadRequestException($"A cobrança \"{charge.Description}\" não está atrasada. Só cobranças atrasadas entram no acordo.");
        }

        var hasPendingProof = await _context.PaymentProofs
            .AsNoTracking()
            .AnyAsync(proof => chargeIds.Contains(proof.ChargeId) && proof.Status == PaymentProofStatus.Pending);

        if (hasPendingProof)
            throw new BadRequestException("Uma das cobranças tem comprovante de Pix aguardando análise. Analise o comprovante antes de fazer o acordo.");

        // Amounts as of today, with each charge's own fine/interest rule.
        var amounts = charges.ToDictionary(c => c.Id, c => ChargeLateFees.Calculate(c, today));
        var originalAmount = charges.Sum(c => c.Value);
        var fineAmount = amounts.Values.Sum(a => a.Fine);
        var interestAmount = amounts.Values.Sum(a => a.Interest);
        var discountAmount = CalculateDiscount(dto.DiscountType, dto.DiscountValue, fineAmount + interestAmount);
        var totalAmount = originalAmount + fineAmount + interestAmount - discountAmount;

        var downPayment = dto.DownPayment is > 0 ? Round(dto.DownPayment.Value) : (decimal?)null;
        var firstDueDate = dto.FirstInstallmentDueDate.Date;
        DateTime? downPaymentDueDate = null;

        if (firstDueDate < today)
            throw new BadRequestException("A primeira parcela não pode vencer numa data passada.");

        if (downPayment.HasValue)
        {
            if (downPayment.Value >= totalAmount)
                throw new BadRequestException("A entrada precisa ser menor que o total do acordo.");

            downPaymentDueDate = (dto.DownPaymentDueDate ?? today).Date;

            if (downPaymentDueDate < today)
                throw new BadRequestException("A entrada não pode vencer numa data passada.");

            if (firstDueDate <= downPaymentDueDate)
                throw new BadRequestException("A primeira parcela precisa vencer depois da entrada.");
        }

        var installmentValues = SplitInstallments(totalAmount - (downPayment ?? 0m), dto.InstallmentCount);

        if (installmentValues[0] <= 0)
            throw new BadRequestException("O valor das parcelas precisa ser maior que zero.");

        var (finePercent, monthlyInterestPercent) = await _chargeService.GetLateFeeRuleAsync(condominiumId);
        var dueDay = firstDueDate.Day;

        var agreement = new Agreement
        {
            CondominiumId = condominiumId,
            UnitId = dto.UnitId,
            RecipientPersonId = dto.RecipientPersonId,
            CreatedByUserId = userId,
            Status = AgreementStatus.Active,
            OriginalAmount = originalAmount,
            FineAmount = fineAmount,
            InterestAmount = interestAmount,
            DiscountType = discountAmount > 0 ? dto.DiscountType : AgreementDiscountType.None,
            DiscountValue = discountAmount > 0 ? dto.DiscountValue : 0m,
            DiscountAmount = discountAmount,
            TotalAmount = totalAmount,
            DownPayment = downPayment,
            InstallmentCount = dto.InstallmentCount,
            InstallmentDueDay = dueDay,
            BreakAfterDaysLate = dto.BreakAfterDaysLate,
            Notes = string.IsNullOrWhiteSpace(dto.Notes) ? null : dto.Notes.Trim(),
            CreatedAt = DateTime.UtcNow
        };

        foreach (var charge in charges)
        {
            agreement.OriginalCharges.Add(new AgreementCharge
            {
                ChargeId = charge.Id,
                Value = charge.Value,
                FineAmount = amounts[charge.Id].Fine,
                InterestAmount = amounts[charge.Id].Interest
            });

            // Out of the delinquency, with no more fine/interest or reminders while the agreement lasts.
            charge.Status = ChargeStatus.Renegotiated;
        }

        Charge NewInstallment(int number, decimal value, DateTime dueDate, string description) => new()
        {
            Scope = ChargeScope.Condominium,
            CondominiumId = condominiumId,
            UnitId = dto.UnitId,
            RecipientPersonId = dto.RecipientPersonId,
            Category = ChargeCategory.Agreement,
            Value = value,
            DueDate = DateTime.SpecifyKind(dueDate.Date, DateTimeKind.Unspecified),
            Description = description,
            CreatedByUserId = userId,
            Status = ChargeStatus.Pending,
            CreatedAt = DateTime.UtcNow,
            FinePercent = finePercent,
            MonthlyInterestPercent = monthlyInterestPercent,
            AgreementInstallmentNumber = number
        };

        if (downPayment.HasValue)
            agreement.Installments.Add(NewInstallment(0, downPayment.Value, downPaymentDueDate!.Value, "Acordo · entrada"));

        for (var number = 1; number <= dto.InstallmentCount; number++)
        {
            var month = firstDueDate.AddMonths(number - 1);
            agreement.Installments.Add(NewInstallment(
                number,
                installmentValues[number - 1],
                ChargeLateFees.DueDateIn(month.Year, month.Month, dueDay),
                $"Acordo · parcela {number} de {dto.InstallmentCount}"));
        }

        _context.Agreements.Add(agreement);
        await _context.SaveChangesAsync();

        // A Pix/boleto generated for an original charge must not stay payable.
        foreach (var charge in charges)
            await _mercadoPagoService.CancelOpenPaymentAsync(charge.Id);

        var parts = downPayment.HasValue
            ? $"entrada de {downPayment.Value.ToString("C", PtBr)} e {dto.InstallmentCount}x"
            : $"{dto.InstallmentCount}x";

        await NotifyPayersAsync(
            agreement,
            "Acordo criado",
            $"Foi feito um acordo de {totalAmount.ToString("C", PtBr)} para sua unidade ({parts}). " +
            "As parcelas já estão em Boletos.");

        return await GetResponseOrThrowAsync(agreement.Id);
    }

    public async Task<AgreementResponseDto> CancelAsync(int userId, int id, CancelAgreementDto dto)
    {
        var agreement = await _context.Agreements
            .Include(a => a.Installments)
            .Include(a => a.OriginalCharges).ThenInclude(link => link.Charge)
            .FirstOrDefaultAsync(a => a.Id == id)
            ?? throw new NotFoundException("Acordo não encontrado.");

        await EnsureCanManageAsync(userId, agreement.CondominiumId, agreement.UnitId);

        if (agreement.Status != AgreementStatus.Active)
            throw new BadRequestException("Só acordos ativos podem ser cancelados.");

        var reason = string.IsNullOrWhiteSpace(dto.Reason) ? CanceledReason : dto.Reason.Trim();
        await EndAsync(agreement, AgreementStatus.Canceled, reason);

        return await GetResponseOrThrowAsync(agreement.Id);
    }

    public async Task UpdateAgreementsAsync(CancellationToken cancellationToken)
    {
        var today = AppTimeZone.Today;

        // Safety net for the payment paths, which already complete the agreement right away.
        var paidIds = await _context.Agreements
            .AsNoTracking()
            .Where(a =>
                a.Status == AgreementStatus.Active &&
                a.Installments.Any() &&
                a.Installments.All(c => c.Status == ChargeStatus.Paid))
            .Select(a => a.Id)
            .ToListAsync(cancellationToken);

        foreach (var paidId in paidIds)
            await AgreementProgress.SyncAsync(_context, paidId);

        // Candidates: an open installment past due; the exact limit is per agreement.
        var candidates = await _context.Agreements
            .Include(a => a.Installments)
            .Include(a => a.OriginalCharges).ThenInclude(link => link.Charge)
            .Where(a =>
                a.Status == AgreementStatus.Active &&
                a.Condominium.Status == Status.Active &&
                a.Installments.Any(c =>
                    (c.Status == ChargeStatus.Pending || c.Status == ChargeStatus.Overdue) &&
                    c.DueDate < today))
            .ToListAsync(cancellationToken);

        var broken = 0;

        foreach (var agreement in candidates)
        {
            var tooLate = agreement.Installments.Any(c =>
                (c.Status == ChargeStatus.Pending || c.Status == ChargeStatus.Overdue) &&
                (today - c.DueDate.Date).Days > agreement.BreakAfterDaysLate);

            if (!tooLate)
                continue;

            await EndAsync(agreement, AgreementStatus.Broken, BrokenReason);
            broken++;
        }

        if (paidIds.Count + broken > 0)
            _logger.LogInformation("Agreements: {Completed} completed, {Broken} broken.", paidIds.Count, broken);
    }

    // Broken or canceled: the open installments are canceled and the original charges come back
    // as they were (overdue, with fine/interest counted again from their original due dates).
    // Paid installments stay paid.
    private async Task EndAsync(Agreement agreement, AgreementStatus status, string reason)
    {
        var today = AppTimeZone.Today;
        var canceledInstallmentIds = new List<int>();

        foreach (var installment in agreement.Installments.Where(c =>
                     c.Status is ChargeStatus.Pending or ChargeStatus.Overdue))
        {
            installment.Status = ChargeStatus.Canceled;
            installment.CanceledAt = DateTime.UtcNow;
            installment.CancelReason = reason;
            canceledInstallmentIds.Add(installment.Id);
        }

        foreach (var link in agreement.OriginalCharges.Where(link => link.Charge.Status == ChargeStatus.Renegotiated))
        {
            link.Charge.Status = link.Charge.DueDate.Date < today ? ChargeStatus.Overdue : ChargeStatus.Pending;
        }

        agreement.Status = status;
        agreement.EndedAt = DateTime.UtcNow;
        agreement.EndReason = reason;

        await _context.SaveChangesAsync();

        foreach (var installmentId in canceledInstallmentIds)
            await _mercadoPagoService.CancelOpenPaymentAsync(installmentId);

        var message = status == AgreementStatus.Broken
            ? $"Uma parcela do acordo ficou mais de {agreement.BreakAfterDaysLate} dias em atraso e o acordo foi quebrado. " +
              "As cobranças originais voltaram, com multa e juros."
            : "O acordo da sua unidade foi cancelado e as cobranças originais voltaram, com multa e juros.";

        await NotifyPayersAsync(agreement, status == AgreementStatus.Broken ? "Acordo quebrado" : "Acordo cancelado", message);
    }

    private async Task EnsureCanManageAsync(int userId, int condominiumId, int unitId)
    {
        if (await _permissionService.IsMasterAsync(userId))
            throw new ForbiddenException("O Master não faz acordos de condomínio.");

        await _permissionService.EnsureCondominiumPermissionAsync(userId, condominiumId, AppPermissions.ChargesCreate);

        if (await _permissionService.GetCondominiumRoleAsync(userId, condominiumId) == AppRoles.Syndic)
            await _permissionService.EnsureUnitAccessAsync(userId, unitId);
    }

    private async Task NotifyPayersAsync(Agreement agreement, string title, string message)
    {
        var userIds = await _chargeEmailNotifier.GetPayerUserIdsAsync(AsCharge(agreement));

        await _notificationService.CreateManyAsync(
            userIds,
            NotificationType.Charge,
            title,
            message,
            "/resident/bills",
            agreement.CondominiumId);
    }

    // The agreement seen as one of its installments, for the shared payer/reader checks.
    private static Charge AsCharge(Agreement agreement) => new()
    {
        Scope = ChargeScope.Condominium,
        CondominiumId = agreement.CondominiumId,
        UnitId = agreement.UnitId,
        RecipientPersonId = agreement.RecipientPersonId
    };

    public static decimal CalculateDiscount(AgreementDiscountType type, decimal value, decimal lateFees)
    {
        if (value < 0)
            throw new BadRequestException("O desconto não pode ser negativo.");

        return type switch
        {
            AgreementDiscountType.Percent when value > 100 =>
                throw new BadRequestException("O desconto precisa ficar entre 0% e 100%."),
            AgreementDiscountType.Percent => Round(lateFees * value / 100m),
            AgreementDiscountType.Amount when value > lateFees =>
                throw new BadRequestException("O desconto não pode passar do valor da multa e dos juros."),
            AgreementDiscountType.Amount => Round(value),
            _ => 0m
        };
    }

    // Equal installments rounded down to the cent; the last one takes the remainder.
    public static List<decimal> SplitInstallments(decimal amount, int count)
    {
        var each = Math.Floor(amount / count * 100m) / 100m;
        var values = Enumerable.Repeat(each, count).ToList();
        values[^1] = amount - each * (count - 1);
        return values;
    }

    private IQueryable<Agreement> BuildQuery()
    {
        return _context.Agreements
            .AsNoTracking()
            .Include(a => a.Unit).ThenInclude(u => u.Building)
            .Include(a => a.RecipientPerson)
            .Include(a => a.Installments)
            .Include(a => a.OriginalCharges).ThenInclude(link => link.Charge)
            .AsSplitQuery();
    }

    private async Task<AgreementResponseDto> GetResponseOrThrowAsync(int id)
    {
        var agreement = await BuildQuery().FirstOrDefaultAsync(a => a.Id == id)
            ?? throw new NotFoundException("Acordo não encontrado.");

        return MapResponse(agreement);
    }

    private static AgreementResponseDto MapResponse(Agreement agreement)
    {
        var today = AppTimeZone.Today;
        var installments = agreement.Installments
            .OrderBy(c => c.AgreementInstallmentNumber)
            .Select(c =>
            {
                var amounts = ChargeLateFees.Calculate(c, today);
                return new AgreementInstallmentDto
                {
                    ChargeId = c.Id,
                    Number = c.AgreementInstallmentNumber ?? 0,
                    Value = c.Value,
                    DueDate = c.DueDate,
                    // Same rule as the charge list: pending past its due date reads as overdue.
                    Status = c.Status == ChargeStatus.Pending && c.DueDate.Date < today ? ChargeStatus.Overdue : c.Status,
                    DaysLate = c.Status is ChargeStatus.Pending or ChargeStatus.Overdue ? amounts.DaysLate : 0,
                    UpdatedAmount = amounts.Total
                };
            })
            .ToList();

        var paid = agreement.Installments.Where(c => c.Status == ChargeStatus.Paid).ToList();

        return new AgreementResponseDto
        {
            Id = agreement.Id,
            CondominiumId = agreement.CondominiumId,
            UnitId = agreement.UnitId,
            UnitNumber = agreement.Unit.Number,
            BuildingName = agreement.Unit.Building.Name,
            RecipientPersonId = agreement.RecipientPersonId,
            RecipientName = agreement.RecipientPerson?.Name,
            Status = agreement.Status,
            OriginalAmount = agreement.OriginalAmount,
            FineAmount = agreement.FineAmount,
            InterestAmount = agreement.InterestAmount,
            DiscountType = agreement.DiscountType,
            DiscountValue = agreement.DiscountValue,
            DiscountAmount = agreement.DiscountAmount,
            TotalAmount = agreement.TotalAmount,
            DownPayment = agreement.DownPayment,
            InstallmentCount = agreement.InstallmentCount,
            InstallmentDueDay = agreement.InstallmentDueDay,
            BreakAfterDaysLate = agreement.BreakAfterDaysLate,
            Notes = agreement.Notes,
            CreatedAt = agreement.CreatedAt,
            EndedAt = agreement.EndedAt,
            EndReason = agreement.EndReason,
            PaidCount = paid.Count,
            TotalCount = agreement.Installments.Count,
            PaidAmount = paid.Sum(c => c.Value),
            OriginalCharges = agreement.OriginalCharges
                .OrderBy(link => link.Charge.DueDate)
                .Select(link => new AgreementOriginalChargeDto
                {
                    ChargeId = link.ChargeId,
                    Description = link.Charge.Description,
                    Category = link.Charge.Category,
                    DueDate = link.Charge.DueDate,
                    Value = link.Value,
                    FineAmount = link.FineAmount,
                    InterestAmount = link.InterestAmount,
                    Status = link.Charge.Status
                })
                .ToList(),
            Installments = installments
        };
    }

    private static decimal Round(decimal value) => Math.Round(value, 2, MidpointRounding.AwayFromZero);
}
