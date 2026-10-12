import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { useAuth } from "../../app/providers/useAuth";
import { SummaryCard } from "../../shared/components/SummaryCard";
import { PageHeader } from "../../shared/layout/PageHeader";
import { formatCurrency } from "../../shared/lib/currency";
import { formatCalendarDate, formatTodayHeading, getGreeting, toAppDateString, todayInputDate } from "../../shared/lib/date";
import { getPlatformCharges } from "../charges/chargeService";
import type { ChargeResponse } from "../charges/types";
import { getCondominiums } from "../condominiums/condominiumService";
import type { CondominiumResponse } from "../condominiums/types";
import { buildRevenueByMonth, currentMonthName, lastMonths } from "../charges/platformRevenue";
import { GrowthChart, RevenueChart, type GrowthMonth } from "./MasterCharts";

const ACTIVE_STATUS = 1;
const CHARGE_STATUS_PENDING = 1;
const CHARGE_STATUS_PAID = 2;
const CHARGE_STATUS_OVERDUE = 3;
const CHART_MONTHS = 6;

export function MasterDashboardPage() {
  const { user } = useAuth();
  const [condominiums, setCondominiums] = useState<CondominiumResponse[]>([]);
  const [charges, setCharges] = useState<ChargeResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    Promise.all([getCondominiums(), getPlatformCharges()])
      .then(([condominiumResult, chargeResult]) => {
        if (!isMounted) return;
        setCondominiums(condominiumResult);
        setCharges(chargeResult);
      })
      .catch((error) => {
        if (isMounted) setErrorMessage(error instanceof Error ? error.message : "Não foi possível carregar o painel.");
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const summary = useMemo(() => {
    const currentMonth = todayInputDate().slice(0, 7);
    const overdue = charges.filter((charge) => charge.status === CHARGE_STATUS_OVERDUE);

    return {
      activeCondominiums: condominiums.filter((condominium) => condominium.status === ACTIVE_STATUS).length,
      monthRevenue: charges
        .filter((charge) => charge.status === CHARGE_STATUS_PAID && charge.dueDate.startsWith(currentMonth))
        .reduce((total, charge) => total + charge.value, 0),
      overdueValue: overdue.reduce((total, charge) => total + charge.value, 0),
      overdueCondominiumIds: new Set(overdue.map((charge) => charge.condominiumId)),
    };
  }, [charges, condominiums]);

  const openCharges = useMemo(
    () =>
      charges
        .filter((charge) => charge.status === CHARGE_STATUS_PENDING || charge.status === CHARGE_STATUS_OVERDUE)
        .sort((a, b) => (b.status === CHARGE_STATUS_OVERDUE ? 1 : 0) - (a.status === CHARGE_STATUS_OVERDUE ? 1 : 0) || a.dueDate.localeCompare(b.dueDate))
        .slice(0, 5),
    [charges],
  );

  const revenueByMonth = useMemo(() => buildRevenueByMonth(charges, CHART_MONTHS), [charges]);

  const growthByMonth = useMemo<GrowthMonth[]>(() => {
    const createdMonths = condominiums.map((condominium) => toAppDateString(condominium.createdAt).slice(0, 7));

    return lastMonths(CHART_MONTHS).map(({ month, label }) => ({
      month,
      label,
      total: createdMonths.filter((created) => created <= month).length,
    }));
  }, [condominiums]);

  const overdueCount = summary.overdueCondominiumIds.size;
  const firstName = (user?.personName ?? "").trim().split(/\s+/)[0];

  return (
    <>
      <PageHeader
        overline={`${formatTodayHeading()} · visão da plataforma`}
        title={firstName ? `${getGreeting()}, ${firstName}` : getGreeting()}
      />

      {errorMessage && (
        <p role="alert" className="mb-6 rounded-field bg-vermelho-suave px-4 py-3 text-sm font-medium text-vermelho">
          {errorMessage}
        </p>
      )}

      <SummaryCard
        items={[
          { label: "Condomínios ativos", value: isLoading ? "–" : String(summary.activeCondominiums), detail: `${condominiums.length} no total` },
          { label: "Pago do mês", value: isLoading ? "–" : formatCurrency(summary.monthRevenue), detail: `mensalidades de ${currentMonthName()}` },
          {
            label: "Mensalidade em atraso",
            value: isLoading ? "–" : formatCurrency(summary.overdueValue),
            detail: overdueCount ? `${overdueCount} condomínio${overdueCount > 1 ? "s" : ""}` : "nenhum condomínio",
            tone: summary.overdueValue > 0 ? "danger" : "neutral",
          },
        ]}
      />

      <div className="mt-10 grid gap-x-6 gap-y-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,360px)]">
        <Section title="Mensalidades" note="próximas e atrasadas" footer={<SectionLink to="/master/payments">Ver a receita</SectionLink>}>
          {openCharges.length === 0 ? (
            <EmptyRow text={isLoading ? "Carregando…" : "Nenhuma mensalidade em aberto."} />
          ) : (
            openCharges.map((charge) => {
              const isOverdue = charge.status === CHARGE_STATUS_OVERDUE;
              return (
                <Row
                  key={charge.id}
                  title={charge.condominiumName}
                  subtitle={`${isOverdue ? "venceu" : "vence"} ${formatCalendarDate(charge.dueDate)}`}
                  trailing={
                    <span className="flex items-center gap-3">
                      <span className="text-sm font-semibold tabular-nums text-tinta">{formatCurrency(charge.value)}</span>
                      <Chip tone={isOverdue ? "danger" : "warning"}>{isOverdue ? "Atrasada" : "Em aberto"}</Chip>
                    </span>
                  }
                />
              );
            })
          )}
        </Section>

        <Section
          title="Condomínios"
          footer={
            condominiums.length > 0 && (
              <SectionLink to="/master/condominiums">
                {condominiums.length === 1 ? "Ver o condomínio" : `Ver os ${condominiums.length} condomínios`}
              </SectionLink>
            )
          }
        >
          {condominiums.length === 0 ? (
            <EmptyRow text={isLoading ? "Carregando…" : "Nenhum condomínio cadastrado."} />
          ) : (
            condominiums.slice(0, 4).map((condominium) => {
              const isInactive = condominium.status !== ACTIVE_STATUS;
              const isLate = summary.overdueCondominiumIds.has(condominium.id);
              return (
                <Row
                  key={condominium.id}
                  title={condominium.name}
                  subtitle={`${condominium.city} · ${condominium.state}`}
                  trailing={
                    <Chip tone={isInactive ? "neutral" : isLate ? "danger" : "success"}>
                      {isInactive ? "Inativo" : isLate ? "Mensalidade atrasada" : "Em dia"}
                    </Chip>
                  }
                />
              );
            })
          )}
        </Section>
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <ChartCard title="Mensalidades" note="por vencimento, até o próximo mês">
          {revenueByMonth.some((month) => month.paid + month.open + month.overdue > 0) ? (
            <RevenueChart data={revenueByMonth} />
          ) : (
            <p className="grid h-56 place-items-center text-center text-sm text-tinta-suave">
              {isLoading ? "Carregando…" : "Nenhuma mensalidade nos últimos meses."}
            </p>
          )}
        </ChartCard>
        <ChartCard title="Condomínios na plataforma" note={`últimos ${CHART_MONTHS} meses`}>
          <GrowthChart data={growthByMonth} />
        </ChartCard>
      </div>
    </>
  );
}

function Section({ title, note, footer, children }: { title: string; note?: string; footer?: ReactNode; children: ReactNode }) {
  return (
    <section>
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
        <span className="block text-[13px] text-tinta-suave">{subtitle}</span>
      </span>
      {trailing}
    </li>
  );
}

function EmptyRow({ text }: { text: string }) {
  return <li className="px-5 py-6 text-center text-sm text-tinta-suave">{text}</li>;
}

const chipTones = {
  success: "bg-verde-suave text-verde-tinta",
  warning: "bg-ambar-suave text-ambar",
  danger: "bg-vermelho-suave text-vermelho",
  neutral: "bg-campo text-tinta-suave",
};

function Chip({ tone, children }: { tone: keyof typeof chipTones; children: ReactNode }) {
  return <span className={`shrink-0 rounded-chip px-2 py-0.5 text-xs font-semibold ${chipTones[tone]}`}>{children}</span>;
}

function SectionLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link to={to} className="inline-flex items-center gap-1 text-sm font-semibold text-verde hover:text-verde-forte">
      {children}
      <ChevronRight size={16} strokeWidth={2} aria-hidden />
    </Link>
  );
}

function ChartCard({ title, note, children }: { title: string; note: string; children: ReactNode }) {
  return (
    <section className="rounded-card bg-superficie p-6 shadow-whisper">
      <h2 className="font-display text-[19px] font-bold tracking-[-0.01em] text-tinta">{title}</h2>
      <p className="mb-5 text-[13px] text-tinta-suave">{note}</p>
      {children}
    </section>
  );
}
