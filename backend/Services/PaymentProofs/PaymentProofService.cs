using backend.Constants;
using backend.Data;
using backend.DTOs.PaymentProof;
using backend.Enums;
using backend.Exceptions;
using backend.Models;
using backend.Services.Charges;
using backend.Services.FinancialAccounts;
using backend.Services.Notifications;
using backend.Services.Permissions;
using backend.Services.Storage;
using backend.Services.Validation;
using Microsoft.EntityFrameworkCore;

namespace backend.Services.PaymentProofs;

// Pix by hand: when the condominium has no Mercado Pago, the payer transfers to its Pix key and
// sends the receipt here. The management settles the charge with the manual payment (which
// accepts the pending receipts) or rejects the receipt with a reason.
public class PaymentProofService : IPaymentProofService
{
    private const long MaxFileSizeBytes = 10 * 1024 * 1024;

    private readonly AppDbContext _context;
    private readonly IPermissionService _permissionService;
    private readonly IFinancialAccountService _financialAccountService;
    private readonly INotificationService _notificationService;
    private readonly IFileStorage _fileStorage;
    private readonly ILogger<PaymentProofService> _logger;

    public PaymentProofService(
        AppDbContext context,
        IPermissionService permissionService,
        IFinancialAccountService financialAccountService,
        INotificationService notificationService,
        IFileStorage fileStorage,
        ILogger<PaymentProofService> logger)
    {
        _context = context;
        _permissionService = permissionService;
        _financialAccountService = financialAccountService;
        _notificationService = notificationService;
        _fileStorage = fileStorage;
        _logger = logger;
    }

    public async Task<ChargePixInfoDto> GetPixInfoAsync(int userId, int chargeId)
    {
        var charge = await GetChargeOrThrowAsync(chargeId);

        await EnsureCanPayAsync(userId, charge);
        EnsureOpen(charge);

        var account = await _financialAccountService.GetCondominiumPixAccountAsync(charge.CondominiumId)
            ?? throw new NotFoundException("O condomínio ainda não cadastrou uma chave Pix. Fale com a administração.");

        return new ChargePixInfoDto
        {
            ChargeId = charge.Id,
            Description = charge.Description,
            CondominiumName = charge.Condominium.Name,
            PixKey = account.PixKey,
            PixKeyType = PixKeyValidator.ResolveType(account.PixKeyType, account.PixKey),
            // The account form today saves only the key; "Pix" is its placeholder for the holder.
            HolderName = string.IsNullOrWhiteSpace(account.HolderName) || account.HolderName == "Pix" ? null : account.HolderName,
            Amount = ChargeLateFees.Calculate(charge, AppTimeZone.Today).Total
        };
    }

    public async Task<PaymentProofResponseDto> CreateAsync(int userId, int chargeId, CreatePaymentProofDto dto)
    {
        var charge = await GetChargeOrThrowAsync(chargeId);

        await EnsureCanPayAsync(userId, charge);
        EnsureOpen(charge);

        if (await _context.PaymentProofs.AnyAsync(proof =>
                proof.ChargeId == charge.Id &&
                proof.Status == PaymentProofStatus.Pending))
        {
            throw new BadRequestException("Já existe um comprovante desta cobrança aguardando a análise da gestão.");
        }

        if (dto.File is null || dto.File.Length == 0)
            throw new BadRequestException("Escolha o arquivo do comprovante.");

        if (dto.File.Length > MaxFileSizeBytes)
            throw new BadRequestException("O comprovante pode ter no máximo 10 MB.");

        await using var content = dto.File.OpenReadStream();

        // Checked by content like every other upload; only PDF and images here.
        var detected = UploadedFileInspector.Detect(content);

        if (detected is null || detected.Extension is not (".pdf" or ".jpg" or ".png"))
            throw new BadRequestException("Envie o comprovante em PDF, JPG ou PNG.");

        var proof = new PaymentProof
        {
            ChargeId = charge.Id,
            UploadedByUserId = userId,
            FileKey = $"payment-proofs/{charge.CondominiumId}/{Guid.NewGuid():N}",
            FileName = UploadedFileInspector.BuildFileName(dto.File.FileName, detected, "comprovante"),
            ContentType = detected.ContentType,
            Note = string.IsNullOrWhiteSpace(dto.Note) ? null : dto.Note.Trim(),
            Status = PaymentProofStatus.Pending,
            CreatedAt = DateTime.UtcNow
        };

        // File first, then the record: if saving the record fails, the file is removed again.
        await _fileStorage.SaveAsync(proof.FileKey, content);

        try
        {
            _context.PaymentProofs.Add(proof);
            await _context.SaveChangesAsync();
        }
        catch
        {
            await _fileStorage.DeleteAsync(proof.FileKey);
            throw;
        }

        await NotifyManagersAsync(charge);

        return await GetResponseAsync(proof.Id);
    }

