// Same rule the backend enforces for new passwords (Program.cs + LetterPasswordValidator).
export const PASSWORD_MIN_LENGTH = 8;

export function getPasswordChecks(password: string) {
  return [
    { label: `${PASSWORD_MIN_LENGTH} caracteres ou mais`, isMet: password.length >= PASSWORD_MIN_LENGTH },
    { label: "Pelo menos uma letra", isMet: /\p{L}/u.test(password) },
    { label: "Pelo menos um número", isMet: /\d/.test(password) },
  ];
}

export function isStrongPassword(password: string) {
  return getPasswordChecks(password).every((check) => check.isMet);
}

export type PasswordStrength = {
  score: 0 | 1 | 2 | 3 | 4;
  label: string;
  tone: "empty" | "weak" | "medium" | "good";
};

// Visual feedback only: 1 bar per met rule, plus one when it is long (12+) or has a symbol.
export function getPasswordStrength(password: string): PasswordStrength {
  if (!password) return { score: 0, label: "Digite a senha", tone: "empty" };

  const met = getPasswordChecks(password).filter((check) => check.isMet).length;
  const isLongOrSymbol = password.length >= 12 || /[^\p{L}\d]/u.test(password);

  if (met === 3 && isLongOrSymbol) return { score: 4, label: "Forte", tone: "good" };
  if (met === 3) return { score: 3, label: "Boa", tone: "good" };
  if (met === 2) return { score: 2, label: "Média", tone: "medium" };
  return { score: 1, label: "Fraca", tone: "weak" };
}
