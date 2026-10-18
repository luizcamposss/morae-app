import { useId, useState, type DragEvent } from "react";
import { AlertCircle, CheckCircle2, Download, FileSpreadsheet, FileUp, RotateCcw } from "lucide-react";
import { useCondominium } from "../../app/providers/useCondominium";
import { Button, ButtonLink } from "../../shared/components/Button";
import { SelectField } from "../../shared/components/SelectField";
import { SummaryCard } from "../../shared/components/SummaryCard";
import { PageHeader } from "../../shared/layout/PageHeader";
import { formatCurrency } from "../../shared/lib/currency";
import { formatCalendarDate } from "../../shared/lib/date";
import { HouseLights } from "./HouseLights";
import { confirmImport, downloadImportTemplate, previewImport } from "./importService";
import type { ImportAction, ImportPreview, ImportResult, ImportRow, ImportSummary } from "./types";

type Step =
  | { name: "upload" }
  | { name: "reading"; file: File }
  | { name: "preview"; file: File; preview: ImportPreview }
  | { name: "saving"; file: File; preview: ImportPreview }
  | { name: "done"; result: ImportResult };

type GroupKey = "errors" | "units" | "persons" | "links" | "charges";

type ListItem = { key: string; line: number; title: string; detail: string; action: ImportAction | null; errors?: string[] };

const MAX_FILE_BYTES = 2 * 1024 * 1024;
const ACCEPT = ".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

const columns = [
  { name: "Prédio", note: "nome ou código; cria se não existir", required: true },
  { name: "Unidade", note: "número", required: true },
  { name: "Tipo da unidade", note: "Apartamento, Casa, Loja…" },
  { name: "Quartos · Banheiros · Metragem" },
  { name: "Nome · CPF · Telefone", note: "do morador" },
  { name: "Vínculo", note: "Proprietário, Morador ou Inquilino" },
  { name: "Valor · Vencimento · Descrição", note: "cobrança em aberto" },
];

