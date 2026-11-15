import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, DoorOpen, Plus } from "lucide-react";
import { useCondominium } from "../../app/providers/useCondominium";
import { Button } from "../../shared/components/Button";
import { ConfirmDialog, type ConfirmRequest } from "../../shared/components/ConfirmDialog";
import { SelectField } from "../../shared/components/SelectField";
import { PageHeader } from "../../shared/layout/PageHeader";
import { DateField } from "../../shared/components/DateField";
import { todayInputDate } from "../../shared/lib/date";
import { getBuildingsByCondominium } from "../buildings/buildingService";
import type { BuildingResponse } from "../buildings/types";
import type { SaveVisitRequest, VisitResponse, VisitorType } from "../visits/types";
import { cancelVisit, createVisit, getVisitAgenda, updateVisit } from "../visits/visitService";
import { VISIT_STATUS, addDays, formatDayHeading, formatShortDay, formatVisitPlace, visitorTypes } from "../visits/visitMeta";
import { useBuildingUnits } from "../visits/useBuildingUnits";
import { VisitDetailsModal, VisitFormModal, VisitorTypeChip } from "../visits/VisitModals";

// Days shown in the side panel and fetched in one request (the API allows up to 31).
const WINDOW_DAYS = 7;

type Filters = { condominiumId: number | null; buildingId: string; unitId: string; visitorType: string; includeCanceled: boolean };

const emptyFilters = (condominiumId: number | null): Filters => ({ condominiumId, buildingId: "", unitId: "", visitorType: "", includeCanceled: false });

type FormState = { visit: VisitResponse | null } | null;

function plural(count: number) {
  return `${count} visita${count === 1 ? "" : "s"}`;
}

// Whole-day visits first, then by arrival time and name.
function compareVisits(a: VisitResponse, b: VisitResponse) {
  return (a.startTime ?? "").localeCompare(b.startTime ?? "") || a.visitorName.localeCompare(b.visitorName, "pt-BR");
}

