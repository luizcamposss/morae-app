using System.Collections.Concurrent;
using AutoMapper;
using backend.Constants;
using backend.Data;
using backend.DTOs.MercadoPago;
using backend.Enums;
using backend.Exceptions;
using backend.Models;
using backend.Services.Notifications;
using backend.Services.Permissions;
using backend.Settings;
using MercadoPago.Client.Common;
using MercadoPago.Client.Payment;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace backend.Services.MercadoPago;

public class MercadoPagoService : IMercadoPagoService
{
    private static readonly ConcurrentDictionary<int, SemaphoreSlim> TokenRefreshLocks = new();

    private static readonly string[] ReversedPaymentStatuses = ["refunded", "charged_back", "cancelled"];

    private static readonly string[] OpenPaymentStatuses = ["pending", "in_process"];

    // Pix (bank_transfer) and boleto (ticket) stay payable for hours or days, so they can and
    // must be cancelled when the charge is settled another way. Cards cannot be cancelled here.
    private static readonly string[] CancelablePaymentTypes = ["bank_transfer", "ticket"];

    private readonly AppDbContext _context;
    private readonly MercadoPagoSettings _settings;
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly IPermissionService _permissionService;
    private readonly IPkceService _pkceService;
    private readonly IMercadoPagoOAuthClient _oauthClient;
    private readonly IMercadoPagoPaymentClient _paymentClient;
    private readonly IMercadoPagoWebhookValidator _webhookValidator;
    private readonly IMercadoPagoTokenProtector _tokenProtector;
    private readonly INotificationService _notificationService;
    private readonly IMapper _mapper;
    private readonly ILogger<MercadoPagoService> _logger;

    public MercadoPagoService(
        AppDbContext context,
        IOptions<MercadoPagoSettings> options,
        UserManager<ApplicationUser> userManager,
        IPermissionService permissionService,
        IPkceService pkceService,
        IMercadoPagoOAuthClient oauthClient,
        IMercadoPagoPaymentClient paymentClient,
        IMercadoPagoWebhookValidator webhookValidator,
        IMercadoPagoTokenProtector tokenProtector,
        INotificationService notificationService,
        IMapper mapper,
        ILogger<MercadoPagoService> logger)
    {
        _context = context;
        _settings = options.Value;
        _userManager = userManager;
        _permissionService = permissionService;
        _pkceService = pkceService;
        _oauthClient = oauthClient;
        _paymentClient = paymentClient;
        _webhookValidator = webhookValidator;
        _tokenProtector = tokenProtector;
        _notificationService = notificationService;
        _mapper = mapper;
        _logger = logger;
    }

    public async Task<MercadoPagoOAuthStartResponseDto> StartOAuthAsync(int userId, int? condominiumId)
    {
        EnsureOAuthConfigured();
        await EnsureCanManageConnectionAsync(userId, condominiumId);

        await _context.MercadoPagoOAuthStates
            .Where(item => item.ExpiresAt < DateTime.UtcNow.AddDays(-1))
            .ExecuteDeleteAsync();

        var state = _pkceService.CreateState();
        var codeVerifier = _pkceService.CreateCodeVerifier();
        var expiresAt = DateTime.UtcNow.AddMinutes(10);

        _context.MercadoPagoOAuthStates.Add(new MercadoPagoOAuthState
        {
            State = state,
            CodeVerifier = codeVerifier,
            UserId = userId,
            CondominiumId = condominiumId,
            ExpiresAt = expiresAt
        });

        await _context.SaveChangesAsync();

        return new MercadoPagoOAuthStartResponseDto
        {
            AuthorizationUrl = BuildAuthorizationUrl(
                state,
                _pkceService.CreateCodeChallenge(codeVerifier)),
            State = state,
            ExpiresAt = expiresAt
        };
    }

    public async Task<MercadoPagoConnectionStatusDto> CompleteOAuthAsync(
        int userId,
        MercadoPagoOAuthCompleteDto dto)
    {
        EnsureOAuthConfigured();

        if (string.IsNullOrWhiteSpace(dto.Code) || string.IsNullOrWhiteSpace(dto.State))
            throw new BadRequestException("Autorização do Mercado Pago incompleta. Tente conectar novamente.");

        var oauthState = await _context.MercadoPagoOAuthStates
            .FirstOrDefaultAsync(item => item.State == dto.State);

        // The state must belong to the logged-in user, so an authorization link started by
        // someone else cannot attach the current user's Mercado Pago account to another account.
        if (oauthState is null ||
            oauthState.UserId != userId ||
            oauthState.UsedAt is not null ||
            oauthState.ExpiresAt < DateTime.UtcNow)
        {
            throw new BadRequestException("Autorização do Mercado Pago inválida ou expirada. Tente conectar novamente.");
        }

        await EnsureCanManageConnectionAsync(userId, oauthState.CondominiumId);

        oauthState.UsedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        var credential = await _oauthClient.ExchangeCodeForTokenAsync(
            dto.Code,
            oauthState.CodeVerifier);

        var account = await UpsertMercadoPagoAccountAsync(
            userId,
            oauthState.CondominiumId,
            credential);

        await _context.SaveChangesAsync();

        return _mapper.Map<MercadoPagoConnectionStatusDto>(account);
    }

