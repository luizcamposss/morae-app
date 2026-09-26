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
using MercadoPago.Client;
using MercadoPago.Client.Preference;
using MercadoPago.Error;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace backend.Services.MercadoPago;

public class MercadoPagoService : IMercadoPagoService
{
    private static readonly ConcurrentDictionary<int, SemaphoreSlim> TokenRefreshLocks = new();

    private static readonly string[] ReversedPaymentStatuses = ["refunded", "charged_back", "cancelled"];

    private readonly AppDbContext _context;
    private readonly MercadoPagoSettings _settings;
    private readonly AppSettings _appSettings;
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
        IOptions<AppSettings> appOptions,
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
        _appSettings = appOptions.Value;
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
            throw new BadRequestException("OAuth code and state are required.");

        var oauthState = await _context.MercadoPagoOAuthStates
            .FirstOrDefaultAsync(item => item.State == dto.State);

        // The state must belong to the logged-in user, so an authorization link started by
        // someone else cannot attach the current user's Mercado Pago account to another account.
        if (oauthState is null ||
            oauthState.UserId != userId ||
            oauthState.UsedAt is not null ||
            oauthState.ExpiresAt < DateTime.UtcNow)
        {
            throw new BadRequestException("Invalid or expired Mercado Pago OAuth state.");
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

        // The row is kept because tracked checkouts reference it; clearing the tokens
        // is what disconnects it.
        account.AccessToken = string.Empty;
        account.RefreshToken = string.Empty;
        account.ExpiresAt = DateTime.UtcNow;
        account.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
    }

