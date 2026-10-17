export function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

// "11999999999" → "(11) 99999-9999"; anything too short stays as typed.
export function formatPhone(value: string) {
  const digits = onlyDigits(value);
  if (digits.length < 10) return value;
  return digits.length === 11 ? `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}` : `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
}