    public async Task<MercadoPagoConnectionStatusDto> GetConnectionStatusAsync(int userId, int? condominiumId)
    {
        await EnsureCanManageConnectionAsync(userId, condominiumId);

        var account = await _context.MercadoPagoAccounts
            .AsNoTracking()
            .FirstOrDefaultAsync(item => item.CondominiumId == condominiumId);

        return account is null
            ? new MercadoPagoConnectionStatusDto()
            : _mapper.Map<MercadoPagoConnectionStatusDto>(account);
    }

    public async Task DisconnectAsync(int userId, int? condominiumId)
    {
        await EnsureCanManageConnectionAsync(userId, condominiumId);

        var account = await _context.MercadoPagoAccounts
            .FirstOrDefaultAsync(item => item.CondominiumId == condominiumId);

        if (account is null)
            return;

        // Without tokens the webhooks of this account can no longer be processed, so open
        // Pix/boletos would never settle their charges.
        await CancelOpenPaymentsForAccountAsync(account);

        // The row is kept because tracked checkouts reference it; clearing the tokens
        // is what disconnects it.
        account.AccessToken = string.Empty;
        account.RefreshToken = string.Empty;
        account.ExpiresAt = DateTime.UtcNow;
        account.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
    }

    public async Task<MercadoPagoPaymentSetupDto> GetPaymentSetupAsync(int userId, int chargeId)
    {
        var (charge, _) = await GetPayableChargeOrThrowAsync(userId, chargeId);
        var account = await GetReceiverAccountOrThrowAsync(charge);

        if (string.IsNullOrWhiteSpace(account.PublicKey))
            throw new BadRequestException("A conta Mercado Pago está incompleta. Conecte-a novamente.");

        return new MercadoPagoPaymentSetupDto
        {
            ChargeId = charge.Id,
            Amount = charge.Value,
            Description = charge.Description,
            PublicKey = account.PublicKey,
            PendingPayment = await GetPendingPaymentAsync(charge, account)
        };
    }

    public async Task<MercadoPagoPaymentResultDto> CreatePaymentAsync(
        int userId,
        int chargeId,
        MercadoPagoCreatePaymentDto dto)
    {
        EnsureCheckoutConfigured();

        if (string.IsNullOrWhiteSpace(dto.PaymentMethodId))
            throw new BadRequestException("Escolha uma forma de pagamento.");

        var (charge, user) = await GetPayableChargeOrThrowAsync(userId, chargeId);
        var account = await GetReceiverAccountOrThrowAsync(charge);
        var accessToken = await GetValidAccessTokenAsync(account);

        var trackedPayment = await _context.MercadoPagoPayments
            .Include(item => item.Payment)
            .Include(item => item.MercadoPagoAccount)
            .FirstOrDefaultAsync(item => item.ChargeId == charge.Id);

        // EF links trackedPayment.Charge to the charge already loaded above.

        // Only one open attempt per charge: an earlier Pix/boleto is cancelled before a new
        // payment is created, so the payer cannot end up paying twice.
        if (trackedPayment is not null &&
            IsOpen(trackedPayment) &&
            !await TryCancelOpenPaymentAsync(trackedPayment))
        {
            throw new BadRequestException(
                "O pagamento anterior desta cobrança acabou de ser confirmado ou ainda está em análise. Atualize a página antes de pagar novamente.");
        }

        var details = await _paymentClient.CreateAsync(
            BuildPaymentRequest(charge, user, dto),
            accessToken,
            Guid.NewGuid().ToString());

        if (trackedPayment is null)
        {
            trackedPayment = new MercadoPagoPayment
            {
                ChargeId = charge.Id,
                CreatedAt = DateTime.UtcNow
            };

            _context.MercadoPagoPayments.Add(trackedPayment);
        }

        trackedPayment.Charge = charge;
        trackedPayment.MercadoPagoAccount = account;
        trackedPayment.MercadoPagoAccountId = account.Id;
        trackedPayment.ExternalReference = BuildExternalReference(charge.Id);
        trackedPayment.PreferenceId = null;
        // The new payment replaces any earlier attempt as the one this charge tracks.
        trackedPayment.MercadoPagoPaymentId = null;

        // Card payments are usually decided right away; apply the result now instead of
        // waiting for the webhook (which will then find the charge already settled).
        await ApplyMercadoPagoPaymentAsync(trackedPayment, details);

        return BuildPaymentResult(details, charge.Status);
    }

    public async Task<MercadoPagoPaymentStatusDto> GetPaymentStatusAsync(int userId, int chargeId)
    {
        var charge = await _context.Charges
            .AsNoTracking()
            .FirstOrDefaultAsync(item => item.Id == chargeId);

        if (charge is null)
            throw new NotFoundException("Cobrança não encontrada.");

        await EnsureCanCreateCheckoutAsync(userId, charge);

        var paymentStatus = await _context.MercadoPagoPayments
            .AsNoTracking()
            .Where(item => item.ChargeId == chargeId)
            .Select(item => item.Status)
            .FirstOrDefaultAsync();

        return new MercadoPagoPaymentStatusDto
        {
            ChargeStatus = charge.Status,
            PaymentStatus = paymentStatus
        };
    }

