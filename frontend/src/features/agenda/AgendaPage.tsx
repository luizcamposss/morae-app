import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarDays, ChevronLeft, ChevronRight, Wrench } from "lucide-react";
import { useCondominium } from "../../app/providers/useCondominium";
import { Button } from "../../shared/components/Button";
import { SelectField } from "../../shared/components/SelectField";
import { PageHeader } from "../../shared/layout/PageHeader";
import { todayInputDate } from "../../shared/lib/date";
import type { MaintenancePlanResponse } from "../maintenance/types";
import type { OccurrenceResponse } from "../occurrences/types";
import { useIsSyndicArea, useSyndicCan } from "../syndicAccess/useSyndicAccess";
import { addDays, formatDayHeading } from "../visits/visitMeta";
import type { VisitResponse } from "../visits/types";
import {
  WEEKDAY_HEADERS,
  addMonths,
  agendaKinds,
  compareItems,
  daysBetween,
  maintenanceItems,
  nearestDue,
  nearestDueSubtitle,
  nearestDueTitle,
  occurrenceItems,
  rangeOf,
  rangeTitle,
  visitItems,
  type AgendaItem,
  type AgendaKind,
  type AgendaView,
} from "./agendaMeta";
import { loadAgendaSources, loadAgendaVisits } from "./agendaService";

type SourcesState = { key: string; plans: MaintenancePlanResponse[]; occurrences: OccurrenceResponse[]; failed: boolean };
type VisitsState = { key: string; visits: VisitResponse[]; failed: boolean };

const views: Array<{ value: AgendaView; label: string }> = [
  { value: "twoWeeks", label: "2 semanas" },
  { value: "month", label: "Mês" },
];

function AgendaChip({ item, onOpen }: { item: AgendaItem; onOpen: (item: AgendaItem) => void }) {
  const Icon = item.icon;

  return (
    <button
      type="button"
      onClick={() => onOpen(item)}
      title={`${item.time ? `${item.time} · ` : ""}${item.title} · ${item.subtitle}`}
      className={`flex w-full min-w-0 items-center gap-1 rounded-chip px-1.5 py-1 text-left text-xs font-semibold transition-opacity hover:opacity-80 ${item.tone} ${item.muted ? "opacity-70" : ""}`}
    >
      <Icon size={12} strokeWidth={2} aria-hidden className="shrink-0" />
      {item.time && <span className="shrink-0 tabular-nums">{item.time}</span>}
      <span className="min-w-0 truncate">{item.title}</span>
    </button>
  );
}

function AgendaRow({ item, onOpen }: { item: AgendaItem; onOpen: (item: AgendaItem) => void }) {
  const Icon = item.icon;

  return (
    <li>
      <button type="button" onClick={() => onOpen(item)} className="flex w-full items-center gap-3.5 px-5 py-3.5 text-left transition-colors hover:bg-campo/60">
        <span aria-hidden className={`grid size-9 shrink-0 place-items-center rounded-[9px] ${item.tone}`}>
          <Icon size={18} strokeWidth={1.7} />
        </span>
        <span className="min-w-0 flex-1">
          <span className={`block truncate text-[15px] font-semibold ${item.muted ? "text-tinta-suave" : "text-tinta"}`}>{item.title}</span>
          <span className="block truncate text-[13px] text-tinta-suave">{item.subtitle}</span>
        </span>
        <span className="shrink-0 text-[13px] font-semibold tabular-nums text-tinta-suave">{item.time ?? "Dia todo"}</span>
        <ChevronRight size={18} strokeWidth={1.8} aria-hidden className="shrink-0 text-tinta-suave" />
      </button>
    </li>
  );
}