export function AdminVisitsPage() {
  const { condominiums, activeCondominium, activeCondominiumId, setActiveCondominiumId } = useCondominium();
  const today = todayInputDate();
  const [selectedDay, setSelectedDay] = useState(today);
  const [windowStart, setWindowStart] = useState(today);
  const [storedFilters, setStoredFilters] = useState<Filters>(() => emptyFilters(activeCondominiumId));
  const [buildingsState, setBuildingsState] = useState<{ condominiumId: number | null; buildings: BuildingResponse[] }>({ condominiumId: null, buildings: [] });
  const [agenda, setAgenda] = useState<{ key: string; visits: VisitResponse[] }>({ key: "", visits: [] });
  const [reloadToken, setReloadToken] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [formState, setFormState] = useState<FormState>(null);
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmRequest, setConfirmRequest] = useState<ConfirmRequest | null>(null);

  // Filters belong to one condominium: switching it in the sidebar starts clean.
  const filters = storedFilters.condominiumId === activeCondominiumId ? storedFilters : emptyFilters(activeCondominiumId);
  const buildings = buildingsState.condominiumId === activeCondominiumId ? buildingsState.buildings : [];
  // With a single building there is no building switch, so its units are offered straight away.
  const unitsBuildingId = filters.buildingId || (buildings.length === 1 ? String(buildings[0].id) : "");
  const units = useBuildingUnits(unitsBuildingId);
  const windowEnd = addDays(windowStart, WINDOW_DAYS - 1);
  const requestKey = [activeCondominiumId, windowStart, filters.buildingId, filters.unitId, filters.visitorType, filters.includeCanceled, reloadToken].join("|");
  const isLoading = agenda.key !== requestKey;

  useEffect(() => {
    if (!activeCondominiumId) return;
    let isMounted = true;

    getBuildingsByCondominium(activeCondominiumId)
      .then((result) => isMounted && setBuildingsState({ condominiumId: activeCondominiumId, buildings: result }))
      .catch(() => isMounted && setBuildingsState({ condominiumId: activeCondominiumId, buildings: [] }));

    return () => {
      isMounted = false;
    };
  }, [activeCondominiumId]);

  useEffect(() => {
    if (!activeCondominiumId) return;
    let isMounted = true;

    getVisitAgenda(activeCondominiumId, {
      from: windowStart,
      to: windowEnd,
      buildingId: filters.buildingId ? Number(filters.buildingId) : null,
      unitId: filters.unitId ? Number(filters.unitId) : null,
      visitorType: filters.visitorType ? (Number(filters.visitorType) as VisitorType) : null,
      includeCanceled: filters.includeCanceled,
    })
      .then((visits) => {
        if (!isMounted) return;
        setErrorMessage("");
        setAgenda({ key: requestKey, visits });
      })
      .catch((error) => {
        if (!isMounted) return;
        setErrorMessage(error instanceof Error ? error.message : "Não foi possível carregar as visitas.");
        setAgenda({ key: requestKey, visits: [] });
      });

    return () => {
      isMounted = false;
    };
    // requestKey already sums up every input of this request.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestKey]);

  const windowDays = useMemo(() => Array.from({ length: WINDOW_DAYS }, (_, index) => addDays(windowStart, index)), [windowStart]);
  const countByDay = useMemo(() => {
    const counts = new Map<string, number>();
    for (const visit of agenda.visits) {
      if (visit.status !== VISIT_STATUS.active) continue;
      for (const day of visit.dates ?? []) counts.set(day, (counts.get(day) ?? 0) + 1);
    }
    return counts;
  }, [agenda.visits]);

  const dayVisits = agenda.visits.filter((visit) => visit.dates?.includes(selectedDay)).sort(compareVisits);
  const selectedVisit = agenda.visits.find((visit) => visit.id === selectedId) ?? null;
  const hasFilters = Boolean(filters.buildingId || filters.unitId || filters.visitorType);
  const isPastDay = selectedDay < today;

  function updateFilters(changes: Partial<Filters>) {
    setStoredFilters({ ...filters, ...changes });
  }

  function goToDay(day: string) {
    setSelectedDay(day);
    if (day < windowStart || day > windowEnd) setWindowStart(day);
  }

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
      if (editing) {
        await updateVisit(editing.id, request);
      } else {
        await createVisit(activeCondominiumId, request);
        goToDay(request.startDate);
      }
      setFormState(null);
      setSuccessMessage(editing ? "Visita atualizada." : "Visita avisada. Ela já aparece na agenda.");
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
      description: `A visita de ${visit.visitorName} sai da agenda${visit.startDate !== visit.endDate ? " em todos os dias do período" : ""}. Ela fica no histórico e não pode ser reativada.`,
      confirmLabel: "Cancelar visita",
      cancelLabel: "Voltar",
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

  return (
    <>
      <PageHeader overline={activeCondominium ? `${activeCondominium.condominiumName} · agendadas no condomínio` : undefined} title="Visitantes">
        <Button variant="quiet" size="sm" onClick={() => openForm(null)} disabled={!activeCondominiumId} className="bg-superficie shadow-whisper hover:bg-campo">
          <Plus size={16} strokeWidth={2} aria-hidden />
          <span className="max-sm:sr-only">Visita do condomínio</span>
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

      <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:gap-6">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => goToDay(addDays(selectedDay, -1))}
            aria-label="Dia anterior"
            className="grid size-9 shrink-0 place-items-center rounded-full text-tinta-suave transition-colors hover:bg-superficie hover:text-tinta"
          >
            <ChevronLeft size={18} strokeWidth={1.8} aria-hidden />
          </button>
          <h2 aria-live="polite" className="min-w-0 truncate px-1 font-display text-[21px] font-bold tracking-[-0.01em] text-tinta first-letter:uppercase">
            {formatDayHeading(selectedDay, today)}
          </h2>
          <button
            type="button"
            onClick={() => goToDay(addDays(selectedDay, 1))}
            aria-label="Próximo dia"
            className="grid size-9 shrink-0 place-items-center rounded-full text-tinta-suave transition-colors hover:bg-superficie hover:text-tinta"
          >
            <ChevronRight size={18} strokeWidth={1.8} aria-hidden />
          </button>
          <DateField iconOnly label="Escolher outro dia" className="ml-1" value={selectedDay} onChange={(event) => event.target.value && goToDay(event.target.value)} />
          {selectedDay !== today && (
            <button type="button" onClick={() => goToDay(today)} className="ml-1 rounded-full px-3 py-1.5 text-sm font-semibold text-tinta transition-colors hover:bg-superficie">
              Hoje
            </button>
          )}
        </div>

        {buildings.length > 1 && (
          <div role="group" aria-label="Prédio" className="inline-flex max-w-full self-start overflow-x-auto rounded-block bg-menu p-1">
            {[{ id: "", name: "Todos os prédios" }, ...buildings.map((building) => ({ id: String(building.id), name: building.name }))].map((item) => (
              <button
                key={item.id || "all"}
                type="button"
                aria-pressed={filters.buildingId === item.id}
                onClick={() => updateFilters({ buildingId: item.id, unitId: "" })}
                className={`shrink-0 rounded-field px-3.5 py-1.5 text-sm font-semibold transition-colors ${
                  filters.buildingId === item.id ? "bg-superficie text-tinta shadow-whisper" : "text-tinta-suave hover:text-tinta"
                }`}
              >
                {item.name}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-2 [&_select]:bg-superficie [&_select]:py-2 [&_select]:text-sm [&_select]:shadow-whisper">
        <SelectField
          label="Tipo de visitante"
          className="w-full [&>label]:sr-only sm:w-52"
          value={filters.visitorType}
          onChange={(event) => updateFilters({ visitorType: event.target.value })}
          placeholder="Todos os tipos"
          options={visitorTypes.map((type) => ({ value: String(type.value), label: type.label }))}
        />
        {unitsBuildingId && (
          <SelectField
            label="Unidade"
            className="w-full [&>label]:sr-only sm:w-44"
            value={filters.unitId}
            onChange={(event) => updateFilters({ unitId: event.target.value })}
            placeholder="Todas as unidades"
            options={units.map((unit) => ({ value: String(unit.id), label: `Unidade ${unit.number}` }))}
          />
        )}
        <button
          type="button"
          aria-pressed={filters.includeCanceled}
          onClick={() => updateFilters({ includeCanceled: !filters.includeCanceled })}
          className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
            filters.includeCanceled ? "bg-tinta text-white hover:bg-tinta-forte" : "bg-superficie text-tinta-suave shadow-whisper hover:text-tinta"
          }`}
        >
          Mostrar canceladas
        </button>
        {hasFilters && (
          <button
            type="button"
            onClick={() => setStoredFilters({ ...emptyFilters(activeCondominiumId), includeCanceled: filters.includeCanceled })}
            className="rounded-full px-3 py-2 text-sm font-semibold text-tinta-suave underline-offset-4 hover:text-tinta hover:underline"
          >
            Limpar filtros
          </button>
        )}
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <ul aria-busy={isLoading} className="divide-y divide-linha overflow-hidden rounded-card bg-superficie shadow-whisper">
          {isLoading && dayVisits.length === 0 ? (
            <li className="px-5 py-12 text-center text-sm text-tinta-suave">Carregando…</li>
          ) : dayVisits.length === 0 ? (
            <li className="flex flex-col items-center gap-3 px-6 py-12 text-center">
              <span aria-hidden className="grid size-12 place-items-center rounded-block bg-campo text-tinta-suave">
                <DoorOpen size={22} strokeWidth={1.8} />
              </span>
              <p className="text-[15px] font-semibold text-tinta">
                {hasFilters ? "Nenhuma visita com esses filtros neste dia." : isPastDay ? "Nenhuma visita neste dia." : "Nenhuma visita avisada para este dia."}
              </p>
              {!hasFilters && !isPastDay && (
                <p className="max-w-sm text-sm text-tinta-suave">Quando um morador avisar uma visita, ela aparece aqui para a portaria conferir.</p>
              )}
            </li>
          ) : (
            dayVisits.map((visit) => {
              const isCanceled = visit.status === VISIT_STATUS.canceled;
              const details = [formatVisitPlace(visit), visit.companyName, visit.documentLastDigits && `doc. final ${visit.documentLastDigits}`].filter(Boolean).join(" · ");

              return (
                <li key={visit.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setSuccessMessage("");
                      setSelectedId(visit.id);
                    }}
                    className="flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-campo/60"
                  >
                    <span className={`w-14 shrink-0 tabular-nums ${isCanceled ? "text-tinta-suave" : "text-tinta"}`}>
                      {visit.startTime && visit.endTime ? (
                        <>
                          <span className="block text-[15px] font-semibold">{visit.startTime.slice(0, 5)}</span>
                          <span className="block text-xs text-tinta-suave">até {visit.endTime.slice(0, 5)}</span>
                        </>
                      ) : (
                        <span className="block text-sm font-semibold leading-tight">Dia todo</span>
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={`block truncate text-[15px] font-semibold ${isCanceled ? "text-tinta-suave line-through" : "text-tinta"}`}>
                        {visit.visitorName}
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

        <aside className="rounded-card bg-superficie p-5 shadow-whisper">
          <h2 className="px-1 font-display text-[19px] font-bold tracking-[-0.01em] text-tinta">
            {windowStart === today ? "Próximos 7 dias" : `Semana a partir de ${formatShortDay(windowStart).toLowerCase()}`}
          </h2>
          <ul className="mt-3 flex flex-col gap-1">
            {windowDays.map((day) => {
              const count = countByDay.get(day) ?? 0;
              const isSelected = day === selectedDay;
              return (
                <li key={day}>
                  <button
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => setSelectedDay(day)}
                    className={`flex w-full items-center justify-between rounded-field px-3 py-2.5 text-left transition-colors ${
                      isSelected ? "bg-verde-suave text-verde-tinta" : "text-tinta hover:bg-campo"
                    }`}
                  >
                    <span className="text-[15px] font-semibold">
                      {formatShortDay(day)}
                      {day === today && <span className="ml-2 text-xs font-medium text-tinta-suave">hoje</span>}
                    </span>
                    <span className={`text-[13px] tabular-nums ${count ? "" : "text-tinta-suave"}`}>{isLoading ? "–" : count ? plural(count) : "nenhuma"}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>
      </div>

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
          buildings={buildings}
          defaultDate={isPastDay ? today : selectedDay}
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