    public async Task CancelOpenPaymentAsync(int chargeId)
    {
        try
        {
            var trackedPayment = await _context.MercadoPagoPayments
                .Include(item => item.Charge)
                .Include(item => item.MercadoPagoAccount)
                .Include(item => item.Payment)
                .FirstOrDefaultAsync(item => item.ChargeId == chargeId);

            if (trackedPayment is not null && IsOpen(trackedPayment))
                await TryCancelOpenPaymentAsync(trackedPayment);
        }
        catch (Exception exception)
        {
            // Best effort: settling or cancelling the charge must not fail because of Mercado Pago.
            // If the open Pix/boleto is paid anyway, the webhook flags it for review.
            _logger.LogError(exception, "Could not cancel the open Mercado Pago payment of charge {ChargeId}.", chargeId);
        }
    }

    public async Task HandleWebhookAsync(
        MercadoPagoWebhookDto notification,
        string? queryType,
        string? queryDataId,
        string? signature,
        string? requestId)
    {
        _webhookValidator.Validate(signature, requestId, queryDataId);

        // From here on every early exit returns normally (HTTP 200): Mercado Pago retries
        // any other status indefinitely, and none of these cases get better on retry.
        var eventType = string.IsNullOrWhiteSpace(queryType)
            ? notification.Type
            : queryType;

        if (!string.Equals(eventType, "payment", StringComparison.OrdinalIgnoreCase))
            return;

        var dataId = string.IsNullOrWhiteSpace(queryDataId)
            ? notification.Data?.GetId()
            : queryDataId;

        if (!long.TryParse(dataId, out var mercadoPagoPaymentId) || !notification.UserId.HasValue)
        {
            _logger.LogWarning(
                "Ignoring Mercado Pago webhook {RequestId}: invalid payment ID or missing user ID.",
                requestId);
            return;
        }

        var account = await _context.MercadoPagoAccounts
            .Where(item =>
                item.MercadoPagoUserId == notification.UserId.Value &&
                item.AccessToken != string.Empty)
            .OrderBy(item => item.Id)
            .FirstOrDefaultAsync();

        if (account is null)
        {
            _logger.LogWarning(
                "Ignoring Mercado Pago webhook {RequestId}: receiver {MercadoPagoUserId} is not connected.",
                requestId,
                notification.UserId.Value);
            return;
        }

        var mercadoPagoPayment = await _paymentClient.GetAsync(
            mercadoPagoPaymentId,
            await GetValidAccessTokenAsync(account));

        var trackedPayment = await _context.MercadoPagoPayments
            .Include(item => item.Charge)
            .Include(item => item.MercadoPagoAccount)
            .Include(item => item.Payment)
            .FirstOrDefaultAsync(item => item.ExternalReference == mercadoPagoPayment.ExternalReference);

        if (trackedPayment is null)
        {
            _logger.LogWarning(
                "Ignoring Mercado Pago payment {PaymentId}: external reference {ExternalReference} was not created by this application.",
                mercadoPagoPayment.Id,
                mercadoPagoPayment.ExternalReference);
            return;
        }

        if (mercadoPagoPayment.CollectorId != trackedPayment.MercadoPagoAccount.MercadoPagoUserId)
        {
            _logger.LogError(
                "Ignoring Mercado Pago payment {PaymentId}: collector {CollectorId} does not match the receiver of charge {ChargeId}.",
                mercadoPagoPayment.Id,
                mercadoPagoPayment.CollectorId,
                trackedPayment.ChargeId);
            return;
        }

        await ApplyMercadoPagoPaymentAsync(trackedPayment, mercadoPagoPayment);
    }

