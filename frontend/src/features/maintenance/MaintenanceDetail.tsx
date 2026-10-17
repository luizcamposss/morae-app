import { useEffect, useState } from "react";
import { CalendarCheck, Paperclip, Trash2 } from "lucide-react";
import { Button } from "../../shared/components/Button";
import { capitalizeFirst, formatCalendarDate } from "../../shared/lib/date";
import { dueLabel, formatFileSize, formatPhone, intervalLabel, maintenanceCategories, maintenanceStatuses, scopeLabel } from "./maintenanceMeta";
import { downloadMaintenanceAttachment, getMaintenanceRecords } from "./maintenanceService";
import type { MaintenancePlanResponse, MaintenanceRecordResponse } from "./types";

export function MaintenanceDueChip({ plan }: { plan: MaintenancePlanResponse }) {
  return (
    <span className={`shrink-0 whitespace-nowrap rounded-chip px-2 py-0.5 text-xs font-semibold tabular-nums ${maintenanceStatuses[plan.status].tone}`}>
      {dueLabel(plan)}
    </span>
  );
}

// Category icon tinted by the status (list rows and the detail header).
export function MaintenanceTile({ plan, size = "md" }: { plan: MaintenancePlanResponse; size?: "md" | "lg" }) {
  const { icon: Icon } = maintenanceCategories[plan.category] ?? maintenanceCategories[9];
  return (
    <span
      aria-hidden
      className={`grid shrink-0 place-items-center ${size === "lg" ? "size-11 rounded-block" : "size-10 rounded-field"} ${maintenanceStatuses[plan.status].tone}`}
    >
      <Icon size={size === "lg" ? 20 : 18} strokeWidth={1.8} />
    </span>
  );
}

type MaintenanceDetailProps = {
  plan: MaintenancePlanResponse;
  // Bumped by the page after a new execution, so the history reloads.
  recordsVersion: number;
  // In the mobile modal the title already shows above.
  showHeader?: boolean;
  onRegister: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onDeleteRecord: (record: MaintenanceRecordResponse, isLatest: boolean) => void;
};