// Admin: spreadsheet import of units, residents, unit links and open charges.
// Upload → preview with errors per row (nothing saved) → confirm (all or nothing) → report.
export function ImportPage() {
  const { condominiums, activeCondominium, activeCondominiumId, setActiveCondominiumId } = useCondominium();
  const [step, setStep] = useState<Step>({ name: "upload" });
  const [errorMessage, setErrorMessage] = useState("");
  const [downloading, setDownloading] = useState<"csv" | "xlsx" | null>(null);

  async function handleTemplate(format: "csv" | "xlsx") {
    if (!activeCondominiumId) return;
    setErrorMessage("");
    setDownloading(format);
    try {
      await downloadImportTemplate(activeCondominiumId, format);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Não foi possível baixar o modelo.");
    } finally {
      setDownloading(null);
    }
  }

  async function handleFile(file: File) {
    if (!activeCondominiumId) return;
    setErrorMessage("");

    const extension = file.name.split(".").pop()?.toLowerCase();
    if (extension !== "csv" && extension !== "xlsx") {
      setErrorMessage("Envie uma planilha CSV ou Excel (.xlsx).");
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setErrorMessage("A planilha passa de 2 MB. Divida o arquivo e envie em partes.");
      return;
    }

    setStep({ name: "reading", file });
    try {
      const preview = await previewImport(activeCondominiumId, file);
      setStep({ name: "preview", file, preview });
    } catch (error) {
      setStep({ name: "upload" });
      setErrorMessage(error instanceof Error ? error.message : "Não foi possível ler a planilha.");
    }
  }

  async function handleConfirm() {
    if (!activeCondominiumId || step.name !== "preview") return;
    setErrorMessage("");
    setStep({ name: "saving", file: step.file, preview: step.preview });
    try {
      const result = await confirmImport(activeCondominiumId, step.file);
      setStep({ name: "done", result });
    } catch (error) {
      setStep({ name: "preview", file: step.file, preview: step.preview });
      setErrorMessage(error instanceof Error ? error.message : "Não foi possível importar a planilha.");
    }
  }

  function restart() {
    setErrorMessage("");
    setStep({ name: "upload" });
  }

  return (
    <>
      <PageHeader overline={activeCondominium?.condominiumName} title="Importar planilha">
        <Button
          variant="quiet"
          size="sm"
          onClick={() => void handleTemplate("xlsx")}
          isLoading={downloading === "xlsx"} loadingText="Baixando…"
          disabled={!activeCondominiumId || downloading !== null}
          className="max-sm:hidden"
        >
          <Download size={16} strokeWidth={2} aria-hidden />
          Modelo Excel
        </Button>
        <Button
          variant="quiet"
          size="sm"
          onClick={() => void handleTemplate("csv")}
          isLoading={downloading === "csv"} loadingText="Baixando…"
          disabled={!activeCondominiumId || downloading !== null}
          className="max-sm:hidden"
        >
          <Download size={16} strokeWidth={2} aria-hidden />
          Modelo CSV
        </Button>
      </PageHeader>

      {condominiums.length > 1 && step.name === "upload" && (
        <SelectField
          label="Condomínio"
          className="mb-6 lg:hidden"
          value={String(activeCondominiumId ?? "")}
          options={condominiums.map((item) => ({ value: String(item.condominiumId), label: item.condominiumName }))}
          onChange={(event) => setActiveCondominiumId(Number(event.target.value))}
        />
      )}

      {errorMessage && (
        <p role="alert" className="mb-6 rounded-field bg-vermelho-suave px-4 py-3 text-sm font-medium text-vermelho">
          {errorMessage}
        </p>
      )}

      {step.name === "upload" && (
        <UploadStep
          disabled={!activeCondominiumId}
          downloading={downloading}
          onFile={(file) => void handleFile(file)}
          onTemplate={(format) => void handleTemplate(format)}
        />
      )}

      {(step.name === "reading" || step.name === "saving") && (
        <ProcessingPanel
          title={step.name === "reading" ? "Lendo a planilha…" : "Acendendo a casa…"}
          detail={step.name === "reading" ? `Conferindo cada linha de ${step.file.name}. Nada é gravado ainda.` : "Gravando tudo de uma vez. Não feche esta página."}
        />
      )}

      {step.name === "preview" && (
        <PreviewStep preview={step.preview} onConfirm={() => void handleConfirm()} onRestart={restart} />
      )}

      {step.name === "done" && <DoneStep result={step.result} onRestart={restart} />}
    </>
  );
}