    private async Task ApplyMercadoPagoPaymentAsync(
        MercadoPagoPayment trackedPayment,
        MercadoPagoPaymentDetailsDto mercadoPagoPayment)
    {
        if (trackedPayment.PaymentId.HasValue)
        {
            await HandleUpdateForPaidChargeAsync(trackedPayment, mercadoPagoPayment);
            return;
        }

        // A late update from an attempt that was replaced (e.g. the cancelled old Pix) must not
        // overwrite the attempt the charge now tracks. Only an approval still matters.
        if (trackedPayment.MercadoPagoPaymentId.HasValue &&
            trackedPayment.MercadoPagoPaymentId != mercadoPagoPayment.Id &&
            !IsApproved(mercadoPagoPayment))
        {
            _logger.LogInformation(
                "Ignoring status {Status} of superseded Mercado Pago payment {PaymentId} for charge {ChargeId}.",
                mercadoPagoPayment.Status,
                mercadoPagoPayment.Id,
                trackedPayment.ChargeId);
            return;
        }

        ApplyPaymentStatus(trackedPayment, mercadoPagoPayment);

        if (!IsApproved(mercadoPagoPayment))
        {
            await _context.SaveChangesAsync();
            return;
        }

        if (!string.Equals(mercadoPagoPayment.CurrencyId, "BRL", StringComparison.OrdinalIgnoreCase) ||
            mercadoPagoPayment.TransactionAmount != trackedPayment.Charge.Value)
        {
            await MarkForReviewAsync(
                trackedPayment,
                "review_required",
                "Payment currency or amount does not match the charge.");
            return;
        }

        if (trackedPayment.Charge.Status == ChargeStatus.Canceled)
        {
            await MarkForReviewAsync(
                trackedPayment,
                "review_required",
                "Payment was approved for a canceled charge.");
            return;
        }

        if (trackedPayment.Charge.Status == ChargeStatus.Paid)
        {
            await MarkForReviewAsync(
                trackedPayment,
                "approved_charge_already_paid",
                "Charge was already paid by another payment record.");
            return;
        }

        var payment = new Payment
        {
            ChargeId = trackedPayment.ChargeId,
            AmountPaid = mercadoPagoPayment.TransactionAmount,
            PaymentMethod = MapPaymentMethod(mercadoPagoPayment),
            Source = PaymentSource.MercadoPago,
            RegisteredByUserId = trackedPayment.MercadoPagoAccount.UserId,
            Notes = $"Mercado Pago payment {mercadoPagoPayment.Id}",
            PaidAt = mercadoPagoPayment.DateApproved ?? DateTime.UtcNow,
            CreatedAt = DateTime.UtcNow
        };

        _context.Payments.Add(payment);
        trackedPayment.Charge.Status = ChargeStatus.Paid;
        trackedPayment.Payment = payment;
        trackedPayment.PaidAt = payment.PaidAt;

        try
        {
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateException)
        {
            var paymentAlreadyExists = await _context.Payments
                .AsNoTracking()
                .AnyAsync(item => item.ChargeId == trackedPayment.ChargeId);

            if (!paymentAlreadyExists)
                throw;

            _logger.LogInformation(
                "Mercado Pago payment webhook for charge {ChargeId} was already processed.",
                trackedPayment.ChargeId);
            return;
        }

        await NotifyPayersAsync(
            trackedPayment.Charge,
            "Pagamento confirmado",
            "O pagamento pelo Mercado Pago foi confirmado.");
    }

    private async Task HandleUpdateForPaidChargeAsync(
        MercadoPagoPayment trackedPayment,
        MercadoPagoPaymentDetailsDto mercadoPagoPayment)
    {
        if (trackedPayment.MercadoPagoPaymentId != mercadoPagoPayment.Id)
        {
            // A second Mercado Pago payment for a charge that is already paid (e.g. the payer
            // opened the checkout twice). It must be refunded manually in Mercado Pago.
            if (IsApproved(mercadoPagoPayment))
            {
                _logger.LogWarning(
                    "Duplicate Mercado Pago payment {PaymentId} for already paid charge {ChargeId}.",
                    mercadoPagoPayment.Id,
                    trackedPayment.ChargeId);

                await NotifyReceiversAsync(
                    trackedPayment,
                    "Pagamento em duplicidade",
                    $"A cobrança \"{trackedPayment.Charge.Description}\" recebeu um segundo pagamento no Mercado Pago " +
                    $"(ID {mercadoPagoPayment.Id}). Estorne-o pelo painel do Mercado Pago.");
            }

            return;
        }

        ApplyPaymentStatus(trackedPayment, mercadoPagoPayment);

        if (!ReversedPaymentStatuses.Contains(mercadoPagoPayment.Status, StringComparer.OrdinalIgnoreCase))
        {
            await _context.SaveChangesAsync();
            return;
        }

        // Refund or chargeback of the payment that settled the charge: reopen the charge.
        if (trackedPayment.Payment is not null)
            _context.Payments.Remove(trackedPayment.Payment);

        trackedPayment.Payment = null;
        trackedPayment.PaymentId = null;
        trackedPayment.PaidAt = null;

        if (trackedPayment.Charge.Status == ChargeStatus.Paid)
        {
            trackedPayment.Charge.Status = trackedPayment.Charge.DueDate.Date < DateTime.UtcNow.Date
                ? ChargeStatus.Overdue
                : ChargeStatus.Pending;
        }

        await _context.SaveChangesAsync();

        const string title = "Pagamento estornado";
        var message = $"O pagamento da cobrança \"{trackedPayment.Charge.Description}\" foi estornado no Mercado Pago " +
                      "e a cobrança voltou a ficar em aberto.";

        await NotifyPayersAsync(trackedPayment.Charge, title, message);
        await NotifyReceiversAsync(trackedPayment, title, message);
    }

    private static bool IsOpen(MercadoPagoPayment trackedPayment)
    {
        return !trackedPayment.PaymentId.HasValue &&
               trackedPayment.MercadoPagoPaymentId.HasValue &&
               OpenPaymentStatuses.Contains(trackedPayment.Status, StringComparer.OrdinalIgnoreCase);
    }