    public async Task<IEnumerable<PaymentProofResponseDto>> GetByChargeAsync(int userId, int chargeId)
    {
        var charge = await GetChargeOrThrowAsync(chargeId);

        await EnsureCanReadAsync(userId, charge);

        return await BuildResponseQuery()
            .Where(proof => proof.ChargeId == chargeId)
            .OrderByDescending(proof => proof.CreatedAt)
            .ToListAsync();
    }

    public async Task<PaymentProofDownload> DownloadAsync(int userId, int proofId)
    {
        var proof = await _context.PaymentProofs
            .AsNoTracking()
            .Include(item => item.Charge)
                .ThenInclude(charge => charge.Condominium)
            .FirstOrDefaultAsync(item => item.Id == proofId)
            ?? throw new NotFoundException("Comprovante não encontrado.");

        await EnsureCanReadAsync(userId, proof.Charge);

        var content = await _fileStorage.OpenReadAsync(proof.FileKey);

        if (content is null)
        {
            _logger.LogError("Payment proof {ProofId} is missing from storage.", proofId);
            throw new NotFoundException("O arquivo do comprovante não está disponível.");
        }

        return new PaymentProofDownload(content, proof.ContentType, proof.FileName);
    }

    public async Task<PaymentProofResponseDto> RejectAsync(int userId, int proofId, RejectPaymentProofDto dto)
    {
        var proof = await _context.PaymentProofs
            .Include(item => item.Charge)
                .ThenInclude(charge => charge.Condominium)
            .FirstOrDefaultAsync(item => item.Id == proofId)
            ?? throw new NotFoundException("Comprovante não encontrado.");

        await EnsureCanManageAsync(userId, proof.Charge);

        if (proof.Status != PaymentProofStatus.Pending)
            throw new BadRequestException("Este comprovante já foi analisado.");

        var reason = dto.Reason?.Trim();

        if (string.IsNullOrWhiteSpace(reason))
            throw new BadRequestException("Informe o motivo da recusa.");

        proof.Status = PaymentProofStatus.Rejected;
        proof.RejectionReason = reason;
        proof.ReviewedByUserId = userId;
        proof.ReviewedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        await _notificationService.CreateAsync(
            proof.UploadedByUserId,
            NotificationType.Payment,
            "Comprovante recusado",
            $"A gestão recusou o comprovante de \"{proof.Charge.Description}\": {reason}",
            await GetPayerLinkAsync(proof.UploadedByUserId, proof.Charge.CondominiumId),
            proof.Charge.CondominiumId);

        return await GetResponseAsync(proof.Id);
    }

    private async Task<Charge> GetChargeOrThrowAsync(int chargeId)
    {
        return await _context.Charges
            .AsNoTracking()
            .Include(charge => charge.Condominium)
            .Include(charge => charge.Unit)
            .FirstOrDefaultAsync(charge => charge.Id == chargeId)
            ?? throw new NotFoundException("Cobrança não encontrada.");
    }

    private static void EnsureOpen(Charge charge)
    {
        if (charge.Status == ChargeStatus.Paid)
            throw new BadRequestException("Esta cobrança já foi paga.");

        if (charge.Status == ChargeStatus.Canceled)
            throw new BadRequestException("Cobranças canceladas não podem ser pagas.");

        if (charge.Status == ChargeStatus.Renegotiated)
            throw new BadRequestException("Esta cobrança foi renegociada num acordo; pague as parcelas do acordo.");

        if (charge.Status == ChargeStatus.Draft)
            throw new BadRequestException("Esta conta ainda não foi enviada.");

        // The condominium's Pix key never receives the owner's rent: it is paid online to the owner.
        if (charge.ReceiverPersonId.HasValue)
            throw new BadRequestException("Este aluguel é pago pelo app, direto para a conta do proprietário.");
    }

    // Same rule as paying online: the Admin or a payer of the charge (a syndic pays only their own unit).
    // Only condominium charges: the Moraê invoices are paid to the platform, not to the condominium.
    private async Task EnsureCanPayAsync(int userId, Charge charge)
    {
        if (charge.Scope != ChargeScope.Condominium)
            throw new BadRequestException("O comprovante por Pix vale só para cobranças do condomínio.");

        if (charge.Condominium.Status != Status.Active)
            throw new ForbiddenException("Este condomínio está inativo.");

        if (!await CanPayAsync(userId, charge))
            throw new ForbiddenException("Você não pode pagar esta cobrança.");
    }

