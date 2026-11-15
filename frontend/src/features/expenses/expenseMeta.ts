import { Briefcase, CircleEllipsis, Droplets, Flame, Landmark, Lightbulb, ShieldCheck, Sparkles, Tag, Umbrella, Users, Wrench, type LucideIcon } from "lucide-react";
import { formatFileSize } from "../documents/documentMeta";

export const RECEIPT_ACCEPT = ".pdf,.jpg,.jpeg,.png";
const RECEIPT_MAX_BYTES = 20 * 1024 * 1024;

// Icon and card hint of the default categories (iconKey from the API). Custom ones get a tag.
const defaultCategoryLook: Record<string, { icon: LucideIcon; hint: string }> = {
  water: { icon: Droplets, hint: "Conta da concessionária" },
  electricity: { icon: Lightbulb, hint: "Áreas comuns e bombas" },
  gas: { icon: Flame, hint: "Conta do gás" },
  payroll: { icon: Users, hint: "Salários, INSS, FGTS" },
  cleaning: { icon: Sparkles, hint: "Produtos e serviço" },
  maintenance: { icon: Wrench, hint: "Reparos e contratos" },
  security: { icon: ShieldCheck, hint: "Portaria e câmeras" },
  administration: { icon: Briefcase, hint: "Administradora, contador" },
  insurance: { icon: Umbrella, hint: "Seguro do prédio" },
  taxes: { icon: Landmark, hint: "Tarifas e tributos" },
  other: { icon: CircleEllipsis, hint: "Qualquer outra conta" },
};

export function expenseCategoryIcon(iconKey: string | null | undefined): LucideIcon {
  return (iconKey && defaultCategoryLook[iconKey]?.icon) || Tag;
}

export function expenseCategoryHint(iconKey: string | null | undefined) {
  return (iconKey && defaultCategoryLook[iconKey]?.hint) || undefined;
}

// Quick check before uploading; the API still inspects the real content.
export function validateReceipt(file: File) {
  if (!/\.(pdf|jpe?g|png)$/i.test(file.name)) return "Envie o comprovante em PDF, JPG ou PNG.";
  if (file.size > RECEIPT_MAX_BYTES) return `O arquivo tem ${formatFileSize(file.size)}. O limite é 20 MB.`;
  if (file.size === 0) return "O arquivo está vazio. Escolha outro.";
  return "";
}

// --- Months ("YYYY-MM") ---

const monthFormatter = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" });
const shortMonthFormatter = new Intl.DateTimeFormat("pt-BR", { month: "short", year: "numeric", timeZone: "UTC" });

// Current month in São Paulo, from today's "YYYY-MM-DD".
export function monthOf(calendarDate: string) {
  return calendarDate.slice(0, 7);
}

export function shiftMonth(month: string, delta: number) {
  const [year, monthNumber] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year, monthNumber - 1 + delta, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function monthDate(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  return new Date(Date.UTC(year, monthNumber - 1, 1));
}

// "novembro de 2026".
export function monthLabel(month: string) {
  return monthFormatter.format(monthDate(month));
}

// "nov. de 2026".
export function shortMonthLabel(month: string) {
  return shortMonthFormatter.format(monthDate(month));
}