    // Returns true when no open payment is left for the charge (cancelled, expired, rejected or
    // unreachable) and false when one is still open or has just been approved.
    private async Task<bool> TryCancelOpenPaymentAsync(MercadoPagoPayment trackedPayment)
    {
        if (string.IsNullOrEmpty(trackedPayment.MercadoPagoAccount.AccessToken))
            return false;

        var paymentId = trackedPayment.MercadoPagoPaymentId!.Value;
        MercadoPagoPaymentDetailsDto details;

        try
        {
            var accessToken = await GetValidAccessTokenAsync(trackedPayment.MercadoPagoAccount);

            details = CancelablePaymentTypes.Contains(trackedPayment.PaymentTypeId, StringComparer.OrdinalIgnoreCase)
                ? await CancelOrRefreshAsync(paymentId, accessToken)
                : await _paymentClient.GetAsync(paymentId, accessToken);
        }
        catch (BadRequestException)
        {
            // The payment can no longer be reached (e.g. the account was switched). Blocking the
            // charge forever would be worse: if it is paid anyway, its webhook flags a review.
            _logger.LogWarning(
                "Open Mercado Pago payment {PaymentId} of charge {ChargeId} could not be cancelled or queried.",
                paymentId,
                trackedPayment.ChargeId);
            return true;
        }

        if (IsApproved(details))
        {
            await ApplyMercadoPagoPaymentAsync(trackedPayment, details);
            return false;
        }

        ApplyPaymentStatus(trackedPayment, details);
        await _context.SaveChangesAsync();

        return !OpenPaymentStatuses.Contains(details.Status, StringComparer.OrdinalIgnoreCase);
    }

    private async Task<MercadoPagoPaymentDetailsDto> CancelOrRefreshAsync(long paymentId, string accessToken)
    {
        try
        {
            return await _paymentClient.CancelAsync(paymentId, accessToken);
        }
        catch (BadRequestException)
        {
            // Mercado Pago refuses to cancel a payment that was just approved or already expired;
            // read its real status instead.
            return await _paymentClient.GetAsync(paymentId, accessToken);
        }
    }

    private async Task CancelOpenPaymentsForAccountAsync(MercadoPagoAccount account)
    {
        if (string.IsNullOrEmpty(account.AccessToken))
            return;

        var openPayments = await _context.MercadoPagoPayments
            .Include(item => item.Charge)
            .Include(item => item.MercadoPagoAccount)
            .Where(item =>
                item.MercadoPagoAccountId == account.Id &&
                item.PaymentId == null &&
                item.MercadoPagoPaymentId != null &&
                OpenPaymentStatuses.Contains(item.Status))
            .ToListAsync();

        foreach (var openPayment in openPayments)
        {
            if (!await TryCancelOpenPaymentAsync(openPayment))
            {
                _logger.LogWarning(
                    "Open Mercado Pago payment {PaymentId} of charge {ChargeId} is still open while account {AccountId} is being replaced.",
                    openPayment.MercadoPagoPaymentId,
                    openPayment.ChargeId,
                    account.Id);
            }
        }
    }

    private async Task MarkForReviewAsync(
        MercadoPagoPayment trackedPayment,
        string status,
        string statusDetail)
    {
        trackedPayment.Status = status;
        trackedPayment.StatusDetail = statusDetail;
        await _context.SaveChangesAsync();

        _logger.LogError(
            "Mercado Pago payment {PaymentId} for charge {ChargeId} requires review: {StatusDetail}",
            trackedPayment.MercadoPagoPaymentId,
            trackedPayment.ChargeId,
            statusDetail);

        await NotifyReceiversAsync(
            trackedPayment,
            "Pagamento precisa de revisão",
            $"Um pagamento do Mercado Pago (ID {trackedPayment.MercadoPagoPaymentId}) para a cobrança " +
            $"\"{trackedPayment.Charge.Description}\" não pôde ser aplicado automaticamente. " +
            "Verifique e, se necessário, estorne pelo painel do Mercado Pago.");
    }

    private static void ApplyPaymentStatus(
        MercadoPagoPayment trackedPayment,
        MercadoPagoPaymentDetailsDto payment)
    {
        trackedPayment.MercadoPagoPaymentId = payment.Id;
        trackedPayment.Status = payment.Status;
        trackedPayment.StatusDetail = payment.StatusDetail;
        trackedPayment.PaymentMethodId = payment.PaymentMethodId;
        trackedPayment.PaymentTypeId = payment.PaymentTypeId;
        trackedPayment.Amount = payment.TransactionAmount;
        trackedPayment.UpdatedAt = DateTime.UtcNow;
    }

    private static bool IsApproved(MercadoPagoPaymentDetailsDto payment)
    {
        return string.Equals(payment.Status, "approved", StringComparison.OrdinalIgnoreCase);
    }

