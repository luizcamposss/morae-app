import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Bell, ChevronRight, CircleCheck, DoorOpen, Receipt, TriangleAlert, Vote, Wrench, type LucideIcon } from "lucide-react";
import { useAuth } from "../../app/providers/useAuth";
import { useCondominium } from "../../app/providers/useCondominium";
import { GroupedRow } from "../../shared/components/GroupedList";
import { SelectField } from "../../shared/components/SelectField";
import { SummaryCard } from "../../shared/components/SummaryCard";
import { usePersistentClearedIds } from "../../shared/hooks/usePersistentClearedIds";
import { PageHeader } from "../../shared/layout/PageHeader";
import { formatCurrency } from "../../shared/lib/currency";
import { formatDateTime, formatTodayHeading, getGreeting, todayInputDate } from "../../shared/lib/date";
import { CHARGE_STATUS, buildRevenueByMonth, currentMonthName } from "../charges/platformRevenue";
import { SetupBanner } from "../adminSetup/SetupBanner";
import { UnitBillingGrid } from "../billingGrid/UnitBillingGrid";
import { RevenueChart } from "../masterDashboard/MasterCharts";
import { buildActivities, buildLateUnits, buildTodayItems, emptyDashboard, fetchDashboard, type DashboardData, type TodayItem } from "./dashboardData";

const CHART_MONTHS = 6;

const todayIcons: Array<[string, LucideIcon]> = [
  ["overdue", Receipt],
  ["maintenance", Wrench],
  ["occurrences", TriangleAlert],
  ["assembly", Vote],
  ["visits", DoorOpen],
  ["reminders", Bell],
];

const chipTones = {
  success: "bg-verde-suave text-verde-tinta",
  warning: "bg-ambar-suave text-ambar",
  danger: "bg-vermelho-suave text-vermelho",
  neutral: "bg-campo text-tinta-suave",
};

