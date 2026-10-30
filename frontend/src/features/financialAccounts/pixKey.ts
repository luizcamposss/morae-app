// Pix key types, masks and validation. Mirrors backend PixKeyValidator: CPF/CNPJ go as digits,
// phone as +55DDDNUMBER, e-mail in lowercase and the random key as a lowercase UUID.
export const PixKeyType = {
  Cpf: 1,
  Cnpj: 2,
  Email: 3,
  Phone: 4,
  Random: 5,
} as const;

export type PixKeyType = (typeof PixKeyType)[keyof typeof PixKeyType];

export const pixKeyTypeLabels: Record<PixKeyType, string> = {
  [PixKeyType.Cpf]: "CPF",
  [PixKeyType.Cnpj]: "CNPJ",
  [PixKeyType.Email]: "E-mail",
  [PixKeyType.Phone]: "Celular",
  [PixKeyType.Random]: "Chave aleatória",
};

export const pixKeyTypeOptions = Object.values(PixKeyType).map((value) => ({
  value: String(value),
  label: pixKeyTypeLabels[value],
}));

export const pixKeyPlaceholders: Record<PixKeyType, string> = {
  [PixKeyType.Cpf]: "000.000.000-00",
  [PixKeyType.Cnpj]: "00.000.000/0000-00",
  [PixKeyType.Email]: "financeiro@condominio.com.br",
  [PixKeyType.Phone]: "(11) 98765-4321",
  [PixKeyType.Random]: "123e4567-e89b-12d3-a456-426614174000",
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const digitsOf = (value: string) => value.replace(/\D/g, "");

function checkDigit(digits: string, weights: number[]) {
  const sum = weights.reduce((total, weight, index) => total + Number(digits[index]) * weight, 0);
  const rest = sum % 11;
  return rest < 2 ? 0 : 11 - rest;
}

export function isValidCpf(value: string) {
  const cpf = digitsOf(value);
  if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) return false;
  return (
    checkDigit(cpf, [10, 9, 8, 7, 6, 5, 4, 3, 2]) === Number(cpf[9]) &&
    checkDigit(cpf, [11, 10, 9, 8, 7, 6, 5, 4, 3, 2]) === Number(cpf[10])
  );
}

export function isValidCnpj(value: string) {
  const cnpj = digitsOf(value);
  if (cnpj.length !== 14 || /^(\d)\1+$/.test(cnpj)) return false;
  return (
    checkDigit(cnpj, [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]) === Number(cnpj[12]) &&
    checkDigit(cnpj, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]) === Number(cnpj[13])
  );
}

// National mobile number (DDD + 9 digits starting with 9), with or without +55.
function phoneDigits(value: string) {
  const digits = digitsOf(value);
  return digits.length === 13 && digits.startsWith("55") ? digits.slice(2) : digits;
}

function isValidPhone(value: string) {
  return /^[1-9]{2}9\d{8}$/.test(phoneDigits(value));
}

// Applies the mask while typing.
export function formatPixKeyInput(type: PixKeyType, value: string) {
  if (type === PixKeyType.Cpf) {
    const d = digitsOf(value).slice(0, 11);
    return d.replace(/^(\d{3})(\d)/, "$1.$2").replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3").replace(/\.(\d{3})(\d)/, ".$1-$2");
  }
  if (type === PixKeyType.Cnpj) {
    const d = digitsOf(value).slice(0, 14);
    return d
      .replace(/^(\d{2})(\d)/, "$1.$2")
      .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/\.(\d{3})(\d)/, ".$1/$2")
      .replace(/(\d{4})(\d)/, "$1-$2");
  }
  if (type === PixKeyType.Phone) {
    const d = phoneDigits(value).slice(0, 11);
    if (d.length <= 2) return d.length ? `(${d}` : "";
    if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  }
  if (type === PixKeyType.Random) return value.trim().toLowerCase().slice(0, 36);
  return value.trim();
}

// Returns the error message, or null when the key matches its type.
export function validatePixKey(type: PixKeyType, value: string): string | null {
  if (!value.trim()) return "Informe a chave Pix.";
  switch (type) {
    case PixKeyType.Cpf:
      return isValidCpf(value) ? null : "CPF inválido. Confira os 11 números.";
    case PixKeyType.Cnpj:
      return isValidCnpj(value) ? null : "CNPJ inválido. Confira os 14 números.";
    case PixKeyType.Email:
      return EMAIL_PATTERN.test(value.trim()) && value.trim().length <= 77 ? null : "E-mail inválido.";
    case PixKeyType.Phone:
      return isValidPhone(value) ? null : "Celular inválido. Informe o DDD e os 9 números.";
    case PixKeyType.Random:
      return UUID_PATTERN.test(value.trim()) ? null : "Chave aleatória inválida. Ela tem 32 letras e números separados por hífens.";
  }
}

// What goes to the API (and to the payer's bank).
export function normalizePixKey(type: PixKeyType, value: string) {
  if (type === PixKeyType.Cpf || type === PixKeyType.Cnpj) return digitsOf(value);
  if (type === PixKeyType.Phone) return `+55${phoneDigits(value)}`;
  return value.trim().toLowerCase();
}

// Readable version of a stored key, e.g. for the payer.
export function displayPixKey(type: PixKeyType, value: string) {
  if (type === PixKeyType.Phone) return `+55 ${formatPixKeyInput(type, value)}`;
  if (type === PixKeyType.Cpf || type === PixKeyType.Cnpj) return formatPixKeyInput(type, value);
  return value;
}

// Keys saved before the type was asked: guess it by the format.
export function detectPixKeyType(value: string): PixKeyType | null {
  const key = value.trim();
  if (UUID_PATTERN.test(key)) return PixKeyType.Random;
  if (key.includes("@")) return EMAIL_PATTERN.test(key) ? PixKeyType.Email : null;
  if (key.startsWith("+")) return isValidPhone(key) ? PixKeyType.Phone : null;
  if (isValidCpf(key)) return PixKeyType.Cpf;
  if (isValidCnpj(key)) return PixKeyType.Cnpj;
  if (isValidPhone(key)) return PixKeyType.Phone;
  return null;
}

// "CNPJ · 12.345.678/0001-95", for summaries.
export function describePixKey(type: PixKeyType, value: string) {
  return `${pixKeyTypeLabels[type] ?? "Chave"} · ${displayPixKey(type, value)}`;
}
