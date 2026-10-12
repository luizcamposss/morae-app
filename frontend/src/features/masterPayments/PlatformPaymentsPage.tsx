import { useEffect, useMemo, useState, type FormEvent } from "react";
import { ChevronRight, Plus, Search, TriangleAlert } from "lucide-react";
import { Button, ButtonLink } from "../../shared/components/Button";
import { SelectField } from "../../shared/components/SelectField";
import { SummaryCard } from "../../shared/components/SummaryCard";
import { PageHeader } from "../../shared/layout/PageHeader";
import { formatCurrency } from "../../shared/lib/currency";
import { formatCalendarDate, todayInputDate } from "../../shared/lib/date";
import { cancelCharge, createCharge, getPlatformCharges } from "../charges/chargeService";
import { CHARGE_STATUS, buildRevenueByMonth, currentMonthName } from "../charges/platformRevenue";
import type { ChargeResponse } from "../charges/types";
import { getCondominiums } from "../condominiums/condominiumService";
import type { CondominiumResponse } from "../condominiums/types";
import { getPlatformFinancialAccount } from "../financialAccounts/financialAccountService";
import { RevenueChart } from "../masterDashboard/MasterCharts";
import { buildBillingIndex } from "../masterCondominiums/condominiumBilling";
import { getMercadoPagoConnectionStatus } from "../mercadoPago/mercadoPagoService";
import { createManualPayment } from "../payments/paymentService";
import { ChargeStatusChip, ChargeStatusTile } from "./ChargeStatus";
import { CancelChargeModal, ChargeDetailsModal, ManualPaymentModal, NewChargeModal } from "./PlatformChargeModals";
import {
  initialCreateForm,
  parseCurrencyInput,
  toPaymentForm,
  validateCancelForm,
  validateCreateForm,
  validatePaymentForm,
  type CancelFormState,
  type CreateFormState,
  type PaymentFormState,
} from "./platformChargeForm";

const ACTIVE_STATUS = 1;
const CHART_MONTHS = 12;

type Tab = "open" | "overdue" | "paid" | "canceled" | "all";

const tabs: Array<{ key: Tab; label: string; statuses: number[] }> = [
  { key: "open", label: "Em aberto", statuses: [CHARGE_STATUS.pending] },
  { key: "overdue", label: "Atrasadas", statuses: [CHARGE_STATUS.overdue] },
  { key: "paid", label: "Pagas", statuses: [CHARGE_STATUS.paid] },
  { key: "canceled", label: "Canceladas", statuses: [CHARGE_STATUS.canceled] },
  { key: "all", label: "Todas", statuses: [] },
];

async function fetchPageData() {
  const [charges, condominiums, account, mercadoPago] = await Promise.all([
    getPlatformCharges(),
    getCondominiums(),
    getPlatformFinancialAccount().catch(() => null),
    getMercadoPagoConnectionStatus(null).catch(() => null),
  ]);

  // Same rule the API uses to allow new subscriptions: a Pix key or a connected Mercado Pago.
  const isReceivingReady = Boolean(account?.pixKey?.trim()) || Boolean(mercadoPago?.isConnected);

  return { charges, condominiums, isReceivingReady };
}

