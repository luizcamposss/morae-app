using AutoMapper;
using backend.Constants;
using backend.Data;
using backend.DTOs.MercadoPago;
using backend.Enums;
using backend.Exceptions;
using backend.Models;
using backend.Services.Notifications;
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
    private readonly AppDbContext _context;
    private readonly MercadoPagoSettings _settings;
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly IPkceService _pkceService;
    private readonly IMercadoPagoOAuthClient _oauthClient;
    private readonly IMercadoPagoPaymentClient _paymentClient;
    private readonly IMercadoPagoWebhookValidator _webhookValidator;
    private readonly INotificationService _notificationService;
    private readonly IMapper _mapper;
    private readonly ILogger<MercadoPagoService> _logger;

    public MercadoPagoService(
        AppDbContext context,
        IOptions<MercadoPagoSettings> options,
        UserManager<ApplicationUser> userManager,
        IPkceService pkceService,
        IMercadoPagoOAuthClient oauthClient,
        IMercadoPagoPaymentClient paymentClient,
        IMercadoPagoWebhookValidator webhookValidator,
        INotificationService notificationService,
        IMapper mapper,
        ILogger<MercadoPagoService> logger)
    {
        _context = context;
        _settings = options.Value;
        _userManager = userManager;
        _pkceService = pkceService;
        _oauthClient = oauthClient;
        _paymentClient = paymentClient;
        _webhookValidator = webhookValidator;
        _notificationService = notificationService;
        _mapper = mapper;
        _logger = logger;
    }

    public async Task<MercadoPagoOAuthStartResponseDto> StartOAuthAsync(int userId)
    {
        EnsureOAuthConfigured();
        await EnsureCanConnectOAuthAsync(userId);

        var state = _pkceService.CreateState();
        var codeVerifier = _pkceService.CreateCodeVerifier();
        var expiresAt = DateTime.UtcNow.AddMinutes(10);

        _context.MercadoPagoOAuthStates.Add(new MercadoPagoOAuthState
        {
            State = state,
            CodeVerifier = codeVerifier,
            UserId = userId,
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

    public async Task<MercadoPagoConnectionStatusDto> CompleteOAuthAsync(string code, string state)
    {
        EnsureOAuthConfigured();

        if (string.IsNullOrWhiteSpace(code) || string.IsNullOrWhiteSpace(state))
            throw new BadRequestException("OAuth code and state are required.");

        var oauthState = await _context.MercadoPagoOAuthStates
            .FirstOrDefaultAsync(item => item.State == state);

        if (oauthState is null || oauthState.UsedAt is not null || oauthState.ExpiresAt < DateTime.UtcNow)
            throw new BadRequestException("Invalid or expired Mercado Pago OAuth state.");

        var credential = await _oauthClient.ExchangeCodeForTokenAsync(
            code,
            oauthState.CodeVerifier);

        var account = await UpsertMercadoPagoAccountAsync(oauthState.UserId, credential);
        oauthState.UsedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return _mapper.Map<MercadoPagoConnectionStatusDto>(account);
    }

    public async Task<MercadoPagoConnectionStatusDto> GetConnectionStatusAsync(int userId)
    {
        await EnsureCanConnectOAuthAsync(userId);

        var account = await _context.MercadoPagoAccounts
            .AsNoTracking()
            .FirstOrDefaultAsync(item => item.UserId == userId);

        return account is null
            ? new MercadoPagoConnectionStatusDto()
            : _mapper.Map<MercadoPagoConnectionStatusDto>(account);
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

        var receiverUserId = GetReceiverUserId(charge);
        var account = await GetConnectedAccountOrThrowAsync(receiverUserId);
        await EnsureValidAccessTokenAsync(account);

        var externalReference = BuildExternalReference(charge.Id);
        var request = BuildCheckoutPreferenceRequest(charge, externalReference);
        var requestOptions = new RequestOptions
        {
            AccessToken = account.AccessToken
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
        catch (MercadoPagoApiException exception)
        {
            throw new BadRequestException($"Mercado Pago checkout error: {exception.Message}");
        }
        catch (MercadoPagoException exception)
        {
            throw new BadRequestException($"Mercado Pago checkout error: {exception.Message}");
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

        var eventType = string.IsNullOrWhiteSpace(queryType)
            ? notification.Type
            : queryType;

        if (!string.Equals(eventType, "payment", StringComparison.OrdinalIgnoreCase))
            return;

        var dataId = string.IsNullOrWhiteSpace(queryDataId)
            ? notification.Data?.GetId()
            : queryDataId;

        if (!long.TryParse(dataId, out var mercadoPagoPaymentId))
            throw new BadRequestException("Mercado Pago payment ID is invalid.");

        if (!notification.UserId.HasValue)
            throw new BadRequestException("Mercado Pago webhook user ID is required.");

        var account = await _context.MercadoPagoAccounts
            .FirstOrDefaultAsync(item => item.MercadoPagoUserId == notification.UserId.Value);

        if (account is null)
        {
            _logger.LogWarning(
                "Ignoring Mercado Pago webhook {RequestId}: receiver {MercadoPagoUserId} is not connected.",
                requestId,
                notification.UserId.Value);
            return;
        }

        await EnsureValidAccessTokenAsync(account);

        var mercadoPagoPayment = await _paymentClient.GetAsync(
            mercadoPagoPaymentId,
            account.AccessToken);

        if (mercadoPagoPayment.CollectorId != account.MercadoPagoUserId)
            throw new ForbiddenException("Mercado Pago payment receiver does not match the connected account.");

        var trackedPayment = await _context.MercadoPagoPayments
            .Include(item => item.Charge)
            .FirstOrDefaultAsync(item =>
                item.ExternalReference == mercadoPagoPayment.ExternalReference &&
                item.MercadoPagoAccountId == account.Id);

        if (trackedPayment is null)
        {
            _logger.LogWarning(
                "Ignoring Mercado Pago payment {PaymentId}: external reference {ExternalReference} was not created by this application.",
                mercadoPagoPayment.Id,
                mercadoPagoPayment.ExternalReference);
            return;
        }

        if (trackedPayment.PaymentId.HasValue)
            return;

        ApplyPaymentStatus(trackedPayment, mercadoPagoPayment);

        if (!string.Equals(mercadoPagoPayment.Status, "approved", StringComparison.OrdinalIgnoreCase))
        {
            await _context.SaveChangesAsync();
            return;
        }

        if (!string.Equals(mercadoPagoPayment.CurrencyId, "BRL", StringComparison.OrdinalIgnoreCase) ||
            mercadoPagoPayment.TransactionAmount != trackedPayment.Charge.Value)
        {
            trackedPayment.Status = "review_required";
            trackedPayment.StatusDetail = "Payment currency or amount does not match the charge.";
            await _context.SaveChangesAsync();

            _logger.LogError(
                "Mercado Pago payment {PaymentId} does not match charge {ChargeId}. Amount {Amount} {Currency}.",
                mercadoPagoPayment.Id,
                trackedPayment.ChargeId,
                mercadoPagoPayment.TransactionAmount,
                mercadoPagoPayment.CurrencyId);
            return;
        }

        if (trackedPayment.Charge.Status == ChargeStatus.Canceled)
        {
            trackedPayment.Status = "review_required";
            trackedPayment.StatusDetail = "Payment was approved for a canceled charge.";
            await _context.SaveChangesAsync();
            return;
        }

        if (trackedPayment.Charge.Status == ChargeStatus.Paid)
        {
            trackedPayment.Status = "approved_charge_already_paid";
            trackedPayment.StatusDetail = "Charge was already paid by another payment record.";
            await _context.SaveChangesAsync();
            return;
        }

        var payment = new Payment
        {
            ChargeId = trackedPayment.ChargeId,
            AmountPaid = mercadoPagoPayment.TransactionAmount,
            PaymentMethod = MapPaymentMethod(mercadoPagoPayment),
            Source = PaymentSource.MercadoPago,
            RegisteredByUserId = account.UserId,
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

        await CreatePaymentNotificationsAsync(trackedPayment.Charge);
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

    private async Task CreatePaymentNotificationsAsync(Charge charge)
    {
        if (charge.Scope == ChargeScope.Platform)
        {
            var adminUserIds = await _context.UserCondominiums
                .AsNoTracking()
                .Where(item =>
                    item.CondominiumId == charge.CondominiumId &&
                    item.Role == AppRoles.Admin &&
                    item.Status == UserCondominiumStatus.Active)
                .Select(item => item.UserId)
                .Distinct()
                .ToListAsync();

            await _notificationService.CreateManyAsync(
                adminUserIds,
                NotificationType.Payment,
                "Pagamento MORAE confirmado",
                "O pagamento pelo Mercado Pago foi confirmado.",
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
            "Pagamento confirmado",
            "O pagamento pelo Mercado Pago foi confirmado.",
            "/resident/bills",
            charge.CondominiumId);
    }

    private async Task<MercadoPagoAccount> UpsertMercadoPagoAccountAsync(
        int userId,
        MercadoPagoOAuthCredentialDto credential)
    {
        var account = await _context.MercadoPagoAccounts
            .FirstOrDefaultAsync(item => item.UserId == userId);

        if (account is null)
        {
            account = new MercadoPagoAccount
            {
                UserId = userId,
                ConnectedAt = DateTime.UtcNow
            };

            _context.MercadoPagoAccounts.Add(account);
        }

        ApplyCredential(account, credential);

        return account;
    }

    private async Task<MercadoPagoAccount> GetConnectedAccountOrThrowAsync(int userId)
    {
        var account = await _context.MercadoPagoAccounts
            .FirstOrDefaultAsync(item => item.UserId == userId);

        if (account is null || string.IsNullOrWhiteSpace(account.AccessToken))
            throw new BadRequestException("Receiver does not have a connected Mercado Pago account.");

        return account;
    }

    private async Task EnsureValidAccessTokenAsync(MercadoPagoAccount account)
    {
        if (account.ExpiresAt > DateTime.UtcNow.AddMinutes(5))
            return;

        if (string.IsNullOrWhiteSpace(account.RefreshToken))
            throw new BadRequestException("Mercado Pago refresh token is not available.");

        var credential = await _oauthClient.RefreshTokenAsync(account.RefreshToken);
        ApplyCredential(account, credential);

        await _context.SaveChangesAsync();
    }

    private static void ApplyCredential(
        MercadoPagoAccount account,
        MercadoPagoOAuthCredentialDto credential)
    {
        account.MercadoPagoUserId = credential.UserId;
        account.PublicKey = credential.PublicKey ?? string.Empty;
        account.AccessToken = credential.AccessToken ?? string.Empty;
        account.RefreshToken = credential.RefreshToken ?? account.RefreshToken;
        account.TokenType = credential.TokenType ?? string.Empty;
        account.Scope = credential.Scope ?? string.Empty;
        account.LiveMode = credential.LiveMode;
        account.ExpiresAt = DateTime.UtcNow.AddSeconds(Math.Max(credential.ExpiresIn - 60, 0));
        account.UpdatedAt = DateTime.UtcNow;
    }

    private async Task EnsureCanConnectOAuthAsync(int userId)
    {
        var user = await _userManager.FindByIdAsync(userId.ToString());

        if (user is null)
            throw new NotFoundException("User not found.");

        var isMaster = await _userManager.IsInRoleAsync(user, AppRoles.Master);
        var isAdmin = await _userManager.IsInRoleAsync(user, AppRoles.Admin);

        if (!isMaster && !isAdmin)
            throw new ForbiddenException("Only Master and Admin can connect Mercado Pago.");
    }

    private async Task EnsureCanCreateCheckoutAsync(int userId, Charge charge)
    {
        var user = await _userManager.FindByIdAsync(userId.ToString());

        if (user is null)
            throw new NotFoundException("User not found.");

        if (charge.Scope == ChargeScope.Platform)
        {
            if (await IsCondominiumAdminAsync(userId, charge.CondominiumId))
                return;

            throw new ForbiddenException("User cannot pay this platform charge.");
        }

        if (charge.Scope == ChargeScope.Condominium)
        {
            if (await IsCondominiumAdminAsync(userId, charge.CondominiumId) ||
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

    private static int GetReceiverUserId(Charge charge)
    {
        return charge.Scope == ChargeScope.Platform
            ? charge.Condominium.CreatedByUserId
            : charge.CreatedByUserId;
    }

    private async Task<bool> IsCondominiumAdminAsync(int userId, int condominiumId)
    {
        return await _context.UserCondominiums
            .AsNoTracking()
            .AnyAsync(userCondominium =>
                userCondominium.UserId == userId &&
                userCondominium.CondominiumId == condominiumId &&
                userCondominium.Role == AppRoles.Admin &&
                userCondominium.Status == UserCondominiumStatus.Active);
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

        if (string.IsNullOrWhiteSpace(_settings.CheckoutSuccessUrl) ||
            string.IsNullOrWhiteSpace(_settings.CheckoutFailureUrl) ||
            string.IsNullOrWhiteSpace(_settings.CheckoutPendingUrl))
        {
            throw new BadRequestException("Mercado Pago checkout return URLs are not configured.");
        }
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
                Success = _settings.CheckoutSuccessUrl,
                Failure = _settings.CheckoutFailureUrl,
                Pending = _settings.CheckoutPendingUrl
            },
            AutoReturn = "approved",
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