export function MaintenanceDetail({ plan, recordsVersion, showHeader = true, onRegister, onEdit, onDelete, onDeleteRecord }: MaintenanceDetailProps) {
  const [records, setRecords] = useState<MaintenanceRecordResponse[] | null>(null);
  const [recordsError, setRecordsError] = useState("");
  const [downloadError, setDownloadError] = useState("");
  const category = maintenanceCategories[plan.category] ?? maintenanceCategories[9];

  useEffect(() => {
    let isMounted = true;

    getMaintenanceRecords(plan.id)
      .then((result) => {
        if (!isMounted) return;
        setRecords(result);
        setRecordsError("");
      })
      .catch((error) => isMounted && setRecordsError(error instanceof Error ? error.message : "Não foi possível carregar o histórico."));

    return () => {
      isMounted = false;
    };
  }, [plan.id, recordsVersion]);

  async function download(record: MaintenanceRecordResponse) {
    setDownloadError("");
    try {
      await downloadMaintenanceAttachment(record);
    } catch (error) {
      setDownloadError(error instanceof Error ? error.message : "Não foi possível baixar o anexo.");
    }
  }

  const facts = [
    { label: "Próxima data", value: formatCalendarDate(plan.nextDueDate) },
    { label: "Frequência", value: capitalizeFirst(intervalLabel(plan.intervalMonths)) },
    { label: "Última execução", value: plan.lastPerformedOn ? formatCalendarDate(plan.lastPerformedOn) : "Nenhuma registrada" },
    { label: "Empresa", value: plan.providerName ?? "Não informada" },
    ...(plan.providerPhone ? [{ label: "Telefone", value: formatPhone(plan.providerPhone), href: `tel:+55${plan.providerPhone}` }] : []),
    { label: "Lembretes", value: "30 e 7 dias antes" },
  ];

  return (
    <div className="flex flex-col">
      {showHeader && (
        <header>
          <MaintenanceDueChip plan={plan} />
          <h2 className="mt-3 font-display text-[24px] font-bold leading-tight tracking-[-0.01em] text-tinta [text-wrap:balance]">{plan.name}</h2>
          <p className="mt-1 text-sm text-tinta-suave">
            {category.label} · {scopeLabel(plan)}
          </p>
        </header>
      )}

      <dl className={`divide-y divide-linha rounded-block bg-campo ${showHeader ? "mt-5" : ""}`}>
        {facts.map((fact) => (
          <div key={fact.label} className="flex items-baseline justify-between gap-4 px-4 py-2.5 text-[13px]">
            <dt className="text-tinta-suave">{fact.label}</dt>
            <dd className="text-right font-semibold tabular-nums text-tinta">
              {"href" in fact && fact.href ? (
                <a href={fact.href} className="underline decoration-linha underline-offset-4 hover:decoration-tinta">
                  {fact.value}
                </a>
              ) : (
                fact.value
              )}
            </dd>
          </div>
        ))}
      </dl>

      {plan.notes && <p className="mt-4 whitespace-pre-line text-[13px] leading-relaxed text-tinta-suave">{plan.notes}</p>}

      <Button className="mt-5" fullWidth onClick={onRegister}>
        <CalendarCheck size={18} strokeWidth={1.8} aria-hidden />
        Registrar execução
      </Button>

      <section aria-labelledby={`history-${plan.id}`} className="mt-7">
        <h3 id={`history-${plan.id}`} className="font-display text-[17px] font-bold tracking-[-0.01em] text-tinta">
          Histórico
        </h3>

        {downloadError && (
          <p role="alert" className="mt-3 rounded-field bg-vermelho-suave px-3 py-2 text-[13px] font-medium text-vermelho">
            {downloadError}
          </p>
        )}

        {recordsError ? (
          <p role="alert" className="mt-3 text-[13px] font-medium text-vermelho">
            {recordsError}
          </p>
        ) : records === null ? (
          <p className="mt-3 text-[13px] text-tinta-suave">Carregando…</p>
        ) : records.length === 0 ? (
          <p className="mt-2 text-[13px] leading-relaxed text-tinta-suave">
            Nenhuma execução registrada. Ao registrar, a próxima data é calculada a partir do dia em que foi feita.
          </p>
        ) : (
          <ol className="mt-2 divide-y divide-linha">
            {records.map((record, index) => (
              <li key={record.id} className="flex items-start gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold tabular-nums text-tinta">Feita em {formatCalendarDate(record.performedOn)}</p>
                  <p className="mt-0.5 text-[13px] text-tinta-suave">
                    {record.providerName ? `${record.providerName} · ` : ""}registrado por {record.registeredByName}
                  </p>
                  {record.notes && <p className="mt-1 whitespace-pre-line text-[13px] leading-relaxed text-tinta">{record.notes}</p>}
                  {record.hasAttachment && (
                    <button
                      type="button"
                      onClick={() => void download(record)}
                      className="mt-1.5 inline-flex max-w-full items-center gap-1.5 rounded-chip text-[13px] font-semibold text-tinta underline decoration-linha underline-offset-4 hover:decoration-tinta"
                    >
                      <Paperclip size={14} strokeWidth={1.8} aria-hidden className="shrink-0" />
                      <span className="truncate">{record.attachmentFileName ?? "Anexo"}</span>
                      {record.attachmentSizeBytes ? (
                        <span className="shrink-0 font-normal text-tinta-suave no-underline">{formatFileSize(record.attachmentSizeBytes)}</span>
                      ) : null}
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => onDeleteRecord(record, index === 0)}
                  aria-label={`Apagar o registro de ${formatCalendarDate(record.performedOn)}`}
                  className="grid size-8 shrink-0 place-items-center rounded-full text-tinta-suave transition-colors hover:bg-vermelho-suave hover:text-vermelho"
                >
                  <Trash2 size={16} strokeWidth={1.8} aria-hidden />
                </button>
              </li>
            ))}
          </ol>
        )}
      </section>

      <div className="mt-6 flex items-center justify-between gap-3 border-t border-linha pt-4">
        <button type="button" onClick={onDelete} className="rounded-full px-1 text-sm font-semibold text-vermelho hover:underline">
          Apagar manutenção
        </button>
        <Button variant="quiet" size="sm" onClick={onEdit}>
          Editar
        </Button>
      </div>
    </div>
  );
}

