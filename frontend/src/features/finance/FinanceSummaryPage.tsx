import { useEffect, useState, type ReactNode } from "react";
import { CalendarClock, Check, FileCheck, Gauge, Handshake, Send, TriangleAlert, Wallet } from "lucide-react";
import { useCondominium } from "../../app/providers/useCondominium";
import { ButtonLink } from "../../shared/components/Button";
import { SummaryCard } from "../../shared/components/SummaryCard";
import { PageHeader } from "../../shared/layout/PageHeader";
import { formatCurrency } from "../../shared/lib/currency";
import { formatCalendarDate, todayInputDate } from "../../shared/lib/date";
import { amountDue } from "../adminPayments/chargeForm";
import { getChargesByCondominium } from "../charges/chargeService";
import { CHARGE_STATUS, currentMonthName } from "../charges/platformRevenue";
import type { ChargeResponse } from "../charges/types";
import { getUtilityMonth } from "../consumption/consumptionService";
import { monthLabel, shiftMonth } from "../expenses/expenseMeta";
import { getInvoiceMonth, type InvoiceResponse } from "../invoices/invoiceService";
import { useModuleEnabled } from "../modules/modules";
import { getRentalContracts, type RentalContract } from "../rentals/rentalService";
import { useIsSyndicArea, useSyndicCan } from "../syndicAccess/useSyndicAccess";
import { FinanceTabs } from "./FinanceTabs";

type SummaryData = {
  condominiumId: number;
  charges: ChargeResponse[];
  drafts: InvoiceResponse[];
  autoSendDays: number | null;
  unitsWithoutUtilities: number;
  utilitiesMonth: string;
  adjustments: RentalContract[];
};

type Todo = { key: string; icon: ReactNode; tone?: "danger" | "warning"; title: string; subtitle: string; action: { label: string; to: string } };

const orEmpty = <T,>(promise: Promise<T>, fallback: T) => promise.catch(() => fallback);