    private async Task<bool> CanPayAsync(int userId, Charge charge)
    {
        return await _permissionService.IsCondominiumAdminAsync(userId, charge.CondominiumId) ||
               await _permissionService.IsChargePayerAsync(userId, charge);
    }

    // The same permission as the manual payment: Admin, or a syndic with charges.mark_as_paid
    // in the buildings they manage.
    private async Task EnsureCanManageAsync(int userId, Charge charge)
    {
        if (!await CanManageAsync(userId, charge))
            throw new ForbiddenException("Você não tem permissão para analisar comprovantes desta cobrança.");
    }

    private async Task<bool> CanManageAsync(int userId, Charge charge)
    {
        if (charge.Scope != ChargeScope.Condominium)
            return false;

        var role = await _permissionService.GetCondominiumRoleAsync(userId, charge.CondominiumId);

        if (role == AppRoles.Admin)
            return true;

        return role == AppRoles.Syndic &&
               charge.UnitId.HasValue &&
               await _permissionService.HasCondominiumPermissionAsync(userId, charge.CondominiumId, AppPermissions.ChargesMarkAsPaid) &&
               await _permissionService.HasUnitAccessAsync(userId, charge.UnitId.Value);
    }

    // The management and whoever pays the charge (to see their own receipts).
    private async Task EnsureCanReadAsync(int userId, Charge charge)
    {
        if (charge.Scope == ChargeScope.Condominium &&
            (await CanManageAsync(userId, charge) || await CanPayAsync(userId, charge)))
        {
            return;
        }

        throw new ForbiddenException("Você não tem acesso aos comprovantes desta cobrança.");
    }

    private IQueryable<PaymentProofResponseDto> BuildResponseQuery()
    {
        return _context.PaymentProofs
            .AsNoTracking()
            .Select(proof => new PaymentProofResponseDto
            {
                Id = proof.Id,
                ChargeId = proof.ChargeId,
                UploadedByUserId = proof.UploadedByUserId,
                UploadedByName = proof.UploadedByUser.Person.Name,
                FileName = proof.FileName,
                ContentType = proof.ContentType,
                Note = proof.Note,
                Status = proof.Status,
                RejectionReason = proof.RejectionReason,
                ReviewedByName = proof.ReviewedByUser == null ? null : proof.ReviewedByUser.Person.Name,
                ReviewedAt = proof.ReviewedAt,
                CreatedAt = proof.CreatedAt
            });
    }

    private async Task<PaymentProofResponseDto> GetResponseAsync(int proofId)
    {
        return await BuildResponseQuery().FirstAsync(proof => proof.Id == proofId);
    }

    // Admins of the condominium and the syndics who can settle charges of the unit's building.
    private async Task NotifyManagersAsync(Charge charge)
    {
        var buildingId = charge.Unit?.BuildingId;

        var managerUserIds = await _context.UserCondominiums
            .AsNoTracking()
            .Where(link =>
                link.CondominiumId == charge.CondominiumId &&
                link.Status == UserCondominiumStatus.Active &&
                (link.Role == AppRoles.Admin ||
                 (link.Role == AppRoles.Syndic &&
                  link.Permissions.Any(permission => permission.PermissionKey == AppPermissions.ChargesMarkAsPaid) &&
                  (link.ManagesAllBuildings || link.Buildings.Any(building => building.BuildingId == buildingId)))))
            .Select(link => new { link.UserId, link.Role })
            .ToListAsync();

        var place = charge.Unit is null ? string.Empty : $" da unidade {charge.Unit.Number}";
        var title = "Comprovante de Pix enviado";
        var message = $"Chegou um comprovante de \"{charge.Description}\"{place}. Confira e dê baixa.";

        await _notificationService.CreateManyAsync(
            managerUserIds.Where(item => item.Role == AppRoles.Admin).Select(item => item.UserId).Distinct(),
            NotificationType.Payment,
            title,
            message,
            "/admin/payments",
            charge.CondominiumId);

        await _notificationService.CreateManyAsync(
            managerUserIds.Where(item => item.Role == AppRoles.Syndic).Select(item => item.UserId).Distinct(),
            NotificationType.Payment,
            title,
            message,
            "/syndic/finance",
            charge.CondominiumId);
    }

    private async Task<string> GetPayerLinkAsync(int userId, int condominiumId)
    {
        var role = await _permissionService.GetCondominiumRoleAsync(userId, condominiumId);

        return role == AppRoles.Admin ? "/admin/payments" : "/resident/bills";
    }
}
