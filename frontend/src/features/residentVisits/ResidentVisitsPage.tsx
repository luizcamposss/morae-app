import { useEffect, useMemo, useState } from "react";
import { ChevronRight, DoorOpen, Plus, Repeat } from "lucide-react";
import { useCondominium } from "../../app/providers/useCondominium";
import { Button } from "../../shared/components/Button";
import { ConfirmDialog, type ConfirmRequest } from "../../shared/components/ConfirmDialog";
import { SelectField } from "../../shared/components/SelectField";
import { PageHeader } from "../../shared/layout/PageHeader";
import { todayInputDate } from "../../shared/lib/date";
import { getMyUnits } from "../me/meService";
import type { MeUnitResponse } from "../me/types";
import type { SaveVisitRequest, VisitResponse } from "../visits/types";
import { cancelVisit, createVisit, getMyVisits, updateVisit } from "../visits/visitService";
import { VISIT_STATUS, WEEKDAYS_SHORT, describeTime, formatVisitPlace, isRecurring, weekdayOf } from "../visits/visitMeta";
import { VisitDetailsModal, VisitFormModal, VisitorTypeChip, type OwnUnitOption } from "../visits/VisitModals";
import { describeRecurrence, nextVisitDate } from "./residentVisitMeta";

type Tab = "upcoming" | "history";

type FormState = { visit: VisitResponse | null } | null;