// Financeiro → Resumo (#210): the month in four numbers and what needs the management now.
export function FinanceSummaryPage() {
  const { activeCondominium, activeCondominiumId } = useCondominium();
  const isSyndic = useIsSyndicArea();
  const base = isSyndic ? "/syndic" : "/admin";
  const hasConsumption = useModuleEnabled("consumption");
  const hasRentalsModule = useModuleEnabled("rentals");
  const canManageRentals = useSyndicCan("rentals.manage");
  const hasAgreements = useModuleEnabled("agreements");
  const canCreate = useSyndicCan("charges.create");
  const hasRentals = hasRentalsModule && canManageRentals;
  const canAgree = hasAgreements && canCreate;
  const [data, setData] = useState<SummaryData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!activeCondominiumId) return;
    let isMounted = true;
    const month = todayInputDate().slice(0, 7);

    Promise.all([
      getChargesByCondominium(activeCondominiumId),
      // Bills going out now may be of this month or the next one.
      orEmpty(getInvoiceMonth(activeCondominiumId, month), null),
      orEmpty(getInvoiceMonth(activeCondominiumId, shiftMonth(month, 1)), null),
      hasConsumption ? orEmpty(getUtilityMonth(activeCondominiumId, month), null) : Promise.resolve(null),
      hasRentals ? orEmpty(getRentalContracts(activeCondominiumId), [] as RentalContract[]) : Promise.resolve([] as RentalContract[]),
    ])
      .then(([charges, thisMonth, nextMonth, utilities, contracts]) => {
        if (!isMounted) return;
        const limit = shiftDays(todayInputDate(), 30);
        setData({
          condominiumId: activeCondominiumId,
          charges,
          drafts: [...(thisMonth?.invoices ?? []), ...(nextMonth?.invoices ?? [])].filter((bill) => bill.status === CHARGE_STATUS.draft),
          autoSendDays: thisMonth?.autoSendDaysBefore ?? null,
          unitsWithoutUtilities:
            utilities && utilities.utilities.length > 0 ? utilities.rows.filter((row) => row.payerName && row.amounts.length === 0).length : 0,
          utilitiesMonth: month,
          adjustments: contracts.filter((contract) => contract.status === 1 && !contract.isOwnerContract && contract.nextAdjustmentDate && contract.nextAdjustmentDate <= limit),
        });
        setError("");
      })
      .catch((loadError) => isMounted && setError(loadError instanceof Error ? loadError.message : "Não foi possível carregar o resumo."));

    return () => {
      isMounted = false;
    };
  }, [activeCondominiumId, hasConsumption, hasRentals]);

  const isLoading = !data || data.condominiumId !== activeCondominiumId;
  const charges = isLoading ? [] : data.charges;
  const month = todayInputDate().slice(0, 7);
  const sum = (list: ChargeResponse[], pick: (charge: ChargeResponse) => number = (charge) => charge.value) => list.reduce((total, charge) => total + pick(charge), 0);
  const pending = charges.filter((charge) => charge.status === CHARGE_STATUS.pending);
  const overdue = charges.filter((charge) => charge.status === CHARGE_STATUS.overdue);
  const paidThisMonth = charges.filter((charge) => charge.status === CHARGE_STATUS.paid && charge.dueDate.startsWith(month));
  const proofs = charges.filter((charge) => charge.pendingProofCount > 0);
  const lateUnits = groupLateUnits(overdue);

  const todos: Todo[] = [];
  if (!isLoading) {
    if (data.drafts.length > 0) {
      const today = todayInputDate();
      const pastDue = data.drafts.filter((bill) => bill.dueDate.slice(0, 10) < today).length;
      const first = [...data.drafts].sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0];
      const sendOn = data.autoSendDays === null ? null : shiftDays(first.dueDate.slice(0, 10), -data.autoSendDays);
      todos.push({
        key: "drafts",
        icon: <Send size={18} strokeWidth={1.8} />,
        tone: pastDue > 0 ? "warning" : undefined,
        title: `${data.drafts.length === 1 ? "1 conta" : `${data.drafts.length} contas`} a sair · ${formatCurrency(data.drafts.reduce((total, bill) => total + bill.value, 0))}`,
        subtitle:
          pastDue > 0
            ? `${pastDue === 1 ? "1 está" : `${pastDue} estão`} com vencimento que já passou: mude o vencimento para ela${pastDue === 1 ? "" : "s"} sair${pastDue === 1 ? "" : "em"}.`
            : sendOn && sendOn > today
              ? `Saem sozinhas a partir de ${formatCalendarDate(sendOn)}. Confira antes, se quiser.`
              : sendOn
                ? "Saem sozinhas ainda hoje. Confira antes, se quiser."
                : "Confira e clique em Enviar contas.",
        action: { label: "Conferir", to: `${base}/finance/accounts?situacao=draft` },
      });
    }
    if (data.unitsWithoutUtilities > 0) {
      todos.push({
        key: "utilities",
        icon: <Gauge size={18} strokeWidth={1.8} />,
        title: `Lançar água, luz e gás de ${monthLabel(data.utilitiesMonth)}`,
        subtitle: `${data.unitsWithoutUtilities} ${data.unitsWithoutUtilities === 1 ? "unidade ainda sem valor" : "unidades ainda sem valor"}.`,
        action: { label: "Lançar", to: `${base}/utilities` },
      });
    }
    if (proofs.length > 0) {
      todos.push({
        key: "proofs",
        icon: <FileCheck size={18} strokeWidth={1.8} />,
        tone: "warning",
        title: `${proofs.length === 1 ? "1 comprovante Pix" : `${proofs.length} comprovantes Pix`} para conferir`,
        subtitle: "Confira no extrato do banco e dê baixa.",
        action: { label: "Conferir", to: `${base}/finance/accounts?situacao=open` },
      });
    }
    for (const unit of lateUnits.slice(0, 5)) {
      todos.push({
        key: `late-${unit.unitId}`,
        icon: <TriangleAlert size={18} strokeWidth={1.8} />,
        tone: "danger",
        title: `${unit.label} em atraso · ${formatCurrency(unit.total)}`,
        subtitle: `${unit.count === 1 ? "1 conta atrasada" : `${unit.count} contas atrasadas`} desde ${formatCalendarDate(unit.since)}.`,
        action: { label: canAgree ? "Fazer acordo" : "Ver", to: `${base}/finance/accounts?unit=${unit.unitId}` },
      });
    }
    for (const contract of data.adjustments) {
      todos.push({
        key: `adjust-${contract.id}`,
        icon: <CalendarClock size={18} strokeWidth={1.8} />,
        title: `Reajuste do aluguel de ${contract.buildingName} · ${contract.unitNumber}`,
        subtitle: `Em ${formatCalendarDate(contract.nextAdjustmentDate)} (${contract.tenantName}).`,
        action: { label: "Reajustar", to: `${base}/rentals` },
      });
    }
  }

  return (
    <>
      <PageHeader overline={activeCondominium?.condominiumName} title="Financeiro" />
      <FinanceTabs />

      {error && (
        <p role="alert" className="mb-6 rounded-field bg-vermelho-suave px-4 py-3 text-sm font-medium text-vermelho">
          {error}
        </p>
      )}

      <SummaryCard
        items={[
          { label: "Recebido no mês", value: isLoading ? "–" : formatCurrency(sum(paidThisMonth)), detail: `vencimentos de ${currentMonthName()}`, tone: "good" },
          { label: "A receber", value: isLoading ? "–" : formatCurrency(sum(pending)), detail: `${pending.length} em aberto` },
          {
            label: "Em atraso",
            value: isLoading ? "–" : formatCurrency(sum(overdue, amountDue)),
            detail: lateUnits.length ? `${lateUnits.length} ${lateUnits.length === 1 ? "unidade" : "unidades"}` : "nenhum atraso",
            tone: overdue.length ? "danger" : "neutral",
          },
          { label: "Contas a sair", value: isLoading ? "–" : String(data.drafts.length), detail: isLoading ? "" : formatCurrency(data.drafts.reduce((total, bill) => total + bill.value, 0)) },
        ]}
      />

      <section className="mt-8">
        <h2 className="mb-3 px-1 text-sm font-semibold text-tinta-suave">Precisa de você</h2>
        {isLoading ? (
          <p className="rounded-card bg-superficie px-5 py-8 text-center text-sm text-tinta-suave shadow-whisper">Carregando…</p>
        ) : todos.length === 0 ? (
          <div className="flex items-center gap-3 rounded-card bg-superficie px-5 py-5 shadow-whisper">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-verde-suave text-verde-tinta">
              <Check size={20} strokeWidth={2} aria-hidden />
            </span>
            <div>
              <p className="font-semibold text-tinta">Tudo em dia</p>
              <p className="text-sm text-tinta-suave">As contas saem sozinhas. Nada para fazer agora.</p>
            </div>
          </div>
        ) : (
          <ul className="divide-y divide-linha overflow-hidden rounded-card bg-superficie shadow-whisper">
            {todos.map((todo) => (
              <li key={todo.key} className="flex flex-wrap items-center gap-3 px-5 py-4">
                <span
                  aria-hidden
                  className={`grid size-10 shrink-0 place-items-center rounded-field ${
                    todo.tone === "danger" ? "bg-vermelho-suave text-vermelho" : todo.tone === "warning" ? "bg-ambar-suave text-ambar" : "bg-menu text-tinta"
                  }`}
                >
                  {todo.icon}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-semibold text-tinta">{todo.title}</span>
                  <span className="block text-[13px] text-tinta-suave">{todo.subtitle}</span>
                </span>
                <ButtonLink to={todo.action.to} variant="quiet" size="sm">
                  {todo.action.label === "Fazer acordo" && <Handshake size={14} strokeWidth={2} aria-hidden />}
                  {todo.action.label}
                </ButtonLink>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="mt-6 flex items-center gap-2 px-1 text-[13px] text-tinta-suave">
        <Wallet size={14} strokeWidth={1.8} aria-hidden />
        Todas as contas ficam em Contas; despesas, balanço e relatórios na terceira aba.
      </p>
    </>
  );
}

function shiftDays(date: string, days: number) {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

// Units with late bills, the most owed first.
function groupLateUnits(overdue: ChargeResponse[]) {
  const byUnit = new Map<number, { unitId: number; label: string; total: number; count: number; since: string }>();
  for (const charge of overdue) {
    if (!charge.unitId) continue;
    const current = byUnit.get(charge.unitId) ?? { unitId: charge.unitId, label: `${charge.buildingName} · ${charge.unitNumber}`, total: 0, count: 0, since: charge.dueDate };
    current.total += amountDue(charge);
    current.count += 1;
    if (charge.dueDate < current.since) current.since = charge.dueDate;
    byUnit.set(charge.unitId, current);
  }
  return [...byUnit.values()].sort((a, b) => b.total - a.total);
}
