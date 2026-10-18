import { useEffect, useState } from "react";
import { Camera, ChevronDown, MessageSquareText, Search, TriangleAlert } from "lucide-react";
import { useCondominium } from "../../app/providers/useCondominium";
import { MoraeMark } from "../../shared/components/MoraeMark";
import { SelectField } from "../../shared/components/SelectField";
import { SummaryCard } from "../../shared/components/SummaryCard";
import { PageHeader } from "../../shared/layout/PageHeader";
import { formatDate } from "../../shared/lib/date";
import { OCCURRENCE_STATUS, formatPlace, isPending, matchesSearch, occurrenceStatuses, priorityMeta, statusMeta, typeLabel } from "../occurrences/occurrenceMeta";
import { getOccurrencesByCondominium, respondToOccurrence, updateOccurrenceStatus } from "../occurrences/occurrenceService";
import type { OccurrenceResponse, OccurrenceStatus } from "../occurrences/types";
import { OccurrenceDetailsModal, StatusChip } from "./OccurrenceModals";

type LoadedOccurrences = { condominiumId: number | null; occurrences: OccurrenceResponse[]; errorMessage: string };
type Filters = { condominiumId: number | null; status: OccurrenceStatus | null; buildingId: string; search: string };

const emptyFilters = (condominiumId: number | null): Filters => ({ condominiumId, status: null, buildingId: "", search: "" });