    private static PaymentMethod MapPaymentMethod(MercadoPagoPaymentDetailsDto payment)
    {
        if (string.Equals(payment.PaymentMethodId, "pix", StringComparison.OrdinalIgnoreCase))
            return PaymentMethod.Pix;

        return payment.PaymentTypeId.ToLowerInvariant() switch
        {
            "credit_card" => PaymentMethod.CreditCard,
            "debit_card" => PaymentMethod.DebitCard,
            "ticket" => PaymentMethod.BankSlip,
            "bank_transfer" => PaymentMethod.BankTransfer,
            "account_money" => PaymentMethod.AccountBalance,
            "prepaid_card" => PaymentMethod.PrepaidCard,
            "digital_wallet" => PaymentMethod.DigitalWallet,
            _ => PaymentMethod.Other
        };
    }

    private async Task NotifyPayersAsync(Charge charge, string title, string message)
    {
        if (charge.Scope == ChargeScope.Platform)
        {
            await _notificationService.CreateManyAsync(
                await GetActiveCondominiumAdminIdsAsync(charge.CondominiumId),
                NotificationType.Payment,
                title,
                message,
                "/admin/payments",
                charge.CondominiumId);
            return;
        }

        if (!charge.UnitId.HasValue)
            return;

        var residentUserIds = await _context.PersonUnits
            .AsNoTracking()
            .Where(item => item.UnitId == charge.UnitId.Value)
            .Join(
                _context.Users.AsNoTracking(),
                personUnit => personUnit.PersonId,
                user => user.PersonId,
                (_, user) => user.Id)
            .Distinct()
            .ToListAsync();

        await _notificationService.CreateManyAsync(
            residentUserIds,
            NotificationType.Payment,
            title,
            message,
            "/resident/bills",
            charge.CondominiumId);
    }

    private async Task NotifyReceiversAsync(MercadoPagoPayment trackedPayment, string title, string message)
    {
        var charge = trackedPayment.Charge;

        if (charge.Scope == ChargeScope.Platform)
        {
            await _notificationService.CreateManyAsync(
                [trackedPayment.MercadoPagoAccount.UserId],
                NotificationType.Payment,
                title,
                message,
                "/master/payments");
            return;
        }

        await _notificationService.CreateManyAsync(
            await GetActiveCondominiumAdminIdsAsync(charge.CondominiumId),
            NotificationType.Payment,
            title,
            message,
            "/admin/payments",
            charge.CondominiumId);
    }

    private async Task<List<int>> GetActiveCondominiumAdminIdsAsync(int condominiumId)
    {
        return await _context.UserCondominiums
            .AsNoTracking()
            .Where(item =>
                item.CondominiumId == condominiumId &&
                item.Role == AppRoles.Admin &&
                item.Status == UserCondominiumStatus.Active)
            .Select(item => item.UserId)
            .Distinct()
            .ToListAsync();
    }

    private async Task<MercadoPagoAccount> UpsertMercadoPagoAccountAsync(
        int userId,
        int? condominiumId,
        MercadoPagoOAuthCredentialDto credential)
    {
        var account = await _context.MercadoPagoAccounts
            .FirstOrDefaultAsync(item => item.CondominiumId == condominiumId);

        if (account is null)
        {
            account = new MercadoPagoAccount
            {
                CondominiumId = condominiumId
            };

            _context.MercadoPagoAccounts.Add(account);
        }
        else if (account.MercadoPagoUserId != credential.UserId)
        {
            // Switching to another Mercado Pago account: open payments of the old one would
            // never settle, because their webhooks no longer match a connected account.
            await CancelOpenPaymentsForAccountAsync(account);
        }

        account.UserId = userId;
        account.ConnectedAt = DateTime.UtcNow;
        ApplyCredential(account, credential);

        return account;
    }

    private async Task<MercadoPagoAccount> GetReceiverAccountOrThrowAsync(Charge charge)
    {
        int? condominiumId = charge.Scope == ChargeScope.Platform
            ? null
            : charge.CondominiumId;

        var account = await _context.MercadoPagoAccounts
            .FirstOrDefaultAsync(item => item.CondominiumId == condominiumId);

        if (account is null || string.IsNullOrWhiteSpace(account.AccessToken))
        {
            throw new BadRequestException(charge.Scope == ChargeScope.Platform
                ? "A plataforma ainda não conectou uma conta Mercado Pago para receber pagamentos online."
                : "O condomínio ainda não conectou uma conta Mercado Pago para receber pagamentos online.");
        }

        return account;
    }

    private async Task<string> GetValidAccessTokenAsync(MercadoPagoAccount account)
    {
        if (account.ExpiresAt > DateTime.UtcNow.AddMinutes(5))
            return _tokenProtector.Unprotect(account.AccessToken);

        // Mercado Pago invalidates a refresh token once it is used, so concurrent requests
        // must not refresh the same account twice.
        var refreshLock = TokenRefreshLocks.GetOrAdd(account.Id, _ => new SemaphoreSlim(1, 1));
        await refreshLock.WaitAsync();

        try
        {
            await _context.Entry(account).ReloadAsync();

            if (account.ExpiresAt > DateTime.UtcNow.AddMinutes(5))
                return _tokenProtector.Unprotect(account.AccessToken);

            if (string.IsNullOrWhiteSpace(account.RefreshToken))
                throw new BadRequestException("A conta Mercado Pago foi desconectada. Conecte-a novamente.");

            var credential = await _oauthClient.RefreshTokenAsync(
                _tokenProtector.Unprotect(account.RefreshToken));

            ApplyCredential(account, credential);
            await _context.SaveChangesAsync();

            return credential.AccessToken ?? string.Empty;
        }
        finally
        {
            refreshLock.Release();
        }
    }

