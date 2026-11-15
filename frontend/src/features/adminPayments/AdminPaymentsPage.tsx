import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { ChevronRight, Handshake, Plus, Repeat, Search, TriangleAlert, X } from "lucide-react";
import { useModuleEnabled } from "../modules/modules";
import { useCondominium } from "../../app/providers/useCondominium";
import { Button, ButtonLink } from "../../shared/components/Button";
import { ConfirmDialog, type ConfirmRequest } from "../../shared/components/ConfirmDialog";
import { SelectField } from "../../shared/components/SelectField";
import { SummaryCard } from "../../shared/components/SummaryCard";
import { PageHeader } from "../../shared/layout/PageHeader";
import { formatCurrency } from "../../shared/lib/currency";
import { formatCalendarDate, todayInputDate } from "../../shared/lib/date";
import { AGREEMENT_STATUS } from "../agreements/agreementMeta";
import { cancelAgreement, createAgreement, getAgreementsByCondominium } from "../agreements/agreementService";
import type { AgreementResponse } from "../agreements/types";
import { getBuildingsByCondominium } from "../buildings/buildingService";
import { changeRecurringCharge, createChargeBatch, createRecurringCharge, getBillingSettings, getRecurringCharges } from "../charges/billingService";
import { cancelCharge, createCharge, getChargesByCondominium, getPlatformCharges } from "../charges/chargeService";
import { categoryOptions } from "../charges/chargeCategories";
import { ChargeCategoryChip } from "../charges/ChargeCategoryChip";
import { PaymentProofChip } from "../charges/PaymentProofChip";
import { proofState } from "../charges/paymentProof";
import { CHARGE_STATUS, currentMonthName } from "../charges/platformRevenue";
import type { ChargeBatchResult, ChargeResponse, RecurringChargeResponse } from "../charges/types";
import { getCondominiumFinancialAccount, getPlatformFinancialAccount } from "../financialAccounts/financialAccountService";
import { ChargeStatusChip, ChargeStatusTile } from "../masterPayments/ChargeStatus";
import { MercadoPagoPaymentModal } from "../mercadoPago/MercadoPagoPaymentModal";
import { getMercadoPagoConnectionStatus } from "../mercadoPago/mercadoPagoService";
import { createManualPayment } from "../payments/paymentService";
import { getUnitsByBuilding } from "../units/unitService";
import { agreementCandidates, candidatesOfUnit, chosenCharges, toCreateAgreementRequest, type AgreementForm } from "./agreementForm";
import { AgreementDetailsModal, AgreementsList } from "./AgreementsList";
import { AgreementWizard } from "./AgreementWizard";
import { ChargeReceiptModal } from "./ChargeReceiptModal";
import { PaymentProofsPanel } from "./PaymentProofsPanel";
import { BatchResultModal, CancelChargeModal, ChargeDetailsModal, ManualPaymentModal } from "./ChargeModals";
import { NewChargeWizard } from "./NewChargeWizard";
import { targetUnits, unitValuesFor, type NewChargeForm } from "./newChargeForm";
import { RecurringChargesList } from "./RecurringChargesList";
import { useIsSyndicArea, useSyndicCan } from "../syndicAccess/useSyndicAccess";
import {
  amountDue,
  chargeMonths,
  formatMonthKey,
  hasLateFees,
  isOpenCharge,
  normalizeSearch,
  parseCurrencyInput,
  toManualPaymentForm,
  validateCancelForm,
  validateManualPayment,
  type CancelFormState,
  type ManualPaymentForm,
} from "./chargeForm";

type View = "charges" | "agreements" | "recurring" | "platform";
type Tab = "open" | "overdue" | "paid" | "renegotiated" | "canceled" | "all";
// The "Nova cobrança" wizard; repeating = opened from "Recorrências".
type Wizard = { repeating: boolean } | null;
type BatchResult = { title: string; result: ChargeBatchResult } | null;

const tabs: Array<{ key: Tab; label: string; statuses: number[] }> = [
  { key: "open", label: "Em aberto", statuses: [CHARGE_STATUS.pending] },
  { key: "overdue", label: "Atrasadas", statuses: [CHARGE_STATUS.overdue] },
  { key: "paid", label: "Pagas", statuses: [CHARGE_STATUS.paid] },
  { key: "renegotiated", label: "Renegociadas", statuses: [CHARGE_STATUS.renegotiated] },
  { key: "canceled", label: "Canceladas", statuses: [CHARGE_STATUS.canceled] },
  { key: "all", label: "Todas", statuses: [] },
];

