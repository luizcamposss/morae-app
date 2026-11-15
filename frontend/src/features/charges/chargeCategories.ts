import { Building2, CircleEllipsis, Droplets, Flame, Gavel, Handshake, House, Lightbulb, PartyPopper, ReceiptText, Split, type LucideIcon } from "lucide-react";
import type { ChargeCategory } from "./types";

type CategoryInfo = {
  label: string;
  // Card title in the "Nova cobrança" wizard (shorter, as people say it).
  cardLabel: string;
  hint: string;
  icon: LucideIcon;
  // Water, electricity and gas can be billed by meter reading.
  isMetered?: boolean;
};

export const CHARGE_CATEGORIES: Record<ChargeCategory, CategoryInfo> = {
  1: { label: "Taxa de condomínio", cardLabel: "Condomínio", hint: "A taxa do mês", icon: Building2 },
  2: { label: "Aluguel", cardLabel: "Aluguel", hint: "Do inquilino, direto no app", icon: House },
  3: { label: "Água", cardLabel: "Água", hint: "Valor fixo ou pela leitura", icon: Droplets, isMetered: true },
  4: { label: "Luz", cardLabel: "Luz", hint: "Valor fixo ou pela leitura", icon: Lightbulb, isMetered: true },
  5: { label: "Gás", cardLabel: "Gás", hint: "Valor fixo ou pela leitura", icon: Flame, isMetered: true },
  6: { label: "Rateio", cardLabel: "Rateio", hint: "Obra ou despesa dividida", icon: Split },
  7: { label: "Multa", cardLabel: "Multa", hint: "Infração do regimento", icon: Gavel },
  8: { label: "Reserva", cardLabel: "Reserva", hint: "Salão, churrasqueira", icon: PartyPopper },
  9: { label: "Acordo", cardLabel: "Acordo", hint: "Parcela de dívida negociada", icon: Handshake },
  10: { label: "Outros", cardLabel: "Outro", hint: "Qualquer outra cobrança", icon: CircleEllipsis },
  11: { label: "Conta do mês", cardLabel: "Conta do mês", hint: "Vários itens numa conta só", icon: ReceiptText },
};

// What a monthly bill item can be (the other categories have their own flow).
export const INVOICE_ITEM_CATEGORIES: ChargeCategory[] = [2, 3, 4, 5, 1, 6, 7, 10];

// Cards of the wizard's first step, in the order people look for them.
export const WIZARD_CATEGORIES: ChargeCategory[] = [1, 2, 3, 4, 5, 6, 7, 10];

export const categoryOptions = (Object.keys(CHARGE_CATEGORIES) as unknown as ChargeCategory[]).map((value) => ({
  value: String(value),
  label: CHARGE_CATEGORIES[value].label,
}));

export function categoryLabel(category: ChargeCategory | null | undefined) {
  return category ? (CHARGE_CATEGORIES[category]?.label ?? "Outros") : "Outros";
}

// Unit of the meter reading of a metered category.
export function meterUnit(category: ChargeCategory) {
  return category === 4 ? "kWh" : "m³";
}
