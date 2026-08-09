using AutoMapper;
using backend.Constants;
using backend.Data;
using backend.DTOs.FinancialAccount;
using backend.Enums;
using backend.Exceptions;
using backend.Models;
using backend.Services.Permissions;
using Microsoft.EntityFrameworkCore;

namespace backend.Services.FinancialAccounts;

public class FinancialAccountService : IFinancialAccountService
{
    private readonly AppDbContext _context;
    private readonly IMapper _mapper;
    private readonly IPermissionService _permissionService;

    public FinancialAccountService(
        AppDbContext context,
        IMapper mapper,
        IPermissionService permissionService)
    {
        _context = context;
        _mapper = mapper;
        _permissionService = permissionService;
    }

    public async Task<FinancialAccountResponseDto?> GetPlatformAsync(int userId)
    {
        var canReadPlatformAccount =
            await _permissionService.IsMasterAsync(userId) ||
            await _permissionService.IsAdminAsync(userId);

        if (!canReadPlatformAccount)
            throw new ForbiddenException("Only Master or Admin can access platform payment information.");

        var account = await BuildResponseQuery()
            .FirstOrDefaultAsync(account => account.Scope == FinancialAccountScope.Platform);

        return account is null ? null : _mapper.Map<FinancialAccountResponseDto>(account);
    }

    public async Task<FinancialAccountResponseDto> UpsertPlatformAsync(
        int userId,
        UpsertFinancialAccountDto dto)
    {
        await _permissionService.EnsureMasterAsync(userId);

        ValidateDto(dto);

        var account = await _context.FinancialAccounts
            .FirstOrDefaultAsync(account => account.Scope == FinancialAccountScope.Platform);

        if (account is null)
        {
            account = new FinancialAccount
            {
                Scope = FinancialAccountScope.Platform,
                CreatedAt = DateTime.UtcNow
            };

            _context.FinancialAccounts.Add(account);
        }

        ApplyChanges(account, dto, userId);

        await _context.SaveChangesAsync();

        return await GetResponseOrThrowAsync(account.Id);
    }

    public async Task<FinancialAccountResponseDto?> GetByCondominiumAsync(
        int userId,
        int condominiumId)
    {
        await _permissionService.EnsureCondominiumAdminAsync(userId, condominiumId);

        var account = await BuildResponseQuery()
            .FirstOrDefaultAsync(account =>
                account.Scope == FinancialAccountScope.Condominium &&
                account.CondominiumId == condominiumId);

        return account is null ? null : _mapper.Map<FinancialAccountResponseDto>(account);
    }

    public async Task<FinancialAccountResponseDto> UpsertByCondominiumAsync(
        int userId,
        int condominiumId,
        UpsertFinancialAccountDto dto)
    {
        await _permissionService.EnsureCondominiumAdminAsync(userId, condominiumId);

        ValidateDto(dto);

        var condominiumExists = await _context.Condominiums
            .AsNoTracking()
            .AnyAsync(condominium => condominium.Id == condominiumId);

        if (!condominiumExists)
            throw new NotFoundException("Condominium not found.");

        var account = await _context.FinancialAccounts
            .FirstOrDefaultAsync(account =>
                account.Scope == FinancialAccountScope.Condominium &&
                account.CondominiumId == condominiumId);

        if (account is null)
        {
            account = new FinancialAccount
            {
                Scope = FinancialAccountScope.Condominium,
                CondominiumId = condominiumId,
                CreatedAt = DateTime.UtcNow
            };

            _context.FinancialAccounts.Add(account);
        }

        ApplyChanges(account, dto, userId);

        await _context.SaveChangesAsync();

        return await GetResponseOrThrowAsync(account.Id);
    }

    private IQueryable<FinancialAccount> BuildResponseQuery()
    {
        return _context.FinancialAccounts
            .AsNoTracking()
            .Include(account => account.Condominium);
    }

    private async Task<FinancialAccountResponseDto> GetResponseOrThrowAsync(int id)
    {
        var account = await BuildResponseQuery()
            .FirstOrDefaultAsync(account => account.Id == id);

        if (account is null)
            throw new NotFoundException("Financial account not found.");

        return _mapper.Map<FinancialAccountResponseDto>(account);
    }

    private static void ApplyChanges(
        FinancialAccount account,
        UpsertFinancialAccountDto dto,
        int userId)
    {
        account.HolderName = "Pix";
        account.HolderDocument = "00000000000";
        account.BankName = "Pix";
        account.BankCode = "0";
        account.Agency = "0";
        account.AccountNumber = "0";
        account.AccountDigit = null;
        account.AccountType = BankAccountType.Checking;
        account.PixKeyType = PixKeyType.Random;
        account.PixKey = dto.PixKey.Trim();
        account.UpdatedByUserId = userId;
        account.UpdatedAt = DateTime.UtcNow;
    }

    private static void ValidateDto(UpsertFinancialAccountDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.PixKey))
            throw new BadRequestException("Pix key is required.");
    }
}