// The syndic skips what only the Admin can read (Moraê fee, receiving accounts); the API still checks his charges.
async function fetchPageData(condominiumId: number, isSyndic: boolean) {
  const [charges, buildings, recurring, settings, platformCharges, platformAccount, account, mercadoPago, agreements] = await Promise.all([
    getChargesByCondominium(condominiumId),
    getBuildingsByCondominium(condominiumId).catch(() => []),
    getRecurringCharges(condominiumId).catch(() => []),
    getBillingSettings(condominiumId).catch(() => null),
    isSyndic ? [] : getPlatformCharges().catch(() => []),
    isSyndic ? null : getPlatformFinancialAccount().catch(() => null),
    isSyndic ? null : getCondominiumFinancialAccount(condominiumId).catch(() => null),
    isSyndic ? null : getMercadoPagoConnectionStatus(condominiumId).catch(() => null),
    getAgreementsByCondominium(condominiumId).catch(() => [] as AgreementResponse[]),
  ]);
  const unitsByBuilding = await Promise.all(buildings.map((building) => getUnitsByBuilding(building.id)));
  const units = unitsByBuilding.flat().sort((a, b) => a.buildingName.localeCompare(b.buildingName, "pt-BR") || a.number.localeCompare(b.number, "pt-BR", { numeric: true }));

  return {
    condominiumId,
    charges,
    buildings,
    units,
    recurring,
    agreements,
    settings,
    // The Admin sees the platform fees of every condominium they manage; keep the active one.
    platformCharges: platformCharges.filter((charge) => charge.condominiumId === condominiumId),
    pixKey: platformAccount?.pixKey ?? "",
    // Same rule the API uses to allow new charges: a Pix key or a connected Mercado Pago.
    isReceivingReady: isSyndic || Boolean(account?.pixKey?.trim()) || Boolean(mercadoPago?.isConnected),
    errorMessage: "",
  };
}

type PageData = Awaited<ReturnType<typeof fetchPageData>>;

const emptyData = (condominiumId: number | null, errorMessage = ""): PageData => ({
  condominiumId: condominiumId ?? 0,
  charges: [],
  buildings: [],
  units: [],
  recurring: [],
  agreements: [],
  settings: null,
  platformCharges: [],
  pixKey: "",
  isReceivingReady: true,
  errorMessage,
});