function UploadStep({
  disabled,
  downloading,
  onFile,
  onTemplate,
}: {
  disabled: boolean;
  downloading: "csv" | "xlsx" | null;
  onFile: (file: File) => void;
  onTemplate: (format: "csv" | "xlsx") => void;
}) {
  const inputId = useId();
  const [isDragging, setIsDragging] = useState(false);

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (file && !disabled) onFile(file);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      <section className="rounded-card bg-superficie p-5 shadow-whisper sm:p-7">
        <h2 className="font-display text-xl font-bold text-tinta">Traga os dados do sistema antigo</h2>
        <p className="mt-1 max-w-xl text-sm text-tinta-suave">
          Unidades, moradores, vínculos e cobranças em aberto numa planilha só. Você confere a prévia e só depois confirma: nada é gravado antes.
        </p>

        <label
          htmlFor={inputId}
          onDragOver={(event) => {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`mt-6 flex cursor-pointer flex-col items-center rounded-block border-2 border-dashed px-4 py-10 text-center transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-verde ${
            isDragging ? "border-verde bg-verde-suave" : "border-linha bg-campo hover:bg-menu"
          } ${disabled ? "pointer-events-none opacity-60" : ""}`}
        >
          <span className="grid size-12 place-items-center rounded-block bg-superficie text-tinta shadow-whisper">
            <FileUp size={22} strokeWidth={1.8} aria-hidden />
          </span>
          <span className="mt-4 text-[15px] font-semibold text-tinta">Escolha a planilha ou arraste até aqui</span>
          <span className="mt-1 text-[13px] text-tinta-suave">CSV ou Excel (.xlsx) · até 2 MB e 2.000 linhas</span>
          <input
            id={inputId}
            type="file"
            accept={ACCEPT}
            disabled={disabled}
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) onFile(file);
            }}
          />
        </label>

        <div className="mt-4 flex flex-wrap gap-2 sm:hidden">
          <Button variant="quiet" size="sm" onClick={() => onTemplate("xlsx")} isLoading={downloading === "xlsx"} loadingText="Baixando…" disabled={disabled || downloading !== null}>
            <Download size={16} strokeWidth={2} aria-hidden />
            Modelo Excel
          </Button>
          <Button variant="quiet" size="sm" onClick={() => onTemplate("csv")} isLoading={downloading === "csv"} loadingText="Baixando…" disabled={disabled || downloading !== null}>
            <Download size={16} strokeWidth={2} aria-hidden />
            Modelo CSV
          </Button>
        </div>
      </section>

      <aside className="rounded-card bg-superficie p-5 shadow-whisper sm:p-7">
        <h2 className="flex items-center gap-2 font-display text-lg font-bold text-tinta">
          <FileSpreadsheet size={20} strokeWidth={1.8} aria-hidden />
          Como montar
        </h2>
        <p className="mt-1 text-sm text-tinta-suave">
          Uma linha por unidade. Repita a unidade para cada morador; o que se repete entra uma vez só.
        </p>
        <ul className="mt-4 divide-y divide-linha text-sm">
          {columns.map((column) => (
            <li key={column.name} className="py-2.5">
              <span className="font-semibold text-tinta">{column.name}</span>
              {column.required && <span className="ml-1.5 rounded-chip bg-verde-suave px-1.5 py-0.5 text-[11px] font-semibold text-verde-tinta">obrigatória</span>}
              {column.note && <span className="block text-[13px] text-tinta-suave">{column.note}</span>}
            </li>
          ))}
        </ul>
        <p className="mt-3 text-[13px] text-tinta-suave">
          Os nomes das colunas podem variar (ex.: "Bloco", "Apto", "Celular"). Ninguém recebe e-mail ou convite na importação.
        </p>
      </aside>
    </div>
  );
}

function ProcessingPanel({ title, detail }: { title: string; detail: string }) {
  return (
    <section role="status" aria-live="polite" className="flex flex-col items-center rounded-card bg-superficie px-5 py-14 text-center shadow-whisper">
      <HouseLights size={112} />
      <p className="mt-5 font-display text-xl font-bold text-tinta">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-tinta-suave">{detail}</p>
    </section>
  );
}

function summaryItems(summary: ImportSummary, isReport: boolean) {
  const skippedLabel = (count: number) => (count > 0 ? `${count} já ${count === 1 ? "existia" : "existiam"}` : undefined);
  const verb = isReport ? (count: number) => (count === 1 ? "criada" : "criadas") : () => "novas";
  return [
    { label: "Unidades", value: String(summary.units.created), detail: [`${verb(summary.units.created)}`, skippedLabel(summary.units.skipped)].filter(Boolean).join(" · ") },
    { label: "Moradores", value: String(summary.persons.created), detail: [isReport ? "cadastrados" : "novos", skippedLabel(summary.persons.skipped)].filter(Boolean).join(" · ") },
    { label: "Vínculos", value: String(summary.links.created), detail: [isReport ? "criados" : "novos", skippedLabel(summary.links.skipped)].filter(Boolean).join(" · ") },
    { label: "Cobranças em aberto", value: String(summary.charges.created), detail: [verb(summary.charges.created), skippedLabel(summary.charges.skipped)].filter(Boolean).join(" · ") },
  ];
}