export function ResidentVisitsPage() {
  const { condominiums, activeCondominium, activeCondominiumId, setActiveCondominiumId } = useCondominium();
  const today = todayInputDate();
  const [tab, setTab] = useState<Tab>("upcoming");
  const [data, setData] = useState<{ key: string; visits: VisitResponse[] }>({ key: "", visits: [] });
  // null while loading: all the units of the user, in every condominium.
  const [allUnits, setAllUnits] = useState<MeUnitResponse[] | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [formState, setFormState] = useState<FormState>(null);
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmRequest, setConfirmRequest] = useState<ConfirmRequest | null>(null);

  const requestKey = `${activeCondominiumId}|${reloadToken}`;
  const isLoading = data.key !== requestKey;
  const ownUnits = useMemo<OwnUnitOption[]>(
    () =>
      (allUnits ?? [])
        .filter((unit) => unit.condominiumId === activeCondominiumId)
        .map((unit) => ({ unitId: unit.unitId, buildingId: unit.buildingId, label: `${unit.buildingName}, unidade ${unit.unitNumber}` })),
    [allUnits, activeCondominiumId],
  );

  useEffect(() => {
    let isMounted = true;

    getMyUnits()
      .then((units) => isMounted && setAllUnits(units))
      .catch(() => isMounted && setAllUnits([]));

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!activeCondominiumId) return;
    let isMounted = true;

    // One request with the past included; upcoming and history are split here.
    getMyVisits(activeCondominiumId, true)
      .then((visits) => {
        if (!isMounted) return;
        setErrorMessage("");
        setData({ key: requestKey, visits });
      })
      .catch((error) => {
        if (!isMounted) return;
        setErrorMessage(error instanceof Error ? error.message : "Não foi possível carregar suas visitas.");
        setData({ key: requestKey, visits: [] });
      });

    return () => {
      isMounted = false;
    };
    // requestKey already sums up every input of this request.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestKey]);

  const { upcoming, history } = useMemo(() => {
    const visits = isLoading ? [] : data.visits;
    const upcomingList = visits
      .filter((visit) => visit.status === VISIT_STATUS.active && visit.endDate >= today)
      .map((visit) => ({ visit, date: nextVisitDate(visit, today) }))
      .sort((a, b) => a.date.localeCompare(b.date) || (a.visit.startTime ?? "").localeCompare(b.visit.startTime ?? ""));
    const historyList = visits
      .filter((visit) => visit.status === VISIT_STATUS.canceled || visit.endDate < today)
      .map((visit) => ({ visit, date: visit.startDate }))
      .sort((a, b) => b.visit.endDate.localeCompare(a.visit.endDate) || b.visit.startDate.localeCompare(a.visit.startDate));
    return { upcoming: upcomingList, history: historyList };
  }, [data.visits, isLoading, today]);

  const items = tab === "upcoming" ? upcoming : history;
  const selectedVisit = data.visits.find((visit) => visit.id === selectedId) ?? null;
  const hasNoUnit = allUnits !== null && ownUnits.length === 0;
  const showPlace = ownUnits.length > 1;

  function canChange(visit: VisitResponse) {
    return visit.status === VISIT_STATUS.active && visit.endDate >= today;
  }

  function openForm(visit: VisitResponse | null) {
    setFormError("");
    setSuccessMessage("");
    setSelectedId(null);
    setFormState({ visit });
  }

  async function handleSubmit(request: SaveVisitRequest) {
    if (!activeCondominiumId) return;
    const editing = formState?.visit;
    setIsSubmitting(true);
    setFormError("");

    try {
      if (editing) await updateVisit(editing.id, request);
      else await createVisit(activeCondominiumId, request);
      setFormState(null);
      setTab("upcoming");
      setSuccessMessage(editing ? "Visita atualizada." : "Visita avisada. Ela já aparece em Próximas.");
      setReloadToken((token) => token + 1);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Não foi possível salvar a visita.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function askCancel(visit: VisitResponse) {
    setSelectedId(null);
    setConfirmRequest({
      title: "Cancelar esta visita?",
      description: `A visita de ${visit.visitorName} é cancelada${isRecurring(visit) ? " em todos os dias do período" : ""}. Ela fica no histórico e não pode ser reativada.`,
      confirmLabel: "Cancelar visita",
      tone: "danger",
      onConfirm: async () => {
        try {
          await cancelVisit(visit.id);
          setSuccessMessage("Visita cancelada.");
          setReloadToken((token) => token + 1);
        } catch (error) {
          setErrorMessage(error instanceof Error ? error.message : "Não foi possível cancelar a visita.");
        }
      },
    });
  }

  const tabs: Array<{ key: Tab; label: string; count: number }> = [
    { key: "upcoming", label: "Próximas", count: upcoming.length },
    { key: "history", label: "Histórico", count: history.length },
  ];

  return (
    <>
      <PageHeader overline={activeCondominium?.condominiumName} title="Visitas">
        <Button size="sm" onClick={() => openForm(null)} disabled={!activeCondominiumId || allUnits === null || hasNoUnit}>
          <Plus size={16} strokeWidth={2} aria-hidden />
          Avisar visita
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
        <p role="alert" className="mb-6 rounded-field bg-vermelho-suave px-4 py-3 text-sm font-medium text-vermelho">
          {errorMessage}
        </p>
      )}
      {successMessage && (
        <p role="status" className="mb-6 rounded-field bg-verde-suave px-4 py-3 text-sm font-medium text-verde-tinta">
          {successMessage}
        </p>
      )}
      {hasNoUnit && (
        <p className="mb-6 rounded-field bg-campo px-4 py-3 text-sm text-tinta-suave">
          Você ainda não está ligado a uma unidade neste condomínio. Peça à administração para vincular você e então avise suas visitas por aqui.
        </p>
      )}

      <div role="tablist" aria-label="Visitas" className="mb-4 flex w-full rounded-block bg-menu p-1 sm:inline-flex sm:w-auto">
        {tabs.map((item) => (
          <button
            key={item.key}
            type="button"
            role="tab"
            aria-selected={tab === item.key}
            onClick={() => setTab(item.key)}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-field px-4 py-2 text-sm font-semibold transition-colors sm:flex-none ${
              tab === item.key ? "bg-superficie text-tinta shadow-whisper" : "text-tinta-suave hover:text-tinta"
            }`}
          >
            {item.label}
            <span className="text-xs font-medium tabular-nums text-tinta-suave">{isLoading ? "" : item.count}</span>
          </button>
        ))}
      </div>

      <ul aria-busy={isLoading} className="max-w-3xl divide-y divide-linha overflow-hidden rounded-card bg-superficie shadow-whisper">
        {isLoading ? (
          <li className="px-5 py-12 text-center text-sm text-tinta-suave">Carregando…</li>
        ) : items.length === 0 ? (
          <li className="flex flex-col items-center gap-3 px-6 py-12 text-center">
            <span aria-hidden className="grid size-12 place-items-center rounded-block bg-campo text-tinta-suave">
              <DoorOpen size={22} strokeWidth={1.8} />
            </span>
            <p className="text-[15px] font-semibold text-tinta">{tab === "upcoming" ? "Nenhuma visita marcada." : "Nada no histórico ainda."}</p>
            <p className="max-w-sm text-sm text-tinta-suave">
              {tab === "upcoming"
                ? "Vai receber alguém? Avise quem vem e quando: visitante, prestador de serviço ou funcionário da casa."
                : "Visitas que já passaram ou foram canceladas ficam guardadas aqui."}
            </p>
          </li>
        ) : (
          items.map(({ visit, date }) => {
            const isPast = tab === "history";
            const isCanceled = visit.status === VISIT_STATUS.canceled;
            const isToday = date === today && !isPast;
            const recurring = isRecurring(visit);
            const details = [
              describeTime(visit),
              recurring && describeRecurrence(visit),
              showPlace && formatVisitPlace(visit),
            ]
              .filter(Boolean)
              .join(" · ");

            return (
              <li key={visit.id}>
                <button
                  type="button"
                  onClick={() => {
                    setSuccessMessage("");
                    setSelectedId(visit.id);
                  }}
                  className="flex w-full items-center gap-3.5 px-4 py-3.5 text-left transition-colors hover:bg-campo/60 sm:gap-4 sm:px-5"
                >
                  <span
                    className={`flex w-12 shrink-0 flex-col items-center rounded-block py-1.5 tabular-nums ${
                      isToday ? "bg-verde-suave text-verde-tinta" : isPast ? "bg-campo text-tinta-suave" : "bg-campo text-tinta"
                    }`}
                  >
                    <span className="text-[11px] font-semibold uppercase leading-tight">{isToday ? "hoje" : WEEKDAYS_SHORT[weekdayOf(date)]}</span>
                    <span className="font-display text-[19px] font-bold leading-tight">{date.slice(8, 10)}</span>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={`flex items-center gap-1.5 text-[15px] font-semibold ${isCanceled ? "text-tinta-suave line-through" : "text-tinta"}`}>
                      <span className="truncate">{visit.visitorName}</span>
                      {recurring && <Repeat size={14} strokeWidth={2} aria-label="Recorrente" className="shrink-0 text-tinta-suave" />}
                    </span>
                    <span className="block truncate text-[13px] text-tinta-suave">{details}</span>
                  </span>
                  <VisitorTypeChip visit={visit} />
                  <ChevronRight size={18} strokeWidth={1.8} aria-hidden className="hidden shrink-0 text-tinta-suave sm:block" />
                </button>
              </li>
            );
          })
        )}
      </ul>

      {selectedVisit && (
        <VisitDetailsModal
          visit={selectedVisit}
          canChange={canChange(selectedVisit)}
          onClose={() => setSelectedId(null)}
          onEdit={() => openForm(selectedVisit)}
          onCancel={() => askCancel(selectedVisit)}
        />
      )}

      {formState && (
        <VisitFormModal
          visit={formState.visit}
          ownUnits={ownUnits}
          defaultDate={today}
          today={today}
          errorMessage={formError}
          isSubmitting={isSubmitting}
          onClose={() => setFormState(null)}
          onSubmit={handleSubmit}
        />
      )}

      {confirmRequest && <ConfirmDialog request={confirmRequest} onClose={() => setConfirmRequest(null)} />}
    </>
  );
}
