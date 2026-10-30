import { useEffect, useMemo, useState } from "react";
import { ChevronRight, ListPlus, Plus, Wrench } from "lucide-react";
import { useCondominium } from "../../app/providers/useCondominium";
import { Button } from "../../shared/components/Button";
import { ConfirmDialog, type ConfirmRequest } from "../../shared/components/ConfirmDialog";
import { Modal } from "../../shared/components/Modal";
import { SelectField } from "../../shared/components/SelectField";
import { SummaryCard } from "../../shared/components/SummaryCard";
import { useMediaQuery } from "../../shared/hooks/useMediaQuery";
import { PageHeader } from "../../shared/layout/PageHeader";
import { formatCalendarDate, todayInputDate } from "../../shared/lib/date";
import { getBuildingsByCondominium } from "../buildings/buildingService";
import type { BuildingResponse } from "../buildings/types";
import { MaintenanceDetail, MaintenanceDueChip, MaintenanceTile } from "./MaintenanceDetail";
import { MAINTENANCE_STATUS, intervalLabel, scopeLabel, toPlanRequest, type PlanForm } from "./maintenanceMeta";
import { PlanFormModal, RecordFormModal } from "./MaintenanceModals";
import {
  createDefaultMaintenancePlans,
  createMaintenancePlan,
  createMaintenanceRecord,
  deleteMaintenancePlan,
  deleteMaintenanceRecord,
  getMaintenancePlans,
  updateMaintenancePlan,
} from "./maintenanceService";
import type { CreateMaintenanceRecordRequest, MaintenancePlanResponse, MaintenanceRecordResponse, MaintenanceStatus } from "./types";

type Tab = "all" | "overdue" | "dueSoon" | "upToDate";

const tabs: Array<{ key: Tab; label: string; status?: MaintenanceStatus }> = [
  { key: "all", label: "Todas" },
  { key: "overdue", label: "Atrasadas", status: MAINTENANCE_STATUS.overdue },
  { key: "dueSoon", label: "Vencem em breve", status: MAINTENANCE_STATUS.dueSoon },
  { key: "upToDate", label: "Em dia", status: MAINTENANCE_STATUS.upToDate },
];

// "" = every place, "none" = only condominium-wide plans, otherwise a building id.
const WHOLE_CONDOMINIUM = "none";

type LoadedData = { condominiumId: number; plans: MaintenancePlanResponse[]; buildings: BuildingResponse[] };
type PlanFormState = { plan: MaintenancePlanResponse | null } | null;