// Admin home: the month in numbers, what needs attention today, units up to date,
// received × overdue by month, buildings and the latest movements.
export function AdminDashboardPage() {
  const { user } = useAuth();
  const { condominiums, activeCondominium, activeCondominiumId, setActiveCondominiumId } = useCondominium();
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardData | null>(null);
  const [temperature, setTemperature] = useState<number | null>(null);

  useEffect(() => {
    if (!activeCondominiumId) return;
    let isMounted = true;

    fetchDashboard(activeCondominiumId)
      .then((result) => isMounted && setData(result))
      .catch(
        (error) =>
          isMounted && setData(emptyDashboard(activeCondominiumId, error instanceof Error ? error.message : "Não foi possível carregar o painel.")),
      );

    return () => {
      isMounted = false;
    };
  }, [activeCondominiumId]);

  // Current temperature for the header (only when the browser shares the location).
  useEffect(() => {
    let isMounted = true;
    if (!("geolocation" in navigator)) return;

    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const response = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${coords.latitude}&longitude=${coords.longitude}&current=temperature_2m`,
          );
          if (!response.ok) return;
          const body = (await response.json()) as { current?: { temperature_2m?: number } };
          if (isMounted && typeof body.current?.temperature_2m === "number") setTemperature(Math.round(body.current.temperature_2m));
        } catch {
          // The header simply shows no temperature.
        }
      },
      () => undefined,
      { maximumAge: 15 * 60 * 1000, timeout: 5000 },
    );

    return () => {
      isMounted = false;
    };
  }, []);

  const isLoading = !data || data.condominiumId !== activeCondominiumId;
  const dashboard = isLoading ? emptyDashboard(activeCondominiumId ?? 0) : data;

  const summary = useMemo(() => {
    const month = todayInputDate().slice(0, 7);
    const { charges } = dashboard;
    const sumOf = (status: number, pick: (value: (typeof charges)[number]) => number = (charge) => charge.value) =>
      charges.filter((charge) => charge.status === status).reduce((total, charge) => total + pick(charge), 0);
    const overdue = charges.filter((charge) => charge.status === CHARGE_STATUS.overdue);

    return {
      received: charges
        .filter((charge) => charge.status === CHARGE_STATUS.paid && charge.dueDate.startsWith(month))
        .reduce((total, charge) => total + charge.value, 0),
      toReceive: sumOf(CHARGE_STATUS.pending),
      pendingCount: charges.filter((charge) => charge.status === CHARGE_STATUS.pending).length,
      overdue: sumOf(CHARGE_STATUS.overdue, (charge) => charge.updatedAmount || charge.value),
      lateFees: overdue.reduce((total, charge) => total + charge.fineAmount + charge.interestAmount, 0),
    };
  }, [dashboard]);

  const todayItems = useMemo(() => buildTodayItems(dashboard), [dashboard]);
  const lateUnits = useMemo(() => buildLateUnits(dashboard), [dashboard]);
  const revenueByMonth = useMemo(() => buildRevenueByMonth(dashboard.charges, CHART_MONTHS), [dashboard]);
  const hasRevenue = revenueByMonth.some((month) => month.paid + month.open + month.overdue > 0);
  const activities = useMemo(() => buildActivities(dashboard), [dashboard]);
  const [clearedActivityIds, setClearedActivityIds] = usePersistentClearedIds(
    `morae:admin-dashboard:${user?.userId ?? "anonymous"}:${activeCondominiumId ?? "none"}:cleared-activities`,
  );
  const visibleActivities = activities.filter((activity) => !clearedActivityIds.has(activity.id));

  const totalUnits = dashboard.units.length;
  const firstName = (user?.personName || user?.userName || "").trim().split(/\s+/)[0];
  const overline = [formatTodayHeading() + (temperature !== null ? `, ${temperature}°` : ""), activeCondominium?.condominiumName].filter(Boolean).join(" · ");

  return (
    <>
      <PageHeader overline={overline} title={firstName ? `${getGreeting()}, ${firstName}` : getGreeting()} />

      {condominiums.length > 1 && (
        <SelectField
          label="Condomínio"
          className="mb-6 lg:hidden"
          value={String(activeCondominiumId ?? "")}
          options={condominiums.map((item) => ({ value: String(item.condominiumId), label: item.condominiumName }))}
          onChange={(event) => setActiveCondominiumId(Number(event.target.value))}
        />
      )}

      {!isLoading && dashboard.errorMessage && (
        <p role="alert" className="mb-6 rounded-field bg-vermelho-suave px-4 py-3 text-sm font-medium text-vermelho">
          {dashboard.errorMessage}
        </p>
      )}

      {!activeCondominiumId ? (
        <p className="rounded-field bg-ambar-suave px-4 py-3 text-sm font-medium text-tinta">Nenhum condomínio ativo vinculado ao seu usuário.</p>
      ) : (
        <>
          {!isLoading && !dashboard.errorMessage && <SetupBanner dashboard={dashboard} />}

          <SummaryCard
            label="Resumo do mês"
            items={[
              { label: "Recebido no mês", value: isLoading ? "–" : formatCurrency(summary.received), detail: `vencimentos de ${currentMonthName()}`, tone: "good" },
              { label: "A receber", value: isLoading ? "–" : formatCurrency(summary.toReceive), detail: `${summary.pendingCount} em aberto` },
              {
                label: "Em atraso",
                value: isLoading ? "–" : formatCurrency(summary.overdue),
                detail: summary.overdue > 0 ? (summary.lateFees > 0 ? `com ${formatCurrency(summary.lateFees)} de multa e juros` : "sem multa e juros") : "nenhum atraso",
                tone: summary.overdue > 0 ? "danger" : "neutral",
              },
            ]}
          />

          <div className="mt-10 grid gap-x-6 gap-y-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,360px)]">
            <Section title="Hoje" note="o que pede atenção">
              {isLoading ? (
                <EmptyRow text="Carregando…" />
              ) : todayItems.length === 0 ? (
                <GroupedRow icon={CircleCheck} tone="green" title="Tudo em ordem" subtitle="Sem manutenções vencendo, ocorrências abertas ou visitas hoje." />
              ) : (
                todayItems.map((item) => <TodayRow key={item.key} item={item} onOpen={(to) => navigate(to)} />)
              )}
            </Section>

            <Section
              title="Unidades em atraso"
              note={isLoading || !lateUnits.length ? undefined : `${lateUnits.length} de ${totalUnits}`}
              footer={lateUnits.length > 0 && <SectionLink to="/admin/payments">Ver cobranças atrasadas</SectionLink>}
            >
              {isLoading ? (
                <EmptyRow text="Carregando…" />
              ) : lateUnits.length === 0 ? (
                <GroupedRow icon={CircleCheck} tone="green" title="Nenhuma unidade com atraso" subtitle={`${totalUnits} ${totalUnits === 1 ? "unidade em dia" : "unidades em dia"}`} />
              ) : (
                lateUnits.slice(0, 4).map((unit) => (
                  <Row
                    key={unit.unitId}
                    title={unit.label}
                    subtitle={unit.person || `${unit.count} ${unit.count === 1 ? "cobrança" : "cobranças"}`}
                    trailing={<span className="text-sm font-semibold tabular-nums text-vermelho">{formatCurrency(unit.total)}</span>}
                  />
                ))
              )}
            </Section>
          </div>

          <div className="mt-10">
            <UnitBillingGrid units={dashboard.units} charges={dashboard.charges} paymentsPath="/admin/payments" isLoading={isLoading} />
          </div>

          <section className="relative mt-10 overflow-hidden rounded-card bg-superficie p-6 shadow-whisper">
            <h2 className="font-display text-[19px] font-bold tracking-[-0.01em] text-tinta">Receita por mês</h2>
            <p className="mb-5 text-[13px] text-tinta-suave">recebido, em aberto e atrasado, por vencimento até o próximo mês</p>
            {hasRevenue ? (
              <RevenueChart data={revenueByMonth} caption="Cobranças do condomínio por mês de vencimento" />
            ) : (
              <p className="grid h-40 place-items-center text-center text-sm text-tinta-suave">
                {isLoading ? "Carregando…" : "Quando houver cobranças, a evolução aparece aqui."}
              </p>
            )}
          </section>

          <div className="mt-10 grid gap-x-6 gap-y-10 lg:grid-cols-2">
            <Section title="Prédios" note="ocupação" footer={dashboard.buildings.length > 0 && <SectionLink to="/admin/buildings">Ver prédios</SectionLink>}>
              {dashboard.buildings.length === 0 ? (
                <EmptyRow text={isLoading ? "Carregando…" : "Nenhum prédio cadastrado."} />
              ) : (
                dashboard.buildings.slice(0, 5).map((building) => {
                  const percent = building.unitCount ? Math.round((building.occupiedUnitCount / building.unitCount) * 100) : 0;
                  return (
                    <li key={building.id} className="px-5 py-3.5">
                      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                        <span className="min-w-0 truncate text-[15px] font-semibold text-tinta">{building.name}</span>
                        <span className="text-[13px] tabular-nums text-tinta-suave">
                          {building.occupiedUnitCount} de {building.unitCount} ocupadas · {building.residentCount} moradores
                        </span>
                      </div>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-campo" aria-hidden>
                        <div className="h-full rounded-full bg-verde" style={{ width: `${percent}%` }} />
                      </div>
                    </li>
                  );
                })
              )}
            </Section>

            <Section
              title="Atividades recentes"
              footer={
                visibleActivities.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setClearedActivityIds(new Set(activities.map((activity) => activity.id)))}
                    className="text-sm font-semibold text-tinta-suave hover:text-tinta"
                  >
                    Limpar atividades
                  </button>
                )
              }
            >
              {visibleActivities.length === 0 ? (
                <EmptyRow text={isLoading ? "Carregando…" : activities.length ? "Atividades limpas. As novas aparecem aqui." : "Nenhuma atividade ainda."} />
              ) : (
                visibleActivities.slice(0, 6).map((activity) => (
                  <Row
                    key={activity.id}
                    title={activity.title}
                    subtitle={`${activity.description} · ${formatDateTime(activity.date)}`}
                    trailing={<span className={`shrink-0 rounded-chip px-2 py-0.5 text-xs font-semibold ${chipTones[activity.tone]}`}>{activity.badge}</span>}
                  />
                ))
              )}
            </Section>
          </div>
        </>
      )}
    </>
  );
}

function TodayRow({ item, onOpen }: { item: TodayItem; onOpen: (to: string) => void }) {
  const icon = todayIcons.find(([prefix]) => item.key.startsWith(prefix))?.[1] ?? CircleCheck;
  return <GroupedRow icon={icon} tone={item.tone} title={item.title} subtitle={item.subtitle} onClick={item.to ? () => onOpen(item.to!) : undefined} />;
}

function Section({ title, note, footer, children }: { title: string; note?: string; footer?: ReactNode; children: ReactNode }) {
  return (
    <section className="min-w-0">
      <h2 className="mb-3 font-display text-[21px] font-bold tracking-[-0.01em] text-tinta">
        {title}
        {note && <span className="ml-2 font-sans text-[13px] font-normal tracking-normal text-tinta-suave">{note}</span>}
      </h2>
      <ul className="divide-y divide-linha overflow-hidden rounded-card bg-superficie shadow-whisper">{children}</ul>
      {footer && <div className="mt-3">{footer}</div>}
    </section>
  );
}

function Row({ title, subtitle, trailing }: { title: string; subtitle: string; trailing: ReactNode }) {
  return (
    <li className="flex items-center justify-between gap-4 px-5 py-3.5">
      <span className="min-w-0">
        <span className="block truncate text-[15px] font-semibold text-tinta">{title}</span>
        <span className="block truncate text-[13px] text-tinta-suave">{subtitle}</span>
      </span>
      {trailing}
    </li>
  );
}

function EmptyRow({ text }: { text: string }) {
  return <li className="px-5 py-6 text-center text-sm text-tinta-suave">{text}</li>;
}

function SectionLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link to={to} className="inline-flex items-center gap-1 text-sm font-semibold text-verde hover:text-verde-forte">
      {children}
      <ChevronRight size={16} strokeWidth={2} aria-hidden />
    </Link>
  );
}