function buildGroups(rows: ImportRow[]): Record<GroupKey, ListItem[]> {
  const units = new Map<string, ListItem>();
  const persons = new Map<string, ListItem>();
  const groups: Record<GroupKey, ListItem[]> = { errors: [], units: [], persons: [], links: [], charges: [] };

  for (const row of rows) {
    const unitLabel = [row.building, row.unit].filter(Boolean).join(" · ");
    if (row.errors.length > 0) {
      groups.errors.push({ key: `e${row.line}`, line: row.line, title: unitLabel || "Linha sem unidade", detail: "", action: null, errors: row.errors });
      continue;
    }

    const unitKey = unitLabel.toUpperCase();
    if (row.unitAction && !units.has(unitKey)) {
      const detail = [row.unitTypeLabel, row.buildingAction === "create" ? "prédio novo" : null].filter(Boolean).join(" · ");
      units.set(unitKey, { key: `u${row.line}`, line: row.line, title: unitLabel, detail, action: row.unitAction });
    }

    if (row.personAction && row.cpf && !persons.has(row.cpf)) {
      persons.set(row.cpf, { key: `p${row.line}`, line: row.line, title: row.personName || "Sem nome", detail: formatCpf(row.cpf), action: row.personAction });
    }

    if (row.linkAction) {
      groups.links.push({ key: `l${row.line}`, line: row.line, title: `${row.personName || formatCpf(row.cpf ?? "")} → ${unitLabel}`, detail: row.relationshipLabel ?? "", action: row.linkAction });
    }

    if (row.chargeAction && row.chargeValue !== null) {
      groups.charges.push({
        key: `c${row.line}`,
        line: row.line,
        title: `${formatCurrency(row.chargeValue)} · ${unitLabel}`,
        detail: `${row.chargeDescription ?? ""} · vence ${formatCalendarDate(row.chargeDueDate)}`,
        action: row.chargeAction,
      });
    }
  }

  groups.units = [...units.values()];
  groups.persons = [...persons.values()];
  return groups;
}

function formatCpf(cpf: string) {
  return cpf.length === 11 ? `${cpf.slice(0, 3)}.${cpf.slice(3, 6)}.${cpf.slice(6, 9)}-${cpf.slice(9)}` : cpf;
}

const groupLabels: Record<GroupKey, string> = {
  errors: "Com erro",
  units: "Unidades",
  persons: "Moradores",
  links: "Vínculos",
  charges: "Cobranças",
};

function PreviewStep({ preview, onConfirm, onRestart }: { preview: ImportPreview; onConfirm: () => void; onRestart: () => void }) {
  const groups = buildGroups(preview.rows);
  const tabs = (Object.keys(groupLabels) as GroupKey[]).filter((key) => key !== "errors" || groups.errors.length > 0);
  const [selected, setSelected] = useState<GroupKey>(groups.errors.length > 0 ? "errors" : "units");
  const active = tabs.includes(selected) ? selected : "units";
  const { summary } = preview;
  const toCreate = summary.buildings.created + summary.units.created + summary.persons.created + summary.links.created + summary.charges.created;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="min-w-0 text-sm text-tinta-suave">
          <span className="font-semibold text-tinta">{preview.fileName}</span> · {preview.totalRows} {preview.totalRows === 1 ? "linha" : "linhas"}
          {summary.buildings.created > 0 && ` · ${summary.buildings.created} ${summary.buildings.created === 1 ? "prédio novo" : "prédios novos"}`}
        </p>
        <Button variant="quiet" size="sm" onClick={onRestart}>
          <RotateCcw size={15} strokeWidth={2} aria-hidden />
          Trocar arquivo
        </Button>
      </div>

      {preview.errorRows > 0 ? (
        <p role="alert" className="flex items-start gap-2.5 rounded-field bg-vermelho-suave px-4 py-3 text-sm font-medium text-vermelho">
          <AlertCircle size={18} strokeWidth={2} className="mt-px shrink-0" aria-hidden />
          <span>
            {preview.errorRows} {preview.errorRows === 1 ? "linha tem erro" : "linhas têm erro"}. Corrija na planilha e envie de novo: a importação só acontece com tudo certo.
          </span>
        </p>
      ) : (
        <p role="status" className="flex items-start gap-2.5 rounded-field bg-verde-suave px-4 py-3 text-sm font-medium text-verde-tinta">
          <CheckCircle2 size={18} strokeWidth={2} className="mt-px shrink-0" aria-hidden />
          <span>Tudo certo. Confira abaixo e confirme para gravar.</span>
        </p>
      )}

      {preview.ignoredColumns.length > 0 && (
        <p className="-mt-3 text-[13px] text-tinta-suave">
          Colunas ignoradas: {preview.ignoredColumns.join(", ")}.
        </p>
      )}

      <SummaryCard items={summaryItems(summary, false)} label="O que será importado" />

      <section className="overflow-hidden rounded-card bg-superficie shadow-whisper">
        <div className="overflow-x-auto border-b border-linha px-3 pt-3 [scrollbar-width:none] sm:px-4">
          <div role="tablist" aria-label="Tipo de registro" className="flex gap-1">
            {tabs.map((key) => {
              const isActive = key === active;
              return (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setSelected(key)}
                  className={`-mb-px flex shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 px-3 pb-3 pt-1.5 text-sm font-semibold transition-colors ${
                    isActive ? (key === "errors" ? "border-vermelho text-vermelho" : "border-tinta text-tinta") : "border-transparent text-tinta-suave hover:text-tinta"
                  }`}
                >
                  {groupLabels[key]}
                  <span className="text-xs tabular-nums opacity-80">{groups[key].length}</span>
                </button>
              );
            })}
          </div>
        </div>

        <ul role="tabpanel" className="max-h-[520px] divide-y divide-linha overflow-y-auto">
          {groups[active].length === 0 ? (
            <li className="px-5 py-10 text-center text-sm text-tinta-suave">Nada deste tipo na planilha.</li>
          ) : (
            groups[active].map((item) => <PreviewItem key={item.key} item={item} />)
          )}
        </ul>
      </section>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button variant="quiet" onClick={onRestart}>
          Cancelar
        </Button>
        <Button variant="accent" onClick={onConfirm} disabled={!preview.canConfirm || toCreate === 0}>
          {toCreate === 0 && preview.canConfirm ? "Tudo já está no Moraê" : "Confirmar importação"}
        </Button>
      </div>
    </div>
  );
}