    private void ApplyCredential(
        MercadoPagoAccount account,
        MercadoPagoOAuthCredentialDto credential)
    {
        account.MercadoPagoUserId = credential.UserId;
        account.PublicKey = credential.PublicKey ?? string.Empty;
        account.AccessToken = _tokenProtector.Protect(credential.AccessToken ?? string.Empty);

        if (!string.IsNullOrEmpty(credential.RefreshToken))
            account.RefreshToken = _tokenProtector.Protect(credential.RefreshToken);

        account.TokenType = credential.TokenType ?? string.Empty;
        account.Scope = credential.Scope ?? string.Empty;
        account.LiveMode = credential.LiveMode;
        account.ExpiresAt = DateTime.UtcNow.AddSeconds(Math.Max(credential.ExpiresIn - 60, 0));
        account.UpdatedAt = DateTime.UtcNow;
    }

    private async Task EnsureCanManageConnectionAsync(int userId, int? condominiumId)
    {
        if (condominiumId is null)
        {
            await _permissionService.EnsureMasterAsync(userId);
            return;
        }

        await _permissionService.EnsureCondominiumAdminAsync(userId, condominiumId.Value);
    }

    private async Task EnsureCanCreateCheckoutAsync(int userId, Charge charge)
    {
        var user = await _userManager.FindByIdAsync(userId.ToString());

        if (user is null)
            throw new NotFoundException("User not found.");

        if (charge.Scope == ChargeScope.Platform)
        {
            if (await _permissionService.IsCondominiumAdminAsync(userId, charge.CondominiumId))
                return;

            throw new ForbiddenException("Você não pode pagar esta cobrança.");
        }

        if (charge.Scope == ChargeScope.Condominium)
        {
            if (await _permissionService.IsCondominiumAdminAsync(userId, charge.CondominiumId) ||
                await IsSyndicForCondominiumAsync(user, userId, charge.CondominiumId) ||
                await IsResidentChargeOwnerAsync(user, charge))
            {
                return;
            }

            throw new ForbiddenException("Você não pode pagar esta cobrança.");
        }

        throw new BadRequestException("Invalid charge scope.");
    }

    private static void EnsureChargeCanBePaid(Charge charge)
    {
        if (charge.Status == ChargeStatus.Paid)
            throw new BadRequestException("Esta cobrança já foi paga.");

        if (charge.Status == ChargeStatus.Canceled)
            throw new BadRequestException("Cobranças canceladas não podem ser pagas.");
    }

    private async Task<bool> IsSyndicForCondominiumAsync(
        ApplicationUser user,
        int userId,
        int condominiumId)
    {
        if (!await _userManager.IsInRoleAsync(user, AppRoles.Syndic))
            return false;

        return await _context.UserCondominiums
            .AsNoTracking()
            .AnyAsync(item =>
                item.UserId == userId &&
                item.CondominiumId == condominiumId &&
                item.Role == AppRoles.Syndic &&
                item.Status == UserCondominiumStatus.Active);
    }

    private async Task<bool> IsResidentChargeOwnerAsync(ApplicationUser user, Charge charge)
    {
        if (!charge.UnitId.HasValue)
            return false;

        return await _context.PersonUnits
            .AsNoTracking()
            .AnyAsync(personUnit =>
                personUnit.PersonId == user.PersonId &&
                personUnit.UnitId == charge.UnitId.Value);
    }

    private void EnsureOAuthConfigured()
    {
        if (string.IsNullOrWhiteSpace(_settings.ClientId))
            throw new BadRequestException("Mercado Pago não configurado no servidor (Client ID).");

        if (string.IsNullOrWhiteSpace(_settings.ClientSecret))
            throw new BadRequestException("Mercado Pago não configurado no servidor (Client Secret).");

        if (string.IsNullOrWhiteSpace(_settings.OAuthRedirectUri))
            throw new BadRequestException("Mercado Pago não configurado no servidor (Redirect URI).");
    }

    private void EnsureCheckoutConfigured()
    {
        if (string.IsNullOrWhiteSpace(_settings.WebhookUrl))
            throw new BadRequestException("Mercado Pago não configurado no servidor (Webhook URL).");
    }

    private string BuildAuthorizationUrl(string state, string codeChallenge)
    {
        return "https://auth.mercadopago.com/authorization" +
               $"?client_id={Uri.EscapeDataString(_settings.ClientId)}" +
               "&response_type=code" +
               "&platform_id=mp" +
               $"&state={Uri.EscapeDataString(state)}" +
               $"&redirect_uri={Uri.EscapeDataString(_settings.OAuthRedirectUri)}" +
               $"&code_challenge={Uri.EscapeDataString(codeChallenge)}" +
               "&code_challenge_method=S256";
    }