    public async Task<MercadoPagoCheckoutResponseDto> CreateCheckoutAsync(int userId, int chargeId)
    {
        EnsureCheckoutConfigured();

        var charge = await _context.Charges
            .Include(item => item.Condominium)
            .FirstOrDefaultAsync(item => item.Id == chargeId);

        if (charge is null)
            throw new NotFoundException("Charge not found.");

        await EnsureCanCreateCheckoutAsync(userId, charge);
        EnsureChargeCanBePaid(charge);

        var account = await GetReceiverAccountOrThrowAsync(charge);
        var accessToken = await GetValidAccessTokenAsync(account);

        var externalReference = BuildExternalReference(charge.Id);
        var request = BuildCheckoutPreferenceRequest(charge, externalReference);
        var requestOptions = new RequestOptions
        {
            AccessToken = accessToken
        };

        try
        {
            var preference = await new PreferenceClient()
                .CreateAsync(request, requestOptions);

            var checkoutUrl = IsSandboxEnvironment()
                ? preference.SandboxInitPoint
                : preference.InitPoint;

            if (string.IsNullOrWhiteSpace(checkoutUrl))
                throw new BadRequestException("Mercado Pago did not return a checkout URL.");

            if (string.IsNullOrWhiteSpace(preference.Id))
                throw new BadRequestException("Mercado Pago did not return a preference ID.");

            await SaveCheckoutAsync(charge, account, preference.Id, externalReference);

            return new MercadoPagoCheckoutResponseDto
            {
                PreferenceId = preference.Id ?? string.Empty,
                CheckoutUrl = checkoutUrl,
                InitPoint = preference.InitPoint ?? string.Empty,
                SandboxInitPoint = preference.SandboxInitPoint ?? string.Empty,
                ExternalReference = externalReference
            };
        }
        catch (MercadoPagoException exception)
        {
            _logger.LogError(exception, "Mercado Pago checkout failed for charge {ChargeId}.", charge.Id);
            throw new BadRequestException("Could not create the Mercado Pago checkout. Try again later.");
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

        if (trackedPayment.PaymentId.HasValue)
        {
            await HandleUpdateForPaidChargeAsync(trackedPayment, mercadoPagoPayment);
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

    private async Task SaveCheckoutAsync(
        Charge charge,
        MercadoPagoAccount account,
        string preferenceId,
        string externalReference)
    {
        var trackedPayment = await _context.MercadoPagoPayments
            .FirstOrDefaultAsync(item => item.ChargeId == charge.Id);

        if (trackedPayment is null)
        {
            trackedPayment = new MercadoPagoPayment
            {
                ChargeId = charge.Id,
                CreatedAt = DateTime.UtcNow
            };

            _context.MercadoPagoPayments.Add(trackedPayment);
        }

        trackedPayment.MercadoPagoAccountId = account.Id;
        trackedPayment.PreferenceId = preferenceId;
        trackedPayment.ExternalReference = externalReference;
        trackedPayment.MercadoPagoPaymentId = null;
        trackedPayment.Status = "created";
        trackedPayment.StatusDetail = null;
        trackedPayment.PaymentMethodId = null;
        trackedPayment.PaymentTypeId = null;
        trackedPayment.Amount = charge.Value;
        trackedPayment.PaidAt = null;
        trackedPayment.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
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
                ? "The platform has not connected a Mercado Pago account yet."
                : "This condominium has not connected a Mercado Pago account yet.");
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
                throw new BadRequestException("Mercado Pago account is disconnected. Connect it again.");

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

            throw new ForbiddenException("User cannot pay this platform charge.");
        }

        if (charge.Scope == ChargeScope.Condominium)
        {
            if (await _permissionService.IsCondominiumAdminAsync(userId, charge.CondominiumId) ||
                await IsSyndicForCondominiumAsync(user, userId, charge.CondominiumId) ||
                await IsResidentChargeOwnerAsync(user, charge))
            {
                return;
            }

            throw new ForbiddenException("User cannot pay this condominium charge.");
        }

        throw new BadRequestException("Invalid charge scope.");
    }

    private static void EnsureChargeCanBePaid(Charge charge)
    {
        if (charge.Status == ChargeStatus.Paid)
            throw new BadRequestException("Charge is already paid.");

        if (charge.Status == ChargeStatus.Canceled)
            throw new BadRequestException("Canceled charges cannot be paid.");
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
            throw new BadRequestException("Mercado Pago Client ID is not configured.");

        if (string.IsNullOrWhiteSpace(_settings.ClientSecret))
            throw new BadRequestException("Mercado Pago Client Secret is not configured.");

        if (string.IsNullOrWhiteSpace(_settings.OAuthRedirectUri))
            throw new BadRequestException("Mercado Pago OAuth Redirect URI is not configured.");
    }

    private void EnsureCheckoutConfigured()
    {
        if (string.IsNullOrWhiteSpace(_settings.WebhookUrl))
            throw new BadRequestException("Mercado Pago Webhook URL is not configured.");
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

    private PreferenceRequest BuildCheckoutPreferenceRequest(
        Charge charge,
        string externalReference)
    {
        var returnUrl = _appSettings.BuildFrontendUrl($"payments/return?chargeId={charge.Id}");

        return new PreferenceRequest
        {
            Items =
            [
                new PreferenceItemRequest
                {
                    Id = charge.Id.ToString(),
                    Title = charge.Description,
                    Description = charge.Scope == ChargeScope.Platform
                        ? "Pagamento de cobrança da plataforma MORAE"
                        : "Pagamento de cobrança condominial",
                    Quantity = 1,
                    CurrencyId = "BRL",
                    UnitPrice = charge.Value
                }
            ],
            BackUrls = new PreferenceBackUrlsRequest
            {
                Success = $"{returnUrl}&result=success",
                Failure = $"{returnUrl}&result=failure",
                Pending = $"{returnUrl}&result=pending"
            },
            // Mercado Pago only accepts auto_return with public HTTPS back URLs.
            AutoReturn = returnUrl.StartsWith("https://", StringComparison.OrdinalIgnoreCase)
                ? "approved"
                : null,
            NotificationUrl = _settings.WebhookUrl,
            ExternalReference = externalReference,
            StatementDescriptor = "MORAE",
            Metadata = new Dictionary<string, object>
            {
                ["charge_id"] = charge.Id,
                ["charge_scope"] = charge.Scope.ToString(),
                ["condominium_id"] = charge.CondominiumId
            }
        };
    }

    private static string BuildExternalReference(int chargeId)
    {
        return $"charge:{chargeId}";
    }

    private bool IsSandboxEnvironment()
    {
        return string.Equals(_settings.Environment, "Sandbox", StringComparison.OrdinalIgnoreCase);
    }
}