// Management view (Admin; reusable by the syndic with occurrences.manage): list, filters,
// details with photos, status change and the reply that notifies whoever opened it.
export function AdminOccurrencesPage() {
  const { condominiums, activeCondominium, activeCondominiumId, setActiveCondominiumId } = useCondominium();
  const [loaded, setLoaded] = useState<LoadedOccurrences>({ condominiumId: null, occurrences: [], errorMessage: "" });
  const [storedFilters, setStoredFilters] = useState<Filters>(() => emptyFilters(activeCondominiumId));
  const [successMessage, setSuccessMessage] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [modalError, setModalError] = useState("");
  const [busyAction, setBusyAction] = useState<"status" | "response" | null>(null);

  useEffect(() => {
    if (!activeCondominiumId) return;
    let isMounted = true;

    getOccurrencesByCondominium(activeCondominiumId)
      .then((occurrences) => isMounted && setLoaded({ condominiumId: activeCondominiumId, occurrences, errorMessage: "" }))
      .catch(
        (error) =>
          isMounted &&
          setLoaded({
            condominiumId: activeCondominiumId,
            occurrences: [],
            errorMessage: error instanceof Error ? error.message : "Não foi possível carregar as ocorrências.",
          }),
      );

    return () => {
      isMounted = false;
    };
  }, [activeCondominiumId]);

  // Filters belong to one condominium: switching it in the sidebar starts clean.
  const filters = storedFilters.condominiumId === activeCondominiumId ? storedFilters : emptyFilters(activeCondominiumId);
  const isLoading = loaded.condominiumId !== activeCondominiumId;
  const occurrences = isLoading ? [] : loaded.occurrences;
  const selectedOccurrence = occurrences.find((item) => item.id === selectedId) ?? null;

  // Buildings come from the occurrences themselves: the filter only offers ones with something to show.
  const buildings = [...new Map(occurrences.map((item) => [item.buildingId, item.buildingName]))]
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR", { numeric: true }));
  const showBuilding = buildings.length > 1;

  // Status tabs count what the building and search filters leave.
  const scoped = occurrences.filter(
    (item) => (!filters.buildingId || String(item.buildingId) === filters.buildingId) && matchesSearch(item, filters.search),
  );
  const visible = filters.status ? scoped.filter((item) => item.status === filters.status) : scoped;
  const hasFilters = Boolean(filters.buildingId || filters.search.trim());

  const countBy = (status: OccurrenceStatus, list = occurrences) => list.filter((item) => item.status === status).length;
  const unanswered = occurrences.filter((item) => isPending(item) && !item.managementResponse).length;
  const urgent = occurrences.filter((item) => isPending(item) && item.priority >= 3).length;

  function updateFilters(changes: Partial<Filters>) {
    setSuccessMessage("");
    setStoredFilters({ ...filters, ...changes });
  }

  function replaceOccurrence(updated: OccurrenceResponse) {
    setLoaded((current) => ({ ...current, occurrences: current.occurrences.map((item) => (item.id === updated.id ? updated : item)) }));
  }

  function openDetails(id: number) {
    setSuccessMessage("");
    setModalError("");
    setSelectedId(id);
  }

  async function handleChangeStatus(occurrence: OccurrenceResponse, status: OccurrenceStatus) {
    setBusyAction("status");
    setModalError("");

    try {
      await updateOccurrenceStatus(occurrence.id, { status });
      const now = new Date().toISOString();
      replaceOccurrence({ ...occurrence, status, updatedAt: now, resolvedAt: status === OCCURRENCE_STATUS.resolved ? now : null });
      setSuccessMessage(`"${occurrence.title}" agora está como ${statusMeta(status).label.toLowerCase()}.`);
    } catch (error) {
      setModalError(error instanceof Error ? error.message : "Não foi possível mudar a situação.");
    } finally {
      setBusyAction(null);
    }
  }

  async function handleRespond(occurrence: OccurrenceResponse, message: string) {
    setBusyAction("response");
    setModalError("");

    try {
      replaceOccurrence(await respondToOccurrence(occurrence.id, { message }));
      setSuccessMessage(`Resposta enviada. ${occurrence.createdByName || "Quem abriu"} foi avisado no sininho.`);
      return true;
    } catch (error) {
      setModalError(error instanceof Error ? error.message : "Não foi possível enviar a resposta.");
      return false;
    } finally {
      setBusyAction(null);
    }
  }

  const overline = [activeCondominium?.condominiumName, isLoading ? null : `${occurrences.length} ${occurrences.length === 1 ? "ocorrência" : "ocorrências"}`]
    .filter(Boolean)
    .join(" · ");
  const tabs = [
    { value: null, label: "Todas", count: scoped.length },
    ...occurrenceStatuses.map((item) => ({ value: item.value, label: item.plural, count: countBy(item.value, scoped) })),
  ];
  const summary = isLoading ? "–" : null;

  return (
    <>
      <PageHeader overline={overline || undefined} title="Ocorrências" />

      {condominiums.length > 1 && (
        <SelectField
          label="Condomínio"
          className="mb-6 lg:hidden"
          value={String(activeCondominiumId ?? "")}
          options={condominiums.map((item) => ({ value: String(item.condominiumId), label: item.condominiumName }))}
          onChange={(event) => setActiveCondominiumId(Number(event.target.value))}
        />
      )}

      {!isLoading && loaded.errorMessage && (
        <p role="alert" className="mb-6 rounded-field bg-vermelho-suave px-4 py-3 text-sm font-medium text-vermelho">
          {loaded.errorMessage}
        </p>
      )}
      {successMessage && (
        <p role="status" className="mb-6 rounded-field bg-verde-suave px-4 py-3 text-sm font-medium text-verde-tinta">
          {successMessage}
        </p>
      )}

      <div className="mb-6">
        <SummaryCard
          label="Resumo das ocorrências"
          items={[
            {
              label: "Abertas",
              value: summary ?? String(countBy(OCCURRENCE_STATUS.open)),
              detail: urgent > 0 ? `${urgent} com prioridade alta ou urgente` : "Nada urgente em aberto",
              tone: countBy(OCCURRENCE_STATUS.open) > 0 ? "danger" : "neutral",
            },
            { label: "Em andamento", value: summary ?? String(countBy(OCCURRENCE_STATUS.inProgress)), detail: "A gestão já está cuidando" },
            {
              label: "Sem resposta",
              value: summary ?? String(unanswered),
              detail: "Abertas ou em andamento sem retorno",
              tone: unanswered > 0 ? "danger" : "neutral",
            },
            { label: "Resolvidas", value: summary ?? String(countBy(OCCURRENCE_STATUS.resolved)), tone: "good" },
          ]}
        />
      </div>

      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] lg:mx-0 lg:px-0">
          <div role="group" aria-label="Filtrar por situação" className="inline-flex gap-1 rounded-block bg-menu p-1">
            {tabs.map((tab) => {
              const isActive = filters.status === tab.value;
              return (
                <button
                  key={tab.label}
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => updateFilters({ status: tab.value })}
                  className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-field px-3.5 py-2 text-sm font-semibold transition-colors ${
                    isActive ? "bg-superficie text-tinta shadow-whisper" : "text-tinta-suave hover:text-tinta"
                  }`}
                >
                  {tab.label}
                  <span className={`text-xs tabular-nums ${isActive ? "text-tinta-suave" : "text-tinta-suave/80"}`}>{isLoading ? "" : tab.count}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          {showBuilding && (
            <label className="relative sm:w-48">
              <span className="sr-only">Prédio</span>
              <select
                value={filters.buildingId}
                onChange={(event) => updateFilters({ buildingId: event.target.value })}
                className="w-full appearance-none rounded-full bg-superficie py-2.5 pl-4 pr-9 text-sm font-medium text-tinta shadow-whisper outline-none focus:ring-2 focus:ring-verde focus-visible:outline-none"
              >
                <option value="">Todos os prédios</option>
                {buildings.map((building) => (
                  <option key={building.id} value={String(building.id)}>
                    {building.name}
                  </option>
                ))}
              </select>
              <ChevronDown size={16} strokeWidth={1.8} aria-hidden className="pointer-events-none absolute inset-y-0 right-3.5 my-auto text-tinta-suave" />
            </label>
          )}
          <label className="relative lg:w-72">
            <span className="sr-only">Buscar ocorrência</span>
            <Search size={17} strokeWidth={1.8} aria-hidden className="pointer-events-none absolute inset-y-0 left-3.5 my-auto text-tinta-suave" />
            <input
              type="search"
              value={filters.search}
              onChange={(event) => updateFilters({ search: event.target.value })}
              placeholder="Título, morador ou unidade"
              className="w-full rounded-full bg-superficie py-2.5 pl-10 pr-4 text-sm text-tinta shadow-whisper outline-none placeholder:text-tinta-suave/80 focus:ring-2 focus:ring-verde focus-visible:outline-none"
            />
          </label>
        </div>
      </div>

      <ul className="divide-y divide-linha overflow-hidden rounded-card bg-superficie shadow-whisper">
        {visible.length === 0 ? (
          <li className="flex flex-col items-center px-5 py-12 text-center">
            {isLoading ? (
              <span className="flex items-center gap-2 text-sm text-tinta-suave">
                <MoraeMark size={18} motion="respiro" />
                Carregando ocorrências…
              </span>
            ) : loaded.errorMessage ? (
              <span className="text-sm text-tinta-suave">Não foi possível mostrar as ocorrências agora.</span>
            ) : (
              <>
                <span className="grid size-12 place-items-center rounded-block bg-verde-suave text-verde-tinta">
                  <TriangleAlert size={22} strokeWidth={1.8} aria-hidden />
                </span>
                <span className="mt-4 font-display text-lg font-bold text-tinta">
                  {hasFilters || filters.status ? "Nenhuma ocorrência com esses filtros" : "Nenhuma ocorrência registrada"}
                </span>
                <span className="mt-1 max-w-sm text-sm text-tinta-suave">
                  {hasFilters || filters.status
                    ? "Tente outra situação, outro prédio ou limpe a busca."
                    : "Quando um morador relatar um problema pelo app, ele aparece aqui com as fotos que enviou."}
                </span>
                {hasFilters && (
                  <button type="button" onClick={() => updateFilters({ buildingId: "", search: "" })} className="mt-4 text-sm font-semibold text-tinta hover:underline">
                    Limpar filtros
                  </button>
                )}
              </>
            )}
          </li>
        ) : (
          visible.map((occurrence) => {
            const priority = priorityMeta(occurrence.priority);
            const isUrgent = isPending(occurrence) && occurrence.priority >= 3;
            return (
              <li key={occurrence.id}>
                <button
                  type="button"
                  onClick={() => openDetails(occurrence.id)}
                  className="flex w-full items-start gap-3.5 px-4 py-3.5 text-left transition-colors hover:bg-campo/60 sm:items-center sm:px-5"
                >
                  <span
                    aria-hidden
                    className={`mt-1.5 size-2.5 shrink-0 rounded-full sm:mt-0 ${
                      occurrence.status === OCCURRENCE_STATUS.open ? "bg-vermelho" : occurrence.status === OCCURRENCE_STATUS.inProgress ? "bg-ambar" : "bg-linha"
                    }`}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate text-[15px] font-semibold text-tinta">{occurrence.title}</span>
                      {isUrgent && <span className={`shrink-0 text-xs font-semibold ${priority.tone}`}>{priority.label}</span>}
                    </span>
                    <span className="block truncate text-[13px] tabular-nums text-tinta-suave">
                      {formatPlace(occurrence, showBuilding)} · {occurrence.createdByName} · {typeLabel(occurrence.type)} · {formatDate(occurrence.createdAt)}
                    </span>
                    <span className="mt-1.5 flex items-center gap-3 text-xs text-tinta-suave sm:hidden">
                      <StatusChip status={occurrence.status} />
                      {occurrence.photos.length > 0 && (
                        <span className="flex items-center gap-1">
                          <Camera size={14} strokeWidth={1.8} aria-hidden />
                          {occurrence.photos.length}
                        </span>
                      )}
                      {occurrence.managementResponse && <span className="font-medium text-verde-tinta">Respondida</span>}
                    </span>
                  </span>
                  <span className="hidden shrink-0 items-center gap-3 text-xs text-tinta-suave sm:flex">
                    {occurrence.photos.length > 0 && (
                      <span className="flex items-center gap-1" title={`${occurrence.photos.length} foto(s)`}>
                        <Camera size={15} strokeWidth={1.8} aria-label="Fotos" />
                        <span className="tabular-nums">{occurrence.photos.length}</span>
                      </span>
                    )}
                    {occurrence.managementResponse && <MessageSquareText size={15} strokeWidth={1.8} aria-label="Respondida" className="text-verde-tinta" />}
                    <StatusChip status={occurrence.status} />
                  </span>
                </button>
              </li>
            );
          })
        )}
      </ul>

      {selectedOccurrence && (
        <OccurrenceDetailsModal
          key={selectedOccurrence.id}
          occurrence={selectedOccurrence}
          showBuilding={showBuilding}
          errorMessage={modalError}
          busyAction={busyAction}
          onClose={() => setSelectedId(null)}
          onChangeStatus={(status) => void handleChangeStatus(selectedOccurrence, status)}
          onRespond={(message) => handleRespond(selectedOccurrence, message)}
        />
      )}
    </>
  );
}