// Preventive maintenance of the active condominium (management: Admin, and the syndic with maintenance.manage).
export function PreventiveMaintenancePage() {
  const { condominiums, activeCondominium, activeCondominiumId, setActiveCondominiumId } = useCondominium();
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const [data, setData] = useState<LoadedData | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [tab, setTab] = useState<Tab>("all");
  const [buildingFilter, setBuildingFilter] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [planForm, setPlanForm] = useState<PlanFormState>(null);
  const [recordPlan, setRecordPlan] = useState<MaintenancePlanResponse | null>(null);
  const [modalError, setModalError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmRequest, setConfirmRequest] = useState<ConfirmRequest | null>(null);
  const [recordsVersion, setRecordsVersion] = useState(0);

  useEffect(() => {
    if (!activeCondominiumId) return;
    let isMounted = true;

    Promise.all([getMaintenancePlans(activeCondominiumId), getBuildingsByCondominium(activeCondominiumId).catch(() => [])])
      .then(([plans, buildings]) => {
        if (!isMounted) return;
        setData({ condominiumId: activeCondominiumId, plans, buildings });
        setErrorMessage("");
      })
      .catch((error) => isMounted && setErrorMessage(error instanceof Error ? error.message : "Não foi possível carregar as manutenções."));

    return () => {
      isMounted = false;
    };
  }, [activeCondominiumId]);

  const isCurrent = data !== null && data.condominiumId === activeCondominiumId;
  const isLoading = !isCurrent && !errorMessage;
  const plans = useMemo(() => (isCurrent ? data.plans : []), [isCurrent, data]);
  const buildings = isCurrent ? data.buildings : [];

  async function reload() {
    if (!activeCondominiumId) return [];
    const result = await getMaintenancePlans(activeCondominiumId);
    setData((current) => ({ condominiumId: activeCondominiumId, plans: result, buildings: current?.buildings ?? [] }));
    return result;
  }

  const summary = useMemo(() => {
    const currentMonth = todayInputDate().slice(0, 7);
    const overdue = plans.filter((plan) => plan.status === MAINTENANCE_STATUS.overdue);
    const dueSoon = plans.filter((plan) => plan.status === MAINTENANCE_STATUS.dueSoon);
    return {
      overdue,
      dueSoon,
      doneThisMonth: plans.filter((plan) => plan.lastPerformedOn?.startsWith(currentMonth)).length,
    };
  }, [plans]);

  const placePlans = plans.filter((plan) =>
    !buildingFilter ? true : buildingFilter === WHOLE_CONDOMINIUM ? plan.buildingId === null : plan.buildingId === Number(buildingFilter),
  );
  const countFor = (key: Tab) => {
    const status = tabs.find((item) => item.key === key)?.status;
    return status ? placePlans.filter((plan) => plan.status === status).length : placePlans.length;
  };
  const activeStatus = tabs.find((item) => item.key === tab)?.status;
  const visiblePlans = activeStatus ? placePlans.filter((plan) => plan.status === activeStatus) : placePlans;

  // On the computer the panel always shows a plan of the current filter; on the phone the detail opens on tap.
  const selectedPlan = visiblePlans.find((plan) => plan.id === selectedId) ?? (isDesktop ? visiblePlans[0] ?? null : null);
  const isOtherModalOpen = Boolean(planForm || recordPlan || confirmRequest);

  function selectPlan(plan: MaintenancePlanResponse) {
    setSuccessMessage("");
    setSelectedId(plan.id);
  }

  function openPlanForm(plan: MaintenancePlanResponse | null) {
    setModalError("");
    setSuccessMessage("");
    setPlanForm({ plan });
  }

  function openRecordForm(plan: MaintenancePlanResponse) {
    setModalError("");
    setSuccessMessage("");
    setRecordPlan(plan);
  }

  async function submitPlan(form: PlanForm) {
    if (!activeCondominiumId) return;
    const editing = planForm?.plan;
    setIsSubmitting(true);
    setModalError("");

    try {
      const saved = editing
        ? await updateMaintenancePlan(editing.id, toPlanRequest(form))
        : await createMaintenancePlan(activeCondominiumId, toPlanRequest(form));
      await reload();
      setPlanForm(null);
      if (isDesktop) setSelectedId(saved.id);
      setSuccessMessage(editing ? "Manutenção atualizada." : `"${saved.name}" cadastrada. Próxima data: ${formatCalendarDate(saved.nextDueDate)}.`);
    } catch (error) {
      setModalError(error instanceof Error ? error.message : "Não foi possível salvar a manutenção.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function submitRecord(record: CreateMaintenanceRecordRequest) {
    if (!recordPlan) return;
    setIsSubmitting(true);
    setModalError("");

    try {
      await createMaintenanceRecord(recordPlan.id, record);
      const updated = (await reload()).find((plan) => plan.id === recordPlan.id);
      setRecordsVersion((version) => version + 1);
      setRecordPlan(null);
      setSuccessMessage(updated ? `Execução registrada. Próxima data: ${formatCalendarDate(updated.nextDueDate)}.` : "Execução registrada.");
    } catch (error) {
      setModalError(error instanceof Error ? error.message : "Não foi possível registrar a execução.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function askDeletePlan(plan: MaintenancePlanResponse) {
    setSuccessMessage("");
    setConfirmRequest({
      title: "Apagar esta manutenção?",
      description: `"${plan.name}" sai da lista junto com todo o histórico de execuções e os anexos. Esta ação não pode ser desfeita.`,
      confirmLabel: "Apagar manutenção",
      tone: "danger",
      onConfirm: async () => {
        try {
          await deleteMaintenancePlan(plan.id);
          setSelectedId(null);
          await reload();
          setSuccessMessage("Manutenção apagada.");
        } catch (error) {
          setErrorMessage(error instanceof Error ? error.message : "Não foi possível apagar a manutenção.");
        }
      },
    });
  }

  function askDeleteRecord(plan: MaintenancePlanResponse, record: MaintenanceRecordResponse, isLatest: boolean) {
    setSuccessMessage("");
    setConfirmRequest({
      title: "Apagar este registro?",
      description: [
        `A execução de ${formatCalendarDate(record.performedOn)} sai do histórico de "${plan.name}".`,
        isLatest ? "Como é a mais recente, a próxima data volta a ser a que valia antes dela." : "A próxima data não muda.",
        record.hasAttachment ? "O anexo também é apagado." : "",
      ]
        .filter(Boolean)
        .join(" "),
      confirmLabel: "Apagar registro",
      tone: "danger",
      onConfirm: async () => {
        try {
          await deleteMaintenanceRecord(record.id);
          await reload();
          setRecordsVersion((version) => version + 1);
          setSuccessMessage("Registro apagado.");
        } catch (error) {
          setErrorMessage(error instanceof Error ? error.message : "Não foi possível apagar o registro.");
        }
      },
    });
  }

  function askAddDefaults() {
    if (!activeCondominiumId) return;
    const condominiumId = activeCondominiumId;
    setSuccessMessage("");
    setConfirmRequest({
      title: "Adicionar as manutenções comuns?",
      description:
        "Entram as que ainda faltam: elevador (se algum prédio tiver), extintores, mangueiras e hidrantes, AVCB, caixa d'água, dedetização, para-raios e bombas d'água. Todas valem para o condomínio inteiro e começam com a próxima data daqui a 30 dias, para você ajustar cada uma.",
      confirmLabel: "Adicionar",
      onConfirm: async () => {
        try {
          const added = await createDefaultMaintenancePlans(condominiumId);
          await reload();
          setSuccessMessage(
            added.length === 0
              ? "Todas as manutenções comuns já estavam cadastradas."
              : `${added.length} ${added.length === 1 ? "manutenção adicionada" : "manutenções adicionadas"}. Confira as datas e as empresas de cada uma.`,
          );
        } catch (error) {
          setErrorMessage(error instanceof Error ? error.message : "Não foi possível adicionar as manutenções comuns.");
        }
      },
    });
  }

  const detailProps = selectedPlan && {
    plan: selectedPlan,
    recordsVersion,
    onRegister: () => openRecordForm(selectedPlan),
    onEdit: () => openPlanForm(selectedPlan),
    onDelete: () => askDeletePlan(selectedPlan),
    onDeleteRecord: (record: MaintenanceRecordResponse, isLatest: boolean) => askDeleteRecord(selectedPlan, record, isLatest),
  };

  return (
    <>
      <PageHeader
        overline={
          activeCondominium
            ? `${activeCondominium.condominiumName}${isCurrent ? ` · ${plans.length} ${plans.length === 1 ? "manutenção" : "manutenções"}` : ""}`
            : undefined
        }
        title="Manutenção preventiva"
      >
        <Button variant="quiet" size="sm" onClick={() => openPlanForm(null)} disabled={!activeCondominiumId} className="bg-superficie shadow-whisper hover:bg-campo">
          <Plus size={16} strokeWidth={2} aria-hidden />
          <span className="max-sm:sr-only">Nova manutenção</span>
        </Button>
      </PageHeader>

      {condominiums.length > 1 && (
        <SelectField
          label="Condomínio"
          className="mb-6 lg:hidden"
          value={activeCondominiumId ? String(activeCondominiumId) : ""}
          onChange={(event) => setActiveCondominiumId(Number(event.target.value))}
          options={condominiums.map((condominium) => ({ value: String(condominium.condominiumId), label: condominium.condominiumName }))}
        />
      )}

      {errorMessage && (
        <p role="alert" className="mb-5 rounded-field bg-vermelho-suave px-4 py-3 text-sm font-medium text-vermelho">
          {errorMessage}
        </p>
      )}
      {successMessage && (
        <p role="status" className="mb-5 rounded-field bg-verde-suave px-4 py-3 text-sm font-medium text-verde-tinta">
          {successMessage}
        </p>
      )}

      {!activeCondominiumId ? (
        <p className="rounded-card bg-superficie px-6 py-10 text-center text-sm text-tinta-suave shadow-whisper">
          Escolha um condomínio para ver as manutenções.
        </p>
      ) : !isLoading && plans.length === 0 && !errorMessage ? (
        <section className="flex flex-col items-center rounded-card bg-superficie px-6 py-14 text-center shadow-whisper">
          <span className="grid size-12 place-items-center rounded-block bg-verde-suave text-verde-tinta">
            <Wrench size={22} strokeWidth={1.8} aria-hidden />
          </span>
          <h2 className="mt-4 font-display text-lg font-bold text-tinta">Nenhuma manutenção cadastrada</h2>
          <p className="mt-1 max-w-md text-sm leading-relaxed text-tinta-suave">
            Comece pelas manutenções comuns de condomínio (elevador, extintores, caixa d'água, dedetização…) e ajuste a data e a empresa de cada uma. O
            Moraê avisa a gestão 30 e 7 dias antes de cada vencimento.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Button variant="accent" onClick={askAddDefaults}>
              <ListPlus size={18} strokeWidth={1.8} aria-hidden />
              Adicionar manutenções comuns
            </Button>
            <Button variant="quiet" onClick={() => openPlanForm(null)}>
              Cadastrar uma manutenção
            </Button>
          </div>
        </section>
      ) : (
        <>
          <SummaryCard
            items={[
              {
                label: "Atrasadas",
                value: isLoading ? "–" : String(summary.overdue.length),
                detail: summary.overdue[0] ? `a mais antiga venceu em ${formatCalendarDate(summary.overdue[0].nextDueDate)}` : "nenhuma atrasada",
                tone: summary.overdue.length > 0 ? "danger" : "neutral",
              },
              {
                label: "Próximos 30 dias",
                value: isLoading ? "–" : String(summary.dueSoon.length),
                detail: summary.dueSoon[0] ? `a próxima em ${formatCalendarDate(summary.dueSoon[0].nextDueDate)}` : "nada vencendo",
              },
              {
                label: "Feitas neste mês",
                value: isLoading ? "–" : String(summary.doneThisMonth),
                detail: "com execução registrada",
                tone: summary.doneThisMonth > 0 ? "good" : "neutral",
              },
            ]}
          />

          <div className="mb-4 mt-8 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div role="tablist" aria-label="Situação das manutenções" className="inline-flex max-w-full self-start overflow-x-auto rounded-block bg-menu p-1">
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
                  <span className="text-xs font-medium tabular-nums text-tinta-suave">{isLoading ? "" : countFor(item.key)}</span>
                </button>
              ))}
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              {buildings.length > 0 && (
                <SelectField
                  label="Onde"
                  className="[&>label]:sr-only sm:w-56"
                  value={buildingFilter}
                  onChange={(event) => setBuildingFilter(event.target.value)}
                  options={[
                    { value: "", label: "Todos os lugares" },
                    { value: WHOLE_CONDOMINIUM, label: "Condomínio inteiro" },
                    ...buildings.map((building) => ({ value: String(building.id), label: building.name })),
                  ]}
                />
              )}
              <Button variant="quiet" size="sm" onClick={askAddDefaults} className="self-start bg-superficie shadow-whisper hover:bg-campo sm:self-auto">
                <ListPlus size={16} strokeWidth={1.8} aria-hidden />
                Adicionar comuns
              </Button>
            </div>
          </div>

          <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(320px,380px)]">
            <ul className="divide-y divide-linha overflow-hidden rounded-card bg-superficie shadow-whisper">
              {visiblePlans.length === 0 ? (
                <li className="px-5 py-10 text-center text-sm text-tinta-suave">
                  {isLoading ? "Carregando…" : buildingFilter ? "Nenhuma manutenção nesta situação neste lugar." : "Nenhuma manutenção nesta situação."}
                </li>
              ) : (
                visiblePlans.map((plan) => {
                  const isSelected = isDesktop && selectedPlan?.id === plan.id;
                  return (
                    <li key={plan.id}>
                      <button
                        type="button"
                        onClick={() => selectPlan(plan)}
                        aria-current={isSelected || undefined}
                        className={`flex w-full items-center gap-4 px-5 py-4 text-left transition-colors ${isSelected ? "bg-verde-suave/50" : "hover:bg-campo/60"}`}
                      >
                        <MaintenanceTile plan={plan} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[15px] font-semibold text-tinta">{plan.name}</span>
                          <span className="block truncate text-[13px] text-tinta-suave">
                            {scopeLabel(plan)} · {intervalLabel(plan.intervalMonths)}
                          </span>
                          <span className="mt-1.5 flex sm:hidden">
                            <MaintenanceDueChip plan={plan} />
                          </span>
                        </span>
                        <span className="hidden sm:flex">
                          <MaintenanceDueChip plan={plan} />
                        </span>
                        <ChevronRight size={18} strokeWidth={1.8} aria-hidden className="shrink-0 text-tinta-suave lg:hidden" />
                      </button>
                    </li>
                  );
                })
              )}
            </ul>

            {isDesktop && detailProps && (
              <aside aria-label="Detalhes da manutenção" className="sticky top-8 rounded-card bg-superficie p-6 shadow-whisper">
                <MaintenanceDetail key={detailProps.plan.id} {...detailProps} />
              </aside>
            )}
          </div>
        </>
      )}

      {!isDesktop && detailProps && !isOtherModalOpen && (
        <Modal
          title={detailProps.plan.name}
          description={<MaintenanceDueChip plan={detailProps.plan} />}
          leading={<MaintenanceTile plan={detailProps.plan} size="lg" />}
          onClose={() => setSelectedId(null)}
        >
          <MaintenanceDetail key={detailProps.plan.id} {...detailProps} showHeader={false} />
        </Modal>
      )}

      {planForm && (
        <PlanFormModal
          plan={planForm.plan}
          buildings={buildings}
          errorMessage={modalError}
          isSubmitting={isSubmitting}
          onClose={() => setPlanForm(null)}
          onSubmit={submitPlan}
        />
      )}

      {recordPlan && (
        <RecordFormModal
          plan={recordPlan}
          errorMessage={modalError}
          isSubmitting={isSubmitting}
          onClose={() => setRecordPlan(null)}
          onSubmit={submitRecord}
        />
      )}

      {confirmRequest && <ConfirmDialog request={confirmRequest} onClose={() => setConfirmRequest(null)} />}
    </>
  );
}