    private async Task<(Charge Charge, ApplicationUser User)> GetPayableChargeOrThrowAsync(
        int userId,
        int chargeId)
    {
        var charge = await _context.Charges
            .Include(item => item.Condominium)
            .FirstOrDefaultAsync(item => item.Id == chargeId);

        if (charge is null)
            throw new NotFoundException("Cobrança não encontrada.");

        await EnsureCanCreateCheckoutAsync(userId, charge);
        EnsureChargeCanBePaid(charge);

        var user = await _userManager.FindByIdAsync(userId.ToString())
            ?? throw new NotFoundException("User not found.");

        return (charge, user);
    }

    private PaymentCreateRequest BuildPaymentRequest(
        Charge charge,
        ApplicationUser user,
        MercadoPagoCreatePaymentDto dto)
    {
        var payer = dto.Payer;
        var address = payer?.Address;
        var isCard = !string.IsNullOrWhiteSpace(dto.Token);

        return new PaymentCreateRequest
        {
            TransactionAmount = charge.Value,
            Description = charge.Description,
            PaymentMethodId = dto.PaymentMethodId,
            Token = isCard ? dto.Token : null,
            IssuerId = isCard ? dto.IssuerId : null,
            // Credit card is single-installment only (product decision).
            Installments = isCard ? 1 : null,
            ExternalReference = BuildExternalReference(charge.Id),
            NotificationUrl = _settings.WebhookUrl,
            StatementDescriptor = "MORAE",
            Payer = new PaymentPayerRequest
            {
                Email = string.IsNullOrWhiteSpace(payer?.Email) ? user.Email : payer.Email,
                FirstName = payer?.FirstName,
                LastName = payer?.LastName,
                Identification = payer?.Identification is null
                    ? null
                    : new IdentificationRequest
                    {
                        Type = payer.Identification.Type,
                        Number = payer.Identification.Number
                    },
                // Required by Mercado Pago for boleto.
                Address = address is null
                    ? null
                    : new PaymentPayerAddressRequest
                    {
                        ZipCode = address.ZipCode,
                        StreetName = address.StreetName,
                        StreetNumber = int.TryParse(address.StreetNumber, out var streetNumber) ? streetNumber : 0,
                        Neighborhood = address.Neighborhood,
                        City = address.City,
                        FederalUnit = address.FederalUnit
                    }
            },
            Metadata = new Dictionary<string, object>
            {
                ["charge_id"] = charge.Id,
                ["charge_scope"] = charge.Scope.ToString(),
                ["condominium_id"] = charge.CondominiumId
            }
        };
    }

    // Returns the payment still open for the charge (a Pix/boleto waiting to be paid or a card
    // under review), so the payer sees it instead of starting a second payment.
    private async Task<MercadoPagoPaymentResultDto?> GetPendingPaymentAsync(
        Charge charge,
        MercadoPagoAccount account)
    {
        var trackedPayment = await _context.MercadoPagoPayments
            .AsNoTracking()
            .FirstOrDefaultAsync(item =>
                item.ChargeId == charge.Id &&
                item.MercadoPagoAccountId == account.Id &&
                item.MercadoPagoPaymentId != null &&
                (item.Status == "pending" || item.Status == "in_process"));

        if (trackedPayment?.MercadoPagoPaymentId is null)
            return null;

        try
        {
            var details = await _paymentClient.GetAsync(
                trackedPayment.MercadoPagoPaymentId.Value,
                await GetValidAccessTokenAsync(account));

            var isStillOpen =
                details.Status is "pending" or "in_process" &&
                (details.DateOfExpiration is null || details.DateOfExpiration > DateTime.UtcNow);

            return isStillOpen ? BuildPaymentResult(details, charge.Status) : null;
        }
        catch (BadRequestException)
        {
            // Not being able to show the open payment must not block the payment screen.
            return null;
        }
    }

    private static MercadoPagoPaymentResultDto BuildPaymentResult(
        MercadoPagoPaymentDetailsDto details,
        ChargeStatus chargeStatus)
    {
        return new MercadoPagoPaymentResultDto
        {
            PaymentId = details.Id,
            Status = details.Status,
            StatusDetail = details.StatusDetail,
            PaymentMethodId = details.PaymentMethodId,
            PaymentTypeId = details.PaymentTypeId,
            ChargeStatus = chargeStatus,
            Pix = string.IsNullOrEmpty(details.PixQrCode)
                ? null
                : new MercadoPagoPixDto
                {
                    QrCode = details.PixQrCode,
                    QrCodeBase64 = details.PixQrCodeBase64,
                    TicketUrl = details.PixTicketUrl,
                    ExpiresAt = details.DateOfExpiration
                },
            Boleto = string.IsNullOrEmpty(details.BoletoUrl)
                ? null
                : new MercadoPagoBoletoDto
                {
                    Url = details.BoletoUrl,
                    DigitableLine = details.BoletoDigitableLine,
                    ExpiresAt = details.DateOfExpiration
                }
        };
    }

    private static string BuildExternalReference(int chargeId)
    {
        return $"charge:{chargeId}";
    }
}
