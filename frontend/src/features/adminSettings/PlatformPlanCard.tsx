import { ButtonLink } from "../../shared/components/Button";
import { formatCurrency } from "../../shared/lib/currency";
import { formatCalendarDate } from "../../shared/lib/date";
import { StatusChip } from "../settings/StatusChip";
import { formatDueMonth, type PlatformPlanSummary } from "./platformPlan";

type PlatformPlanCardProps = {
  summary: PlatformPlanSummary | null;
  errorMessage: string;
  condominiumName: string;
};

const valueTones = { neutral: "text-tinta", good: "text-verde", danger: "text-vermelho" };

// The condominium's MORAÊ monthly fee: what is due now and the last paid months.
export function PlatformPlanCard({ summary, errorMessage, condominiumName }: PlatformPlanCardProps) {
  const headline = describeHeadline(summary, errorMessage, condominiumName);
  const recentPaid = summary && summary.state !== "empty" ? summary.recentPaid : [];
  const hasOpenCharge = summary?.state === "pending" || summary?.state === "overdue";

  return (
    <section aria-labelledby="platform-plan-title">
      <h2 id="platform-plan-title" className="mb-2 px-1 text-[13px] font-semibold text-tinta-suave">
        Plano Moraê
      </h2>
      <div className="rounded-card bg-superficie p-6 shadow-whisper">
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm text-tinta-suave">Mensalidade do Moraê</p>
          {summary?.state === "overdue" && <StatusChip tone="danger">{summary.overdueCount > 1 ? `${summary.overdueCount} atrasadas` : "Atrasada"}</StatusChip>}
          {summary?.state === "upToDate" && <StatusChip tone="success">Em dia</StatusChip>}
        </div>
        <p className={`mt-2 font-display text-[30px] font-bold leading-none tracking-[-0.015em] tabular-nums ${valueTones[headline.tone]}`}>
          {headline.value}
        </p>
        <p className="mt-2 text-[13px] text-tinta-suave">{headline.detail}</p>
        <ButtonLink to="/admin/finance/accounts?view=platform" variant={hasOpenCharge ? "accent" : "quiet"} fullWidth={hasOpenCharge} size={hasOpenCharge ? "md" : "sm"} className="mt-5">
          {hasOpenCharge ? "Pagar agora" : "Ver mensalidades"}
        </ButtonLink>
      </div>

      {recentPaid.length > 0 && (
        <ul aria-label="Últimas mensalidades pagas" className="mt-3 divide-y divide-linha rounded-card bg-superficie px-6 py-1 shadow-whisper">
          {recentPaid.map((charge) => (
            <li key={charge.id} className="flex items-center justify-between gap-3 py-3 text-sm">
              <span className="font-semibold text-tinta">{formatDueMonth(charge.dueDate)}</span>
              <span className="flex items-center gap-3 text-tinta-suave tabular-nums">
                {formatCurrency(charge.value)}
                <StatusChip tone="success">Paga</StatusChip>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function describeHeadline(summary: PlatformPlanSummary | null, errorMessage: string, condominiumName: string) {
  if (errorMessage) return { value: "Indisponível", detail: errorMessage, tone: "neutral" as const };
  if (!summary) return { value: "Carregando…", detail: "Buscando as mensalidades do condomínio.", tone: "neutral" as const };

  switch (summary.state) {
    case "overdue":
      return {
        value: formatCurrency(summary.overdueTotal),
        detail: `Em atraso desde ${formatCalendarDate(summary.next.dueDate)} · ${condominiumName}`,
        tone: "danger" as const,
      };
    case "pending":
      return {
        value: formatCurrency(summary.next.value),
        detail: `Vence em ${formatCalendarDate(summary.next.dueDate)} · ${condominiumName}`,
        tone: "neutral" as const,
      };
    case "upToDate":
      return { value: "Tudo pago", detail: "Nenhuma mensalidade em aberto.", tone: "good" as const };
    default:
      return { value: "Sem mensalidades", detail: "O Moraê ainda não lançou mensalidades para este condomínio.", tone: "neutral" as const };
  }
}