export function AgendaPage() {
  const navigate = useNavigate();
  const { condominiums, activeCondominium, activeCondominiumId, setActiveCondominiumId } = useCondominium();
  const isSyndic = useIsSyndicArea();
  // Outside the syndic area everything is allowed; the syndic sees only the modules he manages.
  const canMaintenance = useSyndicCan("maintenance.manage");
  const canVisit = useSyndicCan("visitors.manage");
  const canOccurrence = useSyndicCan("maintenance");
  const canSee: Record<AgendaKind, boolean> = { maintenance: canMaintenance, visit: canVisit, occurrence: canOccurrence };
  const shownKinds = (Object.keys(agendaKinds) as AgendaKind[]).filter((kind) => canSee[kind]);

  const today = todayInputDate();
  const [view, setView] = useState<AgendaView>("twoWeeks");
  const [anchor, setAnchor] = useState(today);
  const [selectedDay, setSelectedDay] = useState(today);
  const [hiddenKinds, setHiddenKinds] = useState<AgendaKind[]>([]);
  const [sources, setSources] = useState<SourcesState>({ key: "", plans: [], occurrences: [], failed: false });
  const [visitsState, setVisitsState] = useState<VisitsState>({ key: "", visits: [], failed: false });

  const { from, to } = rangeOf(view, anchor);
  const sourcesKey = [activeCondominiumId, canSee.maintenance, canSee.occurrence].join("|");
  const visitsKey = [activeCondominiumId, from, to].join("|");
  const isLoading = sources.key !== sourcesKey || (canSee.visit && visitsState.key !== visitsKey);

  useEffect(() => {
    if (!activeCondominiumId) return;
    let isMounted = true;

    loadAgendaSources(activeCondominiumId, { maintenance: canSee.maintenance, occurrence: canSee.occurrence })
      .then((result) => isMounted && setSources({ key: sourcesKey, ...result }));

    return () => {
      isMounted = false;
    };
    // sourcesKey already sums up every input of this request.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourcesKey]);

  useEffect(() => {
    if (!activeCondominiumId || !canSee.visit) return;
    let isMounted = true;

    loadAgendaVisits(activeCondominiumId, from, to)
      .then((visits) => isMounted && setVisitsState({ key: visitsKey, visits, failed: false }))
      .catch(() => isMounted && setVisitsState({ key: visitsKey, visits: [], failed: true }));

    return () => {
      isMounted = false;
    };
    // visitsKey already sums up every input of this request.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visitsKey, canSee.visit]);

  const showBuilding = new Set(sources.occurrences.map((occurrence) => occurrence.buildingId)).size > 1;
  const itemsByDay = useMemo(() => {
    const all = [
      ...(sources.key === sourcesKey ? maintenanceItems(sources.plans, from, to) : []),
      ...(sources.key === sourcesKey ? occurrenceItems(sources.occurrences, from, to, showBuilding) : []),
      ...(canVisit && visitsState.key === visitsKey ? visitItems(visitsState.visits) : []),
    ].filter((item) => !hiddenKinds.includes(item.kind));

    const map = new Map<string, AgendaItem[]>();
    for (const item of all) map.set(item.date, [...(map.get(item.date) ?? []), item]);
    for (const list of map.values()) list.sort(compareItems);
    return map;
  }, [sources, sourcesKey, visitsState, visitsKey, canVisit, from, to, showBuilding, hiddenKinds]);

  const countByKind = useMemo(() => {
    const counts: Record<AgendaKind, number> = { maintenance: 0, visit: 0, occurrence: 0 };
    for (const list of itemsByDay.values()) for (const item of list) counts[item.kind] += 1;
    return counts;
  }, [itemsByDay]);

  const days = daysBetween(from, to);
  const daysWithItems = days.filter((day) => itemsByDay.has(day) || day === today);
  const highlight = canSee.maintenance ? nearestDue(sources.plans) : null;
  const selectedItems = itemsByDay.get(selectedDay) ?? [];
  const currentMonth = anchor.slice(0, 7);
  const maxChips = view === "twoWeeks" ? 4 : 3;
  const hasError = sources.failed || (canSee.visit && visitsState.failed);
  const basePath = isSyndic ? "/syndic" : "/admin";

  function moveTo(nextAnchor: string, nextView = view) {
    const range = rangeOf(nextView, nextAnchor);
    setView(nextView);
    setAnchor(nextAnchor);
    setSelectedDay(today >= range.from && today <= range.to ? today : nextView === "month" ? `${nextAnchor.slice(0, 7)}-01` : range.from);
  }

  function step(direction: 1 | -1) {
    moveTo(view === "twoWeeks" ? addDays(anchor, 14 * direction) : addMonths(anchor, direction));
  }

  function toggleKind(kind: AgendaKind) {
    setHiddenKinds((current) => (current.includes(kind) ? current.filter((item) => item !== kind) : [...current, kind]));
  }

  function openItem(item: AgendaItem) {
    navigate(`${basePath}/${agendaKinds[item.kind].path}`);
  }

  return (
    <>
      <PageHeader overline={activeCondominium ? `${activeCondominium.condominiumName} · ${shownKinds.map((kind) => agendaKinds[kind].label.toLowerCase()).join(", ")}` : undefined} title="Agenda">
        <div role="group" aria-label="Visão" className="inline-flex rounded-full bg-menu p-1">
          {views.map((item) => (
            <button
              key={item.value}
              type="button"
              aria-pressed={view === item.value}
              onClick={() => moveTo(anchor, item.value)}
              className={`rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors ${
                view === item.value ? "bg-superficie text-tinta shadow-whisper" : "text-tinta-suave hover:text-tinta"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
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

      {hasError && (
        <p role="alert" className="mb-6 rounded-field bg-vermelho-suave px-4 py-3 text-sm font-medium text-vermelho">
          Parte da agenda não carregou. Atualize a página em instantes.
        </p>
      )}

      {highlight && (
        <section className="mb-6 flex flex-col gap-4 rounded-card bg-superficie p-5 shadow-whisper sm:flex-row sm:items-center">
          <span
            aria-hidden
            className={`grid size-11 shrink-0 place-items-center rounded-block ${highlight.plan.daysUntilDue < 0 ? "bg-vermelho-suave text-vermelho" : "bg-ambar-suave text-ambar"}`}
          >
            <Wrench size={20} strokeWidth={1.8} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-display text-[19px] font-bold leading-tight tracking-[-0.01em] text-tinta">{nearestDueTitle(highlight.plan)}</p>
            <p className="mt-1 text-[13px] text-tinta-suave">{nearestDueSubtitle(highlight.plan, highlight.others)}</p>
          </div>
          <Button variant="quiet" size="sm" className="self-start sm:self-center" onClick={() => navigate(`${basePath}/${agendaKinds.maintenance.path}`)}>
            Ver manutenção
          </Button>
        </section>
      )}

      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => step(-1)} aria-label="Período anterior" className="grid size-9 shrink-0 place-items-center rounded-full text-tinta-suave transition-colors hover:bg-superficie hover:text-tinta">
            <ChevronLeft size={18} strokeWidth={1.8} aria-hidden />
          </button>
          <h2 aria-live="polite" className="min-w-0 truncate px-1 font-display text-[21px] font-bold tracking-[-0.01em] text-tinta first-letter:uppercase">
            {rangeTitle(view, anchor)}
          </h2>
          <button type="button" onClick={() => step(1)} aria-label="Próximo período" className="grid size-9 shrink-0 place-items-center rounded-full text-tinta-suave transition-colors hover:bg-superficie hover:text-tinta">
            <ChevronRight size={18} strokeWidth={1.8} aria-hidden />
          </button>
          {(today < from || today > to) && (
            <button type="button" onClick={() => moveTo(today)} className="ml-1 rounded-full px-3 py-1.5 text-sm font-semibold text-tinta transition-colors hover:bg-superficie">
              Hoje
            </button>
          )}
        </div>

        <div role="group" aria-label="Tipos na agenda" className="flex flex-wrap gap-2">
          {shownKinds.map((kind) => {
            const isOn = !hiddenKinds.includes(kind);
            return (
              <button
                key={kind}
                type="button"
                aria-pressed={isOn}
                onClick={() => toggleKind(kind)}
                className={`inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors ${
                  isOn ? "bg-superficie text-tinta shadow-whisper" : "text-tinta-suave hover:bg-superficie/60"
                }`}
              >
                <span aria-hidden className={`size-2 rounded-full ${isOn ? agendaKinds[kind].dot : "bg-linha"}`} />
                {agendaKinds[kind].label}
                {isOn && !isLoading && <span className="tabular-nums text-tinta-suave">{countByKind[kind]}</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Computer: calendar grid + the selected day's list. */}
      <div className="hidden items-start gap-6 lg:grid lg:grid-cols-[minmax(0,1fr)_300px]">
        <div aria-busy={isLoading} className="overflow-hidden rounded-card bg-superficie shadow-whisper">
          <div className="grid grid-cols-7 border-b border-linha">
            {WEEKDAY_HEADERS.map((weekday) => (
              <span key={weekday} className="px-3 py-2.5 text-[13px] font-semibold text-tinta-suave">
                {weekday}
              </span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-px bg-linha">
            {days.map((day) => {
              const items = itemsByDay.get(day) ?? [];
              const isToday = day === today;
              const isSelected = day === selectedDay;
              const isOtherMonth = view === "month" && day.slice(0, 7) !== currentMonth;
              const extra = items.length - maxChips;

              return (
                <div
                  key={day}
                  className={`flex flex-col gap-1 p-1.5 ${view === "twoWeeks" ? "min-h-[136px]" : "min-h-[108px]"} ${isSelected ? "bg-campo" : "bg-superficie"}`}
                >
                  <button
                    type="button"
                    onClick={() => setSelectedDay(day)}
                    aria-pressed={isSelected}
                    aria-label={`${formatDayHeading(day, today)}${items.length ? `, ${items.length} na agenda` : ""}`}
                    className="flex items-center gap-1.5 self-start rounded-full pr-2 text-left"
                  >
                    <span
                      className={`grid size-7 place-items-center rounded-full text-[13px] font-semibold tabular-nums ${
                        isToday ? "bg-tinta text-white" : isOtherMonth ? "text-tinta-suave/60" : "text-tinta hover:bg-campo"
                      }`}
                    >
                      {Number(day.slice(8, 10))}
                    </span>
                    {isToday && <span className="text-xs font-semibold text-tinta">hoje</span>}
                  </button>
                  {items.slice(0, extra > 0 ? maxChips - 1 : maxChips).map((item) => (
                    <AgendaChip key={item.key} item={item} onOpen={openItem} />
                  ))}
                  {extra > 0 && (
                    <button type="button" onClick={() => setSelectedDay(day)} className="self-start rounded-chip px-1.5 py-0.5 text-xs font-semibold text-tinta-suave hover:bg-campo hover:text-tinta">
                      +{extra + 1} mais
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <aside className="rounded-card bg-superficie shadow-whisper">
          <h2 className="px-5 pb-1 pt-5 font-display text-[19px] font-bold tracking-[-0.01em] text-tinta">{formatDayHeading(selectedDay, today)}</h2>
          {selectedItems.length === 0 ? (
            <p className="px-5 pb-6 pt-2 text-sm text-tinta-suave">{isLoading ? "Carregando…" : "Nada na agenda neste dia."}</p>
          ) : (
            <ul className="divide-y divide-linha pb-2">
              {selectedItems.map((item) => (
                <AgendaRow key={item.key} item={item} onOpen={openItem} />
              ))}
            </ul>
          )}
        </aside>
      </div>

      {/* Phone and tablet: list by day, only the days with something (and today). */}
      <div aria-busy={isLoading} className="flex flex-col gap-6 lg:hidden">
        {isLoading && itemsByDay.size === 0 ? (
          <p className="rounded-card bg-superficie px-5 py-12 text-center text-sm text-tinta-suave shadow-whisper">Carregando…</p>
        ) : itemsByDay.size === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-card bg-superficie px-6 py-12 text-center shadow-whisper">
            <span aria-hidden className="grid size-12 place-items-center rounded-block bg-campo text-tinta-suave">
              <CalendarDays size={22} strokeWidth={1.8} />
            </span>
            <p className="text-[15px] font-semibold text-tinta">Nada na agenda neste período.</p>
          </div>
        ) : (
          daysWithItems.map((day) => {
            const items = itemsByDay.get(day) ?? [];
            return (
              <section key={day}>
                <h3 className={`mb-2 flex items-center gap-2 px-1 font-semibold ${day === today ? "text-[15px] text-tinta" : "text-[13px] text-tinta-suave"}`}>
                  {day === today && <span aria-hidden className="size-2 rounded-full bg-tinta" />}
                  {formatDayHeading(day, today)}
                </h3>
                {items.length === 0 ? (
                  <p className="rounded-card bg-superficie px-5 py-4 text-sm text-tinta-suave shadow-whisper">Nada na agenda hoje.</p>
                ) : (
                  <ul className="divide-y divide-linha overflow-hidden rounded-card bg-superficie shadow-whisper">
                    {items.map((item) => (
                      <AgendaRow key={item.key} item={item} onOpen={openItem} />
                    ))}
                  </ul>
                )}
              </section>
            );
          })
        )}
      </div>
    </>
  );
}
