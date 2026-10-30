using System.Net.Mail;
using backend.Enums;
using backend.Exceptions;

namespace backend.Services.Validation;

// Validates and normalizes Pix keys the way banks expect them:
// CPF/CNPJ as digits, phone as +55DDDNUMBER, e-mail in lowercase, random key as a lowercase UUID.
public static class PixKeyValidator
{
    public static string Normalize(PixKeyType type, string key)
    {
        var value = key.Trim();

        switch (type)
        {
            case PixKeyType.Cpf:
                var cpf = Digits(value);
                if (!IsValidCpf(cpf))
                    throw new BadRequestException("CPF inválido. Confira os 11 números.");
                return cpf;

            case PixKeyType.Cnpj:
                var cnpj = Digits(value);
                if (!IsValidCnpj(cnpj))
                    throw new BadRequestException("CNPJ inválido. Confira os 14 números.");
                return cnpj;

            case PixKeyType.Email:
                var email = value.ToLowerInvariant();
                if (!IsValidEmail(email))
                    throw new BadRequestException("E-mail inválido.");
                return email;

            case PixKeyType.Phone:
                var phone = NormalizePhone(value)
                    ?? throw new BadRequestException("Celular inválido. Informe o DDD e os 9 números (ex.: (11) 98765-4321).");
                return phone;

            case PixKeyType.Random:
                if (!Guid.TryParseExact(value, "D", out var guid))
                    throw new BadRequestException("Chave aleatória inválida. Ela tem 32 letras e números separados por hífens.");
                return guid.ToString("D");

            default:
                throw new BadRequestException("Escolha o tipo da chave Pix.");
        }
    }

    // Keys saved before the type was asked were stored as Random; guess the real type by the format.
    public static PixKeyType ResolveType(PixKeyType storedType, string key)
    {
        if (storedType != PixKeyType.Random)
            return storedType;

        return Detect(key) ?? PixKeyType.Random;
    }

    public static PixKeyType? Detect(string key)
    {
        var value = key.Trim();

        if (Guid.TryParseExact(value, "D", out _))
            return PixKeyType.Random;
        if (value.Contains('@'))
            return IsValidEmail(value) ? PixKeyType.Email : null;
        if (value.StartsWith('+'))
            return NormalizePhone(value) is null ? null : PixKeyType.Phone;

        var digits = Digits(value);
        if (IsValidCpf(digits))
            return PixKeyType.Cpf;
        if (IsValidCnpj(digits))
            return PixKeyType.Cnpj;
        if (NormalizePhone(value) is not null)
            return PixKeyType.Phone;

        return null;
    }

    private static string Digits(string value) => new(value.Where(char.IsDigit).ToArray());

    // Accepts the number with or without +55; mobile numbers only (DDD + 9 digits starting with 9).
    private static string? NormalizePhone(string value)
    {
        var digits = Digits(value);
        if (digits.Length == 13 && digits.StartsWith("55"))
            digits = digits[2..];

        if (digits.Length != 11 || digits[0] == '0' || digits[1] == '0' || digits[2] != '9')
            return null;

        return "+55" + digits;
    }

    private static bool IsValidEmail(string value)
    {
        if (value.Length > 77 || value.Any(char.IsWhiteSpace))
            return false;

        return MailAddress.TryCreate(value, out var address) &&
            address.Address == value &&
            address.Host.Contains('.');
    }

    private static bool IsValidCpf(string cpf)
    {
        if (cpf.Length != 11 || cpf.Distinct().Count() == 1)
            return false;

        return CheckDigit(cpf[..9], [10, 9, 8, 7, 6, 5, 4, 3, 2]) == cpf[9] - '0' &&
            CheckDigit(cpf[..10], [11, 10, 9, 8, 7, 6, 5, 4, 3, 2]) == cpf[10] - '0';
    }

    private static bool IsValidCnpj(string cnpj)
    {
        if (cnpj.Length != 14 || cnpj.Distinct().Count() == 1)
            return false;

        return CheckDigit(cnpj[..12], [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]) == cnpj[12] - '0' &&
            CheckDigit(cnpj[..13], [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]) == cnpj[13] - '0';
    }

    private static int CheckDigit(string digits, int[] weights)
    {
        var sum = digits.Select((digit, index) => (digit - '0') * weights[index]).Sum();
        var rest = sum % 11;
        return rest < 2 ? 0 : 11 - rest;
    }
}
