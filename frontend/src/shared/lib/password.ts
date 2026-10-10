// Same rule the backend enforces for new passwords (Program.cs + LetterPasswordValidator).
export const PASSWORD_MIN_LENGTH = 8;

export function getPasswordChecks(password: string) {
  return [
    { label: `Pelo menos ${PASSWORD_MIN_LENGTH} caracteres`, isMet: password.length >= PASSWORD_MIN_LENGTH },
    { label: "Uma letra", isMet: /\p{L}/u.test(password) },
    { label: "Um número", isMet: /\d/.test(password) },
  ];
}

export function isStrongPassword(password: string) {
  return getPasswordChecks(password).every((check) => check.isMet);
}
