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
        await _permissionService.EnsureMasterAsync(userId);

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
        account.HolderName = dto.HolderName.Trim();
        account.HolderDocument = OnlyDigits(dto.HolderDocument);
        account.BankName = dto.BankName.Trim();
        account.BankCode = OnlyDigits(dto.BankCode);
        account.Agency = OnlyDigits(dto.Agency);
        account.AccountNumber = OnlyDigits(dto.AccountNumber);
        account.AccountDigit = string.IsNullOrWhiteSpace(dto.AccountDigit)
            ? null
            : OnlyDigits(dto.AccountDigit);
        account.AccountType = dto.AccountType;
        account.PixKeyType = dto.PixKeyType;
        account.PixKey = NormalizePixKey(dto.PixKey, dto.PixKeyType);
        account.UpdatedByUserId = userId;
        account.UpdatedAt = DateTime.UtcNow;
    }

    private static void ValidateDto(UpsertFinancialAccountDto dto)
    {
        var holderDocument = OnlyDigits(dto.HolderDocument);

        if (holderDocument.Length is not 11 and not 14)
            throw new BadRequestException("Holder document must be a CPF or CNPJ.");

        if (!Enum.IsDefined(dto.AccountType))
            throw new BadRequestException("Invalid bank account type.");

        if (!Enum.IsDefined(dto.PixKeyType))
            throw new BadRequestException("Invalid Pix key type.");

        if (dto.PixKeyType == PixKeyType.Cpf && OnlyDigits(dto.PixKey).Length != 11)
            throw new BadRequestException("Pix CPF key must have 11 digits.");

        if (dto.PixKeyType == PixKeyType.Cnpj && OnlyDigits(dto.PixKey).Length != 14)
            throw new BadRequestException("Pix CNPJ key must have 14 digits.");

        if (dto.PixKeyType == PixKeyType.Email && !dto.PixKey.Contains('@'))
            throw new BadRequestException("Pix email key must be a valid email.");

        if (dto.PixKeyType == PixKeyType.Phone && OnlyDigits(dto.PixKey).Length < 10)
            throw new BadRequestException("Pix phone key must have a valid phone number.");
    }

    private static string NormalizePixKey(string value, PixKeyType type)
    {
        return type is PixKeyType.Cpf or PixKeyType.Cnpj or PixKeyType.Phone
            ? OnlyDigits(value)
            : value.Trim();
    }

    private static string OnlyDigits(string value)
    {
        return new string(value.Where(char.IsDigit).ToArray());
    }
}