function PreviewItem({ item }: { item: ListItem }) {
  const isError = Boolean(item.errors?.length);
  return (
    <li className={`flex gap-3 px-4 py-3 sm:px-5 ${isError ? "bg-vermelho-suave/40" : ""}`}>
      <span className="w-14 shrink-0 pt-0.5 text-[13px] tabular-nums text-tinta-suave">Linha {item.line}</span>
      <span className="min-w-0 flex-1">
        <span className="block break-words text-[15px] font-semibold text-tinta">{item.title}</span>
        {item.detail && <span className="block break-words text-[13px] text-tinta-suave">{item.detail}</span>}
        {isError && (
          <ul className="mt-1 list-disc space-y-0.5 pl-4 text-[13px] text-vermelho">
            {item.errors!.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        )}
      </span>
      {item.action && (
        <span
          className={`h-fit shrink-0 rounded-chip px-2 py-0.5 text-xs font-semibold ${
            item.action === "create" ? "bg-verde-suave text-verde-tinta" : "bg-campo text-tinta-suave"
          }`}
        >
          {item.action === "create" ? "Novo" : "Já existe"}
        </span>
      )}
    </li>
  );
}

function DoneStep({ result, onRestart }: { result: ImportResult; onRestart: () => void }) {
  const { summary } = result;
  return (
    <div className="flex flex-col gap-6">
      <section role="status" className="flex flex-col items-center rounded-card bg-superficie px-5 py-10 text-center shadow-whisper">
        <HouseLights size={104} lit />
        <p className="mt-5 font-display text-2xl font-bold text-tinta">Casa acesa</p>
        <p className="mt-1 max-w-md text-sm text-tinta-suave">
          A planilha entrou no Moraê ({result.totalRows} {result.totalRows === 1 ? "linha" : "linhas"}
          {summary.buildings.created > 0 && `, ${summary.buildings.created} ${summary.buildings.created === 1 ? "prédio novo" : "prédios novos"}`}). Convide os moradores
          quando quiser, pela tela de Moradores.
        </p>
      </section>

      <SummaryCard items={summaryItems(summary, true)} label="Relatório da importação" />

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button variant="quiet" onClick={onRestart}>
          Importar outra planilha
        </Button>
        <ButtonLink to="/admin/units" variant="primary">
          Ver unidades
        </ButtonLink>
      </div>
    </div>
  );
}