// Condominium charges (Admin): summary, filters, single and batch charges, recurring charges,
// manual payment (with or without fine/interest), cancel, receipt/refund and the Moraê fee.
export function AdminPaymentsPage() {
  const { condominiums, activeCondominium, activeCondominiumId, setActiveCondominiumId } = useCondominium();
  const [data, setData] = useState<PageData | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  // ?unit=<id> (from the dashboard grid): only that unit's charges, every status.
  const unitFilter = Number(searchParams.get("unit")) || null;
  const [view, setView] = useState<View>("charges");
  const [tab, setTab] = useState<Tab>(unitFilter ? "all" : "open");
  const [search, setSearch] = useState("");
  const [buildingFilter, setBuildingFilter] = useState("");
  const [monthFilter, setMonthFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [modalError, setModalError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [wizard, setWizard] = useState<Wizard>(null);
  // "Fazer acordo", optionally starting on a unit.
  const [agreementWizard, setAgreementWizard] = useState<{ unitId: number | null } | null>(null);
  const [selectedAgreementId, setSelectedAgreementId] = useState<number | null>(null);
  const [batchResult, setBatchResult] = useState<BatchResult>(null);
  const [paymentForm, setPaymentForm] = useState<ManualPaymentForm | null>(null);
  const [cancelForm, setCancelForm] = useState<CancelFormState | null>(null);
  const [selectedChargeId, setSelectedChargeId] = useState<number | null>(null);
  const [receiptChargeId, setReceiptChargeId] = useState<number | null>(null);
  const [payingChargeId, setPayingChargeId] = useState<number | null>(null);
  const [hasPaidOnline, setHasPaidOnline] = useState(false);
  const [busyRecurringId, setBusyRecurringId] = useState<number | null>(null);
  const [confirmRequest, setConfirmRequest] = useState<ConfirmRequest | null>(null);
  const isSyndic = useIsSyndicArea();
  const canCreate = useSyndicCan("charges.create");
  // With the agreements module off no new agreement starts; the existing ones stay listed.
  const hasAgreementsModule = useModuleEnabled("agreements");
  const canAgree = canCreate && hasAgreementsModule;
  const canMarkPaid = useSyndicCan("charges.mark_as_paid");

  useEffect(() => {
    if (!activeCondominiumId) return;
    let isMounted = true;

    fetchPageData(activeCondominiumId, isSyndic)
      .then((result) => isMounted && setData(result))
      .catch(
        (error) =>
          isMounted && setData(emptyData(activeCondominiumId, error instanceof Error ? error.message : "Não foi possível carregar as cobranças.")),
      );

    return () => {
      isMounted = false;
    };
  }, [activeCondominiumId, isSyndic]);

  const isLoading = !data || data.condominiumId !== activeCondominiumId;
  const page = isLoading ? emptyData(activeCondominiumId) : data;
  const { charges, buildings, units, recurring, agreements, settings, platformCharges } = page;
  const unitById = useMemo(() => new Map(units.map((unit) => [unit.id, unit])), [units]);
  const shownError = errorMessage || page.errorMessage;
  const filteredUnit = unitFilter ? unitById.get(unitFilter) : undefined;

  async function reload() {
    if (!activeCondominiumId) return;
    try {
      setData(await fetchPageData(activeCondominiumId, isSyndic));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Não foi possível atualizar as cobranças.");
    }
  }

  const summary = useMemo(() => {
    const month = todayInputDate().slice(0, 7);
    const sum = (list: ChargeResponse[], pick: (charge: ChargeResponse) => number = (charge) => charge.value) =>
      list.reduce((total, charge) => total + pick(charge), 0);
    const pending = charges.filter((charge) => charge.status === CHARGE_STATUS.pending);
    const overdue = charges.filter((charge) => charge.status === CHARGE_STATUS.overdue);
    const lateUnitIds = new Set(overdue.map((charge) => charge.unitId).filter(Boolean));

    return {
      receivedThisMonth: sum(charges.filter((charge) => charge.status === CHARGE_STATUS.paid && charge.dueDate.startsWith(month))),
      toReceive: sum(pending),
      pendingCount: pending.length,
      overdue: sum(overdue, amountDue),
      lateFees: sum(overdue, (charge) => charge.fineAmount + charge.interestAmount),
      lateUnits: lateUnitIds.size,
      upToDateUnits: units.filter((unit) => !lateUnitIds.has(unit.id)).length,
    };
  }, [charges, units]);

  const term = normalizeSearch(search.trim());
  const inScope = charges.filter((charge) => {
    const unit = charge.unitId ? unitById.get(charge.unitId) : undefined;
    if (unitFilter && charge.unitId !== unitFilter) return false;
    if (buildingFilter && String(unit?.buildingId ?? "") !== buildingFilter) return false;
    if (monthFilter && !charge.dueDate.startsWith(monthFilter)) return false;
    if (categoryFilter && String(charge.category) !== categoryFilter) return false;
    if (!term) return true;
    return normalizeSearch([charge.description, charge.unitNumber, charge.buildingName, unit?.responsiblePersonName, charge.recipientName, `#${charge.id}`].filter(Boolean).join(" ")).includes(term);
  });
  const countFor = (key: Tab) => {
    const statuses = tabs.find((item) => item.key === key)?.statuses ?? [];
    return statuses.length ? inScope.filter((charge) => statuses.includes(charge.status)).length : inScope.length;
  };
  const activeStatuses = tabs.find((item) => item.key === tab)?.statuses ?? [];
  const visibleCharges = (activeStatuses.length ? inScope.filter((charge) => activeStatuses.includes(charge.status)) : inScope).sort((a, b) =>
    tab === "open" || tab === "overdue" ? a.dueDate.localeCompare(b.dueDate) : b.dueDate.localeCompare(a.dueDate),
  );
  const months = useMemo(() => chargeMonths(charges), [charges]);
  const activeRecurring = recurring.filter((item) => item.status !== 3).length;
  const activeAgreements = agreements.filter((item) => item.status === AGREEMENT_STATUS.active).length;
  const hasAgreementCandidates = agreementCandidates(charges).length > 0;
  const unitLateCharges = unitFilter ? candidatesOfUnit(charges, String(unitFilter)) : [];
  const selectedAgreement = agreements.find((item) => item.id === selectedAgreementId) ?? null;
  const openPlatform = platformCharges.filter(isOpenCharge).length;

  const allCharges = [...charges, ...platformCharges];
  const selectedCharge = allCharges.find((charge) => charge.id === selectedChargeId) ?? null;
  const paymentCharge = paymentForm ? charges.find((charge) => charge.id === paymentForm.chargeId) : undefined;

  function clearMessages() {
    setErrorMessage("");
    setSuccessMessage("");
  }

  function closeModals() {
    setWizard(null);
    setAgreementWizard(null);
    setPaymentForm(null);
    setCancelForm(null);
    setModalError("");
  }

  function openWizard(repeating = false) {
    clearMessages();
    setModalError("");
    setWizard({ repeating });
  }

  async function submit(event: FormEvent<HTMLFormElement>, validate: () => string, action: () => Promise<string | null>, fallback: string) {
    event.preventDefault();
    const validation = validate();

    if (validation) {
      setModalError(validation);
      return;
    }

    try {
      setIsSubmitting(true);
      clearMessages();
      const success = await action();
      closeModals();
      setSelectedChargeId(null);
      if (success) setSuccessMessage(success);
      await reload();
    } catch (error) {
      setModalError(error instanceof Error ? error.message : fallback);
    } finally {
      setIsSubmitting(false);
    }
  }

  // One unit → single charge (or a one-unit recurrence); many → batch (or a recurrence of the
  // condominium/building). Readings go as the value of each unit of the batch.
  async function createFromWizard(form: NewChargeForm, recipientName?: string) {
    if (!activeCondominiumId || !form.category) return;
    const common = {
      category: form.category,
      value: parseCurrencyInput(form.value),
      description: form.description.trim(),
    };
    const unitId = form.target === "unit" ? Number(form.unitId) : null;
    const recipientPersonId = unitId && form.onlyOnePerson && form.recipientPersonId ? Number(form.recipientPersonId) : null;
    const buildingId = form.target === "many" && form.manyScope === "building" ? Number(form.buildingId) : null;
    const unitValues = unitValuesFor(form, units);
    const label = recipientName ? ` para ${recipientName}` : "";

    setIsSubmitting(true);
    setModalError("");
    clearMessages();
    try {
      if (form.repeat) {
        const created = await createRecurringCharge(activeCondominiumId, {
          ...common,
          buildingId,
          unitId,
          recipientPersonId,
          dueDay: Number(form.dueDay),
          unitValues,
        });
        setView("recurring");
        if (created.generation && created.generation.createdCount + created.generation.skipped.length > 0) {
          setBatchResult({ title: "Recorrência criada", result: created.generation });
        } else {
          setSuccessMessage(`Recorrência criada${label}. As cobranças saem sozinhas 10 dias antes de cada vencimento (dia ${created.effectiveDueDay}).`);
        }
      } else if (unitId) {
        await createCharge({
          ...common,
          // A reading for one unit sends the computed value.
          value: unitValues[0]?.value ?? common.value,
          scope: 2,
          condominiumId: activeCondominiumId,
          unitId,
          targetUserId: null,
          dueDate: form.dueDate,
          recipientPersonId,
        });
        setView("charges");
        setSuccessMessage(`Cobrança criada${label}.`);
      } else {
        const pickedIds = form.pricing === "reading" ? unitValues.map((item) => item.unitId) : form.manyScope === "pick" ? targetUnits(form, units).map((unit) => unit.id) : null;
        const result = await createChargeBatch(activeCondominiumId, {
          ...common,
          // Every unit has its own value in a reading; the default only has to be valid.
          value: form.pricing === "reading" ? Math.max(...unitValues.map((item) => item.value)) : common.value,
          buildingId,
          unitIds: pickedIds,
          dueDate: form.dueDate,
          unitValues,
        });
        setView("charges");
        setBatchResult({ title: "Cobranças criadas", result });
      }
      setWizard(null);
      await reload();
    } catch (error) {
      setModalError(error instanceof Error ? error.message : "Não foi possível criar a cobrança.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function openAgreementWizard(unitId: number | null) {
    clearMessages();
    setModalError("");
    setSelectedChargeId(null);
    setAgreementWizard({ unitId });
  }

  async function createAgreementFromWizard(form: AgreementForm) {
    if (!activeCondominiumId) return;
    setIsSubmitting(true);
    setModalError("");
    clearMessages();
    try {
      const created = await createAgreement(activeCondominiumId, toCreateAgreementRequest(form, chosenCharges(form, charges)));
      setAgreementWizard(null);
      setView("agreements");
      setSuccessMessage(`Acordo criado para ${created.buildingName} · ${created.unitNumber}: ${created.totalCount} ${created.totalCount === 1 ? "parcela" : "parcelas"} na categoria Acordo.`);
      await reload();
    } catch (error) {
      setModalError(error instanceof Error ? error.message : "Não foi possível criar o acordo.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function askCancelAgreement(agreement: AgreementResponse) {
    const paid = agreement.paidCount > 0 ? ` As ${agreement.paidCount} parcelas já pagas continuam pagas e não são descontadas das originais.` : "";
    setConfirmRequest({
      title: "Cancelar este acordo?",
      description: `As parcelas em aberto são canceladas e as cobranças originais voltam como atrasadas, com multa e juros desde o vencimento original.${paid}`,
      confirmLabel: "Cancelar acordo",
      cancelLabel: "Manter acordo",
      tone: "danger",
      onConfirm: async () => {
        clearMessages();
        try {
          await cancelAgreement(agreement.id, null);
          setSelectedAgreementId(null);
          setSuccessMessage("Acordo cancelado. As cobranças originais voltaram para a inadimplência.");
          await reload();
        } catch (error) {
          setErrorMessage(error instanceof Error ? error.message : "Não foi possível cancelar o acordo.");
        }
      },
    });
  }

  async function runRecurringAction(item: RecurringChargeResponse, action: "pause" | "resume" | "end") {
    clearMessages();
    setBusyRecurringId(item.id);
    try {
      const updated = await changeRecurringCharge(item.id, action);
      if (action === "resume" && updated.generation && updated.generation.createdCount + updated.generation.skipped.length > 0) {
        setBatchResult({ title: "Recorrência retomada", result: updated.generation });
      } else {
        setSuccessMessage(
          action === "pause"
            ? `"${item.description}" pausada. Nenhuma cobrança nova sai até você retomar.`
            : action === "resume"
              ? `"${item.description}" retomada.`
              : `"${item.description}" encerrada.`,
        );
      }
      await reload();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Não foi possível alterar a recorrência.");
    } finally {
      setBusyRecurringId(null);
    }
  }

  function askEnd(item: RecurringChargeResponse) {
    setConfirmRequest({
      title: "Encerrar esta recorrência?",
      description: `"${item.description}" para de gerar cobranças. As que já foram criadas continuam valendo. Uma recorrência encerrada não volta: para cobrar de novo, crie outra.`,
      confirmLabel: "Encerrar recorrência",
      tone: "danger",
      onConfirm: () => runRecurringAction(item, "end"),
    });
  }

  function placeOf(charge: ChargeResponse) {
    if (charge.scope === 1) return "Moraê";
    return charge.unitNumber ? `${charge.buildingName} · ${charge.unitNumber}` : charge.condominiumName;
  }

  const overline = [activeCondominium?.condominiumName, isLoading ? null : `${charges.length} ${charges.length === 1 ? "cobrança" : "cobranças"}`]
    .filter(Boolean)
    .join(" · ");
  const views: Array<{ key: View; label: string; count?: number }> = [
    { key: "charges", label: "Cobranças" },
    ...(hasAgreementsModule || agreements.length > 0 ? [{ key: "agreements" as const, label: "Acordos", count: activeAgreements || undefined }] : []),
    { key: "recurring", label: "Recorrências", count: activeRecurring },
    ...(isSyndic ? [] : [{ key: "platform" as const, label: "Mensalidade Moraê", count: openPlatform || undefined }]),
  ];

  return (
    <>
      <PageHeader overline={overline || undefined} title="Pagamentos">
        {canCreate && (
          <Button variant="accent" size="sm" onClick={() => openWizard()} disabled={isLoading || units.length === 0 || !page.isReceivingReady}>
            <Plus size={16} strokeWidth={2} aria-hidden />
            Nova cobrança
          </Button>
        )}
      </PageHeader>

      {condominiums.length > 1 && (
        <SelectField
          label="Condomínio"
          className="mb-6 lg:hidden"
          value={String(activeCondominiumId ?? "")}
          options={condominiums.map((item) => ({ value: String(item.condominiumId), label: item.condominiumName }))}
          onChange={(event) => setActiveCondominiumId(Number(event.target.value))}
        />
      )}

      {!isLoading && !page.isReceivingReady && (
        <div className="mb-5 flex flex-col gap-3 rounded-card bg-ambar-suave px-5 py-4 sm:flex-row sm:items-center">
          <TriangleAlert size={20} strokeWidth={1.8} aria-hidden className="shrink-0 text-ambar" />
          <p className="flex-1 text-sm text-tinta">
            <span className="font-semibold">Configure onde o condomínio recebe.</span> Para criar cobranças, cadastre a chave Pix ou conecte o Mercado Pago do
            condomínio.
          </p>
          <ButtonLink to="/admin/settings" size="sm">
            Ir para Ajustes
          </ButtonLink>
        </div>
      )}

      {shownError && <p role="alert" className="mb-5 rounded-field bg-vermelho-suave px-4 py-3 text-sm font-medium text-vermelho">{shownError}</p>}
      {successMessage && <p role="status" className="mb-5 rounded-field bg-verde-suave px-4 py-3 text-sm font-medium text-verde-tinta">{successMessage}</p>}

      <SummaryCard
        items={[
          { label: "Recebido no mês", value: isLoading ? "–" : formatCurrency(summary.receivedThisMonth), detail: `vencimentos de ${currentMonthName()}`, tone: "good" },
          { label: "A receber", value: isLoading ? "–" : formatCurrency(summary.toReceive), detail: `${summary.pendingCount} em aberto` },
          {
            label: "Em atraso",
            value: isLoading ? "–" : formatCurrency(summary.overdue),
            detail: summary.overdue > 0 ? (summary.lateFees > 0 ? `inclui ${formatCurrency(summary.lateFees)} de multa e juros` : `${summary.lateUnits} ${summary.lateUnits === 1 ? "unidade" : "unidades"}`) : "nenhum atraso",
            tone: summary.overdue > 0 ? "danger" : "neutral",
          },
          { label: "Unidades em dia", value: isLoading ? "–" : `${summary.upToDateUnits} de ${units.length}`, detail: summary.lateUnits ? `${summary.lateUnits} com atraso` : "sem atrasos" },
        ]}
      />

      <div className="-mx-4 mb-4 mt-8 overflow-x-auto px-4 [scrollbar-width:none] lg:mx-0 lg:px-0">
        <div role="tablist" aria-label="O que ver" className="inline-flex gap-1 rounded-block bg-menu p-1">
          {views.map((item) => (
            <button
              key={item.key}
              type="button"
              role="tab"
              aria-selected={view === item.key}
              onClick={() => {
                setSuccessMessage("");
                setView(item.key);
              }}
              className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-field px-3.5 py-2 text-sm font-semibold transition-colors ${
                view === item.key ? "bg-superficie text-tinta shadow-whisper" : "text-tinta-suave hover:text-tinta"
              }`}
            >
              {item.label}
              {item.count !== undefined && !isLoading && <span className="text-xs font-medium tabular-nums text-tinta-suave">{item.count}</span>}
            </button>
          ))}
        </div>
      </div>

      {view === "charges" && (
        <>
          <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] lg:mx-0 lg:px-0">
              <div role="tablist" aria-label="Situação das cobranças" className="inline-flex gap-1">
                {tabs.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    role="tab"
                    aria-selected={tab === item.key}
                    onClick={() => setTab(item.key)}
                    className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors ${
                      tab === item.key ? "bg-tinta text-white" : "text-tinta-suave hover:bg-menu hover:text-tinta"
                    }`}
                  >
                    {item.label}
                    <span className={`text-xs font-medium tabular-nums ${tab === item.key ? "text-white/75" : "text-tinta-suave"}`}>{isLoading ? "" : countFor(item.key)}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:flex">
              <SelectField
                label="Prédio"
                className="[&>label]:sr-only sm:w-44"
                value={buildingFilter}
                onChange={(event) => setBuildingFilter(event.target.value)}
                placeholder="Todos os prédios"
                options={buildings.map((building) => ({ value: String(building.id), label: building.name }))}
              />
              <SelectField
                label="Mês de vencimento"
                className="[&>label]:sr-only sm:w-48"
                value={monthFilter}
                onChange={(event) => setMonthFilter(event.target.value)}
                placeholder="Todos os meses"
                options={months.map((month) => ({ value: month, label: formatMonthKey(month) }))}
              />
              <SelectField
                label="Categoria"
                className="[&>label]:sr-only sm:w-48"
                value={categoryFilter}
                onChange={(event) => setCategoryFilter(event.target.value)}
                placeholder="Todas as categorias"
                options={categoryOptions}
              />
              <label className="relative sm:w-60">
                <span className="sr-only">Buscar cobrança</span>
                <Search size={17} strokeWidth={1.8} aria-hidden className="pointer-events-none absolute inset-y-0 left-3.5 my-auto text-tinta-suave" />
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Unidade, morador ou descrição"
                  className="w-full rounded-full bg-superficie py-2.5 pl-10 pr-4 text-sm text-tinta shadow-whisper outline-none placeholder:text-tinta-suave/80 focus:ring-2 focus:ring-verde focus-visible:outline-none"
                />
              </label>
            </div>
          </div>

          {unitFilter && (
            <div className="mb-4 flex">
              <span className="inline-flex items-center gap-1 rounded-full bg-tinta py-1 pl-3.5 pr-1 text-sm font-semibold text-white">
                Unidade {filteredUnit ? `${filteredUnit.buildingName} · ${filteredUnit.number}` : `#${unitFilter}`}
                <button
                  type="button"
                  aria-label="Tirar filtro da unidade"
                  onClick={() => {
                    const next = new URLSearchParams(searchParams);
                    next.delete("unit");
                    setSearchParams(next, { replace: true });
                  }}
                  className="grid size-6 place-items-center rounded-full text-white/80 transition-colors hover:bg-white/15 hover:text-white"
                >
                  <X size={14} strokeWidth={2} aria-hidden />
                </button>
              </span>
            </div>
          )}

          {unitFilter && canAgree && unitLateCharges.length > 0 && (
            <div className="mb-4 flex flex-col gap-3 rounded-card bg-vermelho-suave px-5 py-4 sm:flex-row sm:items-center">
              <TriangleAlert size={20} strokeWidth={1.8} aria-hidden className="shrink-0 text-vermelho" />
              <p className="flex-1 text-sm text-tinta">
                <span className="font-semibold">
                  {unitLateCharges.length} {unitLateCharges.length === 1 ? "cobrança atrasada" : "cobranças atrasadas"} ·{" "}
                  {formatCurrency(unitLateCharges.reduce((sum, charge) => sum + amountDue(charge), 0))} hoje.
                </span>{" "}
                Junte tudo num acordo, com desconto e parcelas.
              </p>
              <Button size="sm" onClick={() => openAgreementWizard(unitFilter)}>
                <Handshake size={16} strokeWidth={2} aria-hidden />
                Fazer acordo
              </Button>
            </div>
          )}

          <ul className="divide-y divide-linha overflow-hidden rounded-card bg-superficie shadow-whisper">
            {visibleCharges.length === 0 ? (
              <li className="px-5 py-10 text-center text-sm text-tinta-suave">
                {isLoading
                  ? "Carregando…"
                  : charges.length === 0
                    ? "Nenhuma cobrança ainda. Use “Nova cobrança” para gerar a taxa do mês, o aluguel ou a conta de água."
                    : term || buildingFilter || monthFilter || categoryFilter || unitFilter
                      ? "Nenhuma cobrança encontrada com esses filtros."
                      : "Nenhuma cobrança nesta situação."}
              </li>
            ) : (
              visibleCharges.map((charge) => {
                // A charge addressed to one person shows that person instead of the unit's responsible.
                const person = charge.recipientName || (charge.unitId ? unitById.get(charge.unitId)?.responsiblePersonName : "");
                const isOverdue = charge.status === CHARGE_STATUS.overdue;
                return (
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
                          {placeOf(charge)}
                          {person ? ` · ${charge.recipientName ? "só " : ""}${person}` : ""} · {isOverdue ? "venceu" : "vence"} {formatCalendarDate(charge.dueDate)}
                        </span>
                        <span className="mt-1.5 flex flex-wrap gap-1.5">
                          <ChargeCategoryChip category={charge.category} />
                          {proofState(charge) === "sent" && <PaymentProofChip charge={charge} />}
                        </span>
                      </span>
                      <span className="text-right">
                        <span className={`block text-sm font-semibold tabular-nums ${isOverdue ? "text-vermelho" : "text-tinta"}`}>{formatCurrency(amountDue(charge))}</span>
                        {isOverdue && hasLateFees(charge) ? (
                          <span className="block text-xs tabular-nums text-tinta-suave">orig. {formatCurrency(charge.value)}</span>
                        ) : (
                          <span className="mt-1 hidden justify-end sm:flex">
                            <ChargeStatusChip status={charge.status} />
                          </span>
                        )}
                      </span>
                      <ChevronRight size={18} strokeWidth={1.8} aria-hidden className="shrink-0 text-tinta-suave" />
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </>
      )}

      {view === "agreements" && (
        <>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-tinta-suave">Dívidas atrasadas de uma unidade parceladas, com desconto opcional na multa e nos juros.</p>
            {canAgree && (
              <Button
                variant="quiet"
                size="sm"
                onClick={() => openAgreementWizard(null)}
                disabled={isLoading || !hasAgreementCandidates || !page.isReceivingReady}
                className="self-start bg-superficie shadow-whisper hover:bg-campo"
              >
                <Handshake size={16} strokeWidth={2} aria-hidden />
                Fazer acordo
              </Button>
            )}
          </div>
          <AgreementsList items={agreements} isLoading={isLoading} onSelect={(agreement) => setSelectedAgreementId(agreement.id)} />
        </>
      )}

      {view === "recurring" && (
        <>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-tinta-suave">
              Geradas sozinhas 10 dias antes do vencimento{settings ? ` · vencimento padrão dia ${settings.billingDueDay}` : ""}.
            </p>
            {canCreate && <Button variant="quiet" size="sm" onClick={() => openWizard(true)} disabled={isLoading || units.length === 0 || !page.isReceivingReady} className="self-start bg-superficie shadow-whisper hover:bg-campo">
              <Repeat size={16} strokeWidth={2} aria-hidden />
              Nova recorrência
            </Button>}
          </div>
          <RecurringChargesList
            items={recurring}
            isLoading={isLoading}
            busyId={busyRecurringId}
            onCreate={() => openWizard(true)}
            onPause={(item) => void runRecurringAction(item, "pause")}
            onResume={(item) => void runRecurringAction(item, "resume")}
            onEnd={askEnd}
            canManage={canCreate}
          />
        </>
      )}

      {view === "platform" && (
        <>
          <p className="mb-4 text-sm text-tinta-suave">O que o condomínio paga ao Moraê pelo uso da plataforma.</p>
          <ul className="divide-y divide-linha overflow-hidden rounded-card bg-superficie shadow-whisper">
            {platformCharges.length === 0 ? (
              <li className="px-5 py-10 text-center text-sm text-tinta-suave">{isLoading ? "Carregando…" : "Nenhuma mensalidade lançada pelo Moraê."}</li>
            ) : (
              [...platformCharges]
                .sort((a, b) => Number(isOpenCharge(b)) - Number(isOpenCharge(a)) || b.dueDate.localeCompare(a.dueDate))
                .map((charge) => (
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
                          {charge.status === CHARGE_STATUS.overdue ? "venceu" : "vence"} {formatCalendarDate(charge.dueDate)}
                        </span>
                      </span>
                      <span className="text-right">
                        <span className="block text-sm font-semibold tabular-nums text-tinta">{formatCurrency(amountDue(charge))}</span>
                        <span className="mt-1 flex justify-end">
                          <ChargeStatusChip status={charge.status} />
                        </span>
                      </span>
                      <ChevronRight size={18} strokeWidth={1.8} aria-hidden className="shrink-0 text-tinta-suave" />
                    </button>
                  </li>
                ))
            )}
          </ul>
        </>
      )}

      {selectedCharge && !paymentForm && !cancelForm && !receiptChargeId && !payingChargeId && (
        <ChargeDetailsModal
          charge={selectedCharge}
          place={placeOf(selectedCharge)}
          person={
            selectedCharge.recipientName
              ? `só ${selectedCharge.recipientName}`
              : selectedCharge.unitId
                ? unitById.get(selectedCharge.unitId)?.responsiblePersonName || undefined
                : undefined
          }
          showTimeline
          onClose={() => setSelectedChargeId(null)}
          extra={
            selectedCharge.scope === 1 && isOpenCharge(selectedCharge) ? (
              <div className="mt-4 rounded-block bg-verde-suave px-4 py-3">
                <p className="text-xs font-semibold text-verde-tinta">Chave Pix do Moraê</p>
                <p className="mt-0.5 text-sm font-semibold text-tinta [overflow-wrap:anywhere]">{page.pixKey || "Ainda não cadastrada. Pague pelo Mercado Pago."}</p>
              </div>
            ) : selectedCharge.scope === 2 && selectedCharge.latestProofStatus ? (
              <PaymentProofsPanel chargeId={selectedCharge.id} canReview={canMarkPaid && isOpenCharge(selectedCharge)} onRejected={() => void reload()} />
            ) : undefined
          }
          footer={
            selectedCharge.status === CHARGE_STATUS.canceled ? undefined : selectedCharge.status === CHARGE_STATUS.renegotiated ? (
              <Button variant="quiet" onClick={() => { setSelectedChargeId(null); setView("agreements"); }}>
                Ver acordos
              </Button>
            ) : selectedCharge.status === CHARGE_STATUS.paid ? (
              <Button variant="quiet" onClick={() => setReceiptChargeId(selectedCharge.id)}>
                Ver comprovante
              </Button>
            ) : selectedCharge.scope === 1 ? (
              <Button
                variant="accent"
                onClick={() => {
                  setHasPaidOnline(false);
                  setPayingChargeId(selectedCharge.id);
                }}
              >
                Pagar agora
              </Button>
            ) : (
              <>
                {!isSyndic && !selectedCharge.agreementId && <button
                  type="button"
                  onClick={() => {
                    setModalError("");
                    setCancelForm({ chargeId: selectedCharge.id, reason: "" });
                  }}
                  className="mr-auto rounded-full px-2 text-sm font-semibold text-vermelho hover:underline"
                >
                  Cancelar
                </button>}
                {canAgree && selectedCharge.status === CHARGE_STATUS.overdue && !selectedCharge.agreementId && (
                  <Button variant="quiet" onClick={() => openAgreementWizard(selectedCharge.unitId ?? null)}>
                    Fazer acordo
                  </Button>
                )}
                {canMarkPaid && <Button
                  onClick={() => {
                    setModalError("");
                    setPaymentForm(toManualPaymentForm(selectedCharge));
                  }}
                >
                  {selectedCharge.pendingProofCount > 0 ? "Aceitar e dar baixa" : "Dar baixa"}
                </Button>}
              </>
            )
          }
        />
      )}

      {wizard && (
        <NewChargeWizard
          units={units}
          buildings={buildings}
          billingDueDay={settings?.billingDueDay ?? null}
          startRepeating={wizard.repeating}
          isSubmitting={isSubmitting}
          error={modalError}
          onClose={closeModals}
          onSubmit={(form, recipientName) => void createFromWizard(form, recipientName)}
        />
      )}

      {agreementWizard && (
        <AgreementWizard
          units={units}
          charges={charges}
          initialUnitId={agreementWizard.unitId}
          isSubmitting={isSubmitting}
          error={modalError}
          onClose={closeModals}
          onSubmit={(form) => void createAgreementFromWizard(form)}
        />
      )}

      {selectedAgreement && !confirmRequest && (
        <AgreementDetailsModal agreement={selectedAgreement} canManage={canCreate} onClose={() => setSelectedAgreementId(null)} onCancel={askCancelAgreement} />
      )}

      {paymentForm && (
        <ManualPaymentModal
          form={paymentForm}
          charge={paymentCharge}
          error={modalError}
          isSubmitting={isSubmitting}
          onChange={setPaymentForm}
          onClose={closeModals}
          onSubmit={(event) =>
            void submit(
              event,
              () => validateManualPayment(paymentForm, paymentCharge),
              async () => {
                await createManualPayment(paymentForm.chargeId, {
                  amountPaid: parseCurrencyInput(paymentForm.amountPaid),
                  paymentMethod: paymentForm.paymentMethod,
                  paidAt: paymentForm.paidAt || null,
                  notes: paymentForm.notes.trim() || null,
                });
                return "Pagamento registrado.";
              },
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
              async () => {
                await cancelCharge(cancelForm.chargeId, cancelForm.reason.trim());
                return "Cobrança cancelada.";
              },
              "Não foi possível cancelar a cobrança.",
            )
          }
        />
      )}

      {receiptChargeId && (
        <ChargeReceiptModal
          chargeId={receiptChargeId}
          onClose={() => setReceiptChargeId(null)}
          onRefunded={() => {
            setSelectedChargeId(null);
            void reload();
          }}
        />
      )}

      {payingChargeId && (
        <MercadoPagoPaymentModal
          chargeId={payingChargeId}
          onPaid={() => setHasPaidOnline(true)}
          onClose={() => {
            setPayingChargeId(null);
            // Reload only after closing, so the payer sees the confirmation first.
            if (hasPaidOnline) {
              setSelectedChargeId(null);
              void reload();
            }
          }}
        />
      )}

      {batchResult && <BatchResultModal title={batchResult.title} result={batchResult.result} onClose={() => setBatchResult(null)} />}
      {confirmRequest && <ConfirmDialog request={confirmRequest} onClose={() => setConfirmRequest(null)} />}
    </>
  );
}