export function PlatformPaymentsPage() {
  const [charges, setCharges] = useState<ChargeResponse[]>([]);
  const [condominiums, setCondominiums] = useState<CondominiumResponse[]>([]);
  const [isReceivingReady, setIsReceivingReady] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("open");
  const [search, setSearch] = useState("");
  const [condominiumFilter, setCondominiumFilter] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [modalError, setModalError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createForm, setCreateForm] = useState<CreateFormState | null>(null);
  const [paymentForm, setPaymentForm] = useState<PaymentFormState | null>(null);
  const [cancelForm, setCancelForm] = useState<CancelFormState | null>(null);
  const [selectedChargeId, setSelectedChargeId] = useState<number | null>(null);

  function applyPageData(data: Awaited<ReturnType<typeof fetchPageData>>) {
    setCharges(data.charges);
    setCondominiums(data.condominiums);
    setIsReceivingReady(data.isReceivingReady);
  }

  async function reload() {
    try {
      applyPageData(await fetchPageData());
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Não foi possível carregar a receita.");
    }
  }

  useEffect(() => {
    let isMounted = true;

    fetchPageData()
      .then((data) => isMounted && applyPageData(data))
      .catch((error) => isMounted && setErrorMessage(error instanceof Error ? error.message : "Não foi possível carregar a receita."))
      .finally(() => isMounted && setIsLoading(false));

    return () => {
      isMounted = false;
    };
  }, []);

  const summary = useMemo(() => {
    const month = todayInputDate().slice(0, 7);
    const sum = (list: ChargeResponse[]) => list.reduce((total, charge) => total + charge.value, 0);
    const overdue = charges.filter((charge) => charge.status === CHARGE_STATUS.overdue);
    const activeIds = new Set(condominiums.filter((condominium) => condominium.status === ACTIVE_STATUS).map((condominium) => condominium.id));
    const recurring = [...buildBillingIndex(charges).entries()]
      .filter(([condominiumId]) => activeIds.has(condominiumId))
      .reduce((total, [, billing]) => total + (billing.monthlyValue ?? 0), 0);

    return {
      receivedThisMonth: sum(charges.filter((charge) => charge.status === CHARGE_STATUS.paid && charge.dueDate.startsWith(month))),
      toReceive: sum(charges.filter((charge) => charge.status === CHARGE_STATUS.pending)),
      pendingCount: charges.filter((charge) => charge.status === CHARGE_STATUS.pending).length,
      overdue: sum(overdue),
      overdueCondominiums: new Set(overdue.map((charge) => charge.condominiumId)).size,
      recurring,
    };
  }, [charges, condominiums]);

  const revenueByMonth = useMemo(() => buildRevenueByMonth(charges, CHART_MONTHS), [charges]);
  const hasRevenue = revenueByMonth.some((month) => month.paid + month.open + month.overdue > 0);

  const term = search.trim().toLowerCase();
  const inScope = charges.filter(
    (charge) =>
      (!condominiumFilter || String(charge.condominiumId) === condominiumFilter) &&
      (!term || [charge.description, charge.condominiumName].join(" ").toLowerCase().includes(term)),
  );
  const countFor = (key: Tab) => {
    const statuses = tabs.find((item) => item.key === key)?.statuses ?? [];
    return statuses.length ? inScope.filter((charge) => statuses.includes(charge.status)).length : inScope.length;
  };
  const activeStatuses = tabs.find((item) => item.key === tab)?.statuses ?? [];
  const visibleCharges = (activeStatuses.length ? inScope.filter((charge) => activeStatuses.includes(charge.status)) : inScope).sort((a, b) =>
    tab === "paid" || tab === "canceled" || tab === "all" ? b.dueDate.localeCompare(a.dueDate) : a.dueDate.localeCompare(b.dueDate),
  );

  const selectedCharge = charges.find((charge) => charge.id === selectedChargeId) ?? null;

  function closeModals() {
    setCreateForm(null);
    setPaymentForm(null);
    setCancelForm(null);
    setModalError("");
  }

  async function submit(event: FormEvent<HTMLFormElement>, validate: () => string, action: () => Promise<unknown>, success: string, fallback: string) {
    event.preventDefault();
    const validation = validate();

    if (validation) {
      setModalError(validation);
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage("");
      await action();
      closeModals();
      setSelectedChargeId(null);
      setSuccessMessage(success);
      await reload();
    } catch (error) {
      setModalError(error instanceof Error ? error.message : fallback);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <PageHeader
        overline={isLoading ? undefined : `Receita recorrente de ${formatCurrency(summary.recurring)} por mês`}
        title="Receita"
      >
        <Button
          variant="quiet"
          size="sm"
          onClick={() => {
            setModalError("");
            setCreateForm(initialCreateForm);
          }}
          disabled={!isReceivingReady}
          className="bg-superficie shadow-whisper hover:bg-campo"
        >
          <Plus size={16} strokeWidth={2} aria-hidden />
          Nova mensalidade
        </Button>
      </PageHeader>

      {!isLoading && !isReceivingReady && (
        <div className="mb-5 flex flex-col gap-3 rounded-card bg-ambar-suave px-5 py-4 sm:flex-row sm:items-center">
          <TriangleAlert size={20} strokeWidth={1.8} aria-hidden className="shrink-0 text-ambar" />
          <p className="flex-1 text-sm text-tinta">
            <span className="font-semibold">Configure onde você recebe.</span> Para criar mensalidades, cadastre uma chave Pix ou conecte o Mercado Pago da
            plataforma.
          </p>
          <ButtonLink to="/master/settings" size="sm">
            Ir para Ajustes
          </ButtonLink>
        </div>
      )}

      {errorMessage && <p role="alert" className="mb-5 rounded-field bg-vermelho-suave px-4 py-3 text-sm font-medium text-vermelho">{errorMessage}</p>}
      {successMessage && <p role="status" className="mb-5 rounded-field bg-verde-suave px-4 py-3 text-sm font-medium text-verde-tinta">{successMessage}</p>}

      <SummaryCard
        items={[
          { label: "Pago do mês", value: isLoading ? "–" : formatCurrency(summary.receivedThisMonth), detail: `mensalidades de ${currentMonthName()}`, tone: "good" },
          { label: "A receber", value: isLoading ? "–" : formatCurrency(summary.toReceive), detail: `${summary.pendingCount} em aberto` },
          {
            label: "Em atraso",
            value: isLoading ? "–" : formatCurrency(summary.overdue),
            detail: summary.overdueCondominiums ? `${summary.overdueCondominiums} condomínio${summary.overdueCondominiums > 1 ? "s" : ""}` : "nenhum atraso",
            tone: summary.overdue > 0 ? "danger" : "neutral",
          },
          { label: "Receita recorrente", value: isLoading ? "–" : formatCurrency(summary.recurring), detail: "por mês, condomínios ativos" },
        ]}
      />

      <section className="mt-6 rounded-card bg-superficie p-6 shadow-whisper">
        <h2 className="font-display text-[19px] font-bold tracking-[-0.01em] text-tinta">Mensalidades por mês</h2>
        <p className="mb-5 text-[13px] text-tinta-suave">por vencimento, até o próximo mês</p>
        {hasRevenue ? (
          <RevenueChart data={revenueByMonth} />
        ) : (
          <p className="grid h-40 place-items-center text-center text-sm text-tinta-suave">
            {isLoading ? "Carregando…" : "Quando houver mensalidades, a evolução aparece aqui."}
          </p>
        )}
      </section>

      <div className="mb-4 mt-8 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div role="tablist" aria-label="Situação das mensalidades" className="inline-flex max-w-full self-start overflow-x-auto rounded-block bg-menu p-1">
          {tabs.map((item) => (
            <button
              key={item.key}
              type="button"
              role="tab"
              aria-selected={tab === item.key}
              onClick={() => setTab(item.key)}
              className={`flex shrink-0 items-center gap-1.5 rounded-field px-3.5 py-1.5 text-sm font-semibold transition-colors ${
                tab === item.key ? "bg-superficie text-tinta shadow-whisper" : "text-tinta-suave hover:text-tinta"
              }`}
            >
              {item.label}
              <span className="text-xs font-medium tabular-nums text-tinta-suave">{countFor(item.key)}</span>
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <SelectField
            label="Condomínio"
            className="[&>label]:sr-only sm:w-56"
            value={condominiumFilter}
            onChange={(event) => setCondominiumFilter(event.target.value)}
            placeholder="Todos os condomínios"
            options={condominiums.map((condominium) => ({ value: String(condominium.id), label: condominium.name }))}
          />
          <label className="relative sm:w-64">
            <span className="sr-only">Buscar mensalidade</span>
            <Search size={17} strokeWidth={1.8} aria-hidden className="pointer-events-none absolute inset-y-0 left-3.5 my-auto text-tinta-suave" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Descrição ou condomínio"
              className="w-full rounded-full bg-superficie py-2.5 pl-10 pr-4 text-sm text-tinta shadow-whisper outline-none placeholder:text-tinta-suave/80 focus:ring-2 focus:ring-verde focus-visible:outline-none"
            />
          </label>
        </div>
      </div>

      <ul className="divide-y divide-linha overflow-hidden rounded-card bg-superficie shadow-whisper">
        {visibleCharges.length === 0 ? (
          <li className="px-5 py-10 text-center text-sm text-tinta-suave">
            {isLoading ? "Carregando…" : term || condominiumFilter ? "Nenhuma mensalidade encontrada com esses filtros." : "Nenhuma mensalidade nesta situação."}
          </li>
        ) : (
          visibleCharges.map((charge) => (
            <li key={charge.id}>
              <button
                type="button"
                onClick={() => {
                  setSuccessMessage("");
                  setSelectedChargeId(charge.id);
                }}
                className="flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-campo/60"
              >
                <ChargeStatusTile status={charge.status} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-semibold text-tinta">{charge.description}</span>
                  <span className="block truncate text-[13px] text-tinta-suave">
                    {charge.condominiumName} · {charge.status === CHARGE_STATUS.overdue ? "venceu" : "vence"} {formatCalendarDate(charge.dueDate)}
                  </span>
                </span>
                <span className="text-right">
                  <span className="block text-sm font-semibold tabular-nums text-tinta">{formatCurrency(charge.value)}</span>
                  <span className="mt-1 hidden justify-end sm:flex">
                    <ChargeStatusChip status={charge.status} />
                  </span>
                </span>
                <ChevronRight size={18} strokeWidth={1.8} aria-hidden className="shrink-0 text-tinta-suave" />
              </button>
            </li>
          ))
        )}
      </ul>

      {selectedCharge && !paymentForm && !cancelForm && (
        <ChargeDetailsModal
          charge={selectedCharge}
          onClose={() => setSelectedChargeId(null)}
          onPay={() => {
            setModalError("");
            setPaymentForm(toPaymentForm(selectedCharge));
          }}
          onCancel={() => {
            setModalError("");
            setCancelForm({ chargeId: selectedCharge.id, reason: "" });
          }}
          onRefunded={() => void reload()}
        />
      )}

      {createForm && (
        <NewChargeModal
          form={createForm}
          condominiums={condominiums.filter((condominium) => condominium.status === ACTIVE_STATUS)}
          error={modalError}
          isSubmitting={isSubmitting}
          onChange={setCreateForm}
          onClose={closeModals}
          onSubmit={(event) =>
            void submit(
              event,
              () => validateCreateForm(createForm, condominiums),
              () =>
                createCharge({
                  scope: 1,
                  condominiumId: Number(createForm.condominiumId),
                  targetUserId: null,
                  unitId: null,
                  value: parseCurrencyInput(createForm.value),
                  dueDate: createForm.dueDate,
                  description: createForm.description.trim(),
                }),
              "Mensalidade criada.",
              "Não foi possível criar a mensalidade.",
            )
          }
        />
      )}

      {paymentForm && (
        <ManualPaymentModal
          form={paymentForm}
          charge={charges.find((charge) => charge.id === paymentForm.chargeId)}
          error={modalError}
          isSubmitting={isSubmitting}
          onChange={setPaymentForm}
          onClose={closeModals}
          onSubmit={(event) =>
            void submit(
              event,
              () => validatePaymentForm(paymentForm, charges.find((charge) => charge.id === paymentForm.chargeId)),
              () =>
                createManualPayment(paymentForm.chargeId, {
                  amountPaid: parseCurrencyInput(paymentForm.amountPaid),
                  paymentMethod: paymentForm.paymentMethod,
                  paidAt: paymentForm.paidAt || null,
                  notes: paymentForm.notes.trim() || null,
                }),
              "Pagamento registrado.",
              "Não foi possível registrar o pagamento.",
            )
          }
        />
      )}

      {cancelForm && (
        <CancelChargeModal
          form={cancelForm}
          error={modalError}
          isSubmitting={isSubmitting}
          onChange={setCancelForm}
          onClose={closeModals}
          onSubmit={(event) =>
            void submit(
              event,
              () => validateCancelForm(cancelForm),
              () => cancelCharge(cancelForm.chargeId, cancelForm.reason.trim()),
              "Mensalidade cancelada.",
              "Não foi possível cancelar a mensalidade.",
            )
          }
        />
      )}
    </>
  );
}
