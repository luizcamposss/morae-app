import { useState, type FormEvent, type ReactNode } from "react";
import { Plus, Trash2, X } from "lucide-react";
import { Button } from "../../shared/components/Button";
import { Modal } from "../../shared/components/Modal";
import { SelectField } from "../../shared/components/SelectField";
import { Switch } from "../../shared/components/Switch";
import { TextAreaField } from "../../shared/components/TextAreaField";
import { TextField } from "../../shared/components/TextField";
import { formatDate } from "../../shared/lib/date";
import { VOTE_TYPE, assemblyTypes, phaseMeta, quorums, voteTypes, voterRules } from "../assemblies/assemblyMeta";
import type { AssemblyPhase, AssemblyResponse, SaveAssemblyRequest } from "../assemblies/types";
import type { DocumentResponse } from "../documents/types";
import {
  DESCRIPTION_MAX,
  ITEM_TITLE_MAX,
  LOCATION_MAX,
  MAX_ITEMS,
  MAX_OPTIONS,
  OPTION_MAX,
  TITLE_MAX,
  hasFormErrors,
  newItemForm,
  toAssemblyForm,
  toAssemblyRequest,
  validateAssemblyForm,
  type AssemblyForm,
  type AssemblyFormErrors,
  type ItemForm,
} from "./assemblyForm";

export function PhaseChip({ phase }: { phase: AssemblyPhase }) {
  const meta = phaseMeta[phase];
  return <span className={`shrink-0 whitespace-nowrap rounded-chip px-2 py-0.5 text-xs font-semibold ${meta.tone}`}>{meta.label}</span>;
}

function FormSection({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <div>
        <h3 className="font-display text-[17px] font-bold tracking-[-0.01em] text-tinta">{title}</h3>
        {hint && <p className="mt-0.5 text-[13px] text-tinta-suave">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

// Radio cards, as in the visit form.
function ChoiceCards<T extends number>({
  legend,
  name,
  value,
  options,
  onChange,
}: {
  legend: string;
  name: string;
  value: T;
  options: Array<{ value: T; label: string; hint?: string }>;
  onChange: (value: T) => void;
}) {
  return (
    <fieldset>
      <legend className="text-sm font-semibold text-tinta">{legend}</legend>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        {options.map((option) => {
          const isSelected = value === option.value;
          return (
            <label
              key={option.value}
              className={`flex cursor-pointer flex-col rounded-field px-3.5 py-3 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-verde ${
                isSelected ? "bg-verde-suave ring-2 ring-verde" : "bg-campo hover:bg-menu"
              }`}
            >
              <input type="radio" name={name} className="sr-only" checked={isSelected} onChange={() => onChange(option.value)} />
              <span className="text-sm font-semibold text-tinta">{option.label}</span>
              {option.hint && <span className="text-xs text-tinta-suave">{option.hint}</span>}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

type AssemblyFormModalProps = {
  assembly: AssemblyResponse | null;
  errorMessage: string;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (request: SaveAssemblyRequest) => Promise<void>;
};

export function AssemblyFormModal({ assembly, errorMessage, isSubmitting, onClose, onSubmit }: AssemblyFormModalProps) {
  const [form, setForm] = useState<AssemblyForm>(() => toAssemblyForm(assembly));
  const [errors, setErrors] = useState<AssemblyFormErrors>({});

  function set<K extends keyof AssemblyForm>(field: K, value: AssemblyForm[K]) {
    setForm((current) => ({ ...current, [field]: value }));
    if (field in errors) setErrors((current) => ({ ...current, [field]: undefined }));
  }

  function setItem(key: string, changes: Partial<ItemForm>) {
    setForm((current) => ({ ...current, items: current.items.map((item) => (item.key === key ? { ...item, ...changes } : item)) }));
    setErrors((current) => {
      if (!current.itemErrors?.[key]) return current;
      const itemErrors = { ...current.itemErrors };
      delete itemErrors[key];
      return { ...current, itemErrors };
    });
  }

  function addItem() {
    setForm((current) => ({ ...current, items: [...current.items, newItemForm()] }));
    setErrors((current) => ({ ...current, items: undefined }));
  }

  function removeItem(key: string) {
    setForm((current) => ({ ...current, items: current.items.filter((item) => item.key !== key) }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validateAssemblyForm(form);

    setErrors(nextErrors);
    if (hasFormErrors(nextErrors)) return;

    await onSubmit(toAssemblyRequest(form));
  }

  return (
    <Modal
      title={assembly ? "Editar rascunho" : "Nova assembleia"}
      description="Fica como rascunho até você publicar. Ninguém vê antes disso."
      size="lg"
      onClose={onClose}
      footer={
        <>
          <Button variant="quiet" onClick={onClose}>
            Voltar
          </Button>
          <Button type="submit" form="assembly-form" isLoading={isSubmitting} loadingText="Salvando…">
            {assembly ? "Salvar rascunho" : "Criar rascunho"}
          </Button>
        </>
      }
    >
      <form id="assembly-form" onSubmit={handleSubmit} noValidate className="flex flex-col gap-7">
        {errorMessage && (
          <p role="alert" className="rounded-field bg-vermelho-suave px-4 py-3 text-sm font-medium text-vermelho">
            {errorMessage}
          </p>
        )}

        <FormSection title="Dados">
          <TextField
            label="Título"
            value={form.title}
            maxLength={TITLE_MAX}
            onChange={(event) => set("title", event.target.value)}
            placeholder="Ex.: Assembleia Geral Ordinária 2026"
            error={errors.title}
          />
          <TextAreaField
            label="Edital ou convocação (opcional)"
            rows={3}
            value={form.description}
            maxLength={DESCRIPTION_MAX}
            onChange={(event) => set("description", event.target.value)}
            placeholder="O que vai ser decidido e o que os moradores precisam saber."
          />
          <ChoiceCards legend="Tipo" name="assemblyType" value={form.type} options={assemblyTypes} onChange={(value) => set("type", value)} />
          <ChoiceCards legend="Quem vota" name="voterRule" value={form.voterRule} options={voterRules} onChange={(value) => set("voterRule", value)} />
        </FormSection>

        <FormSection title="Votação" hint="Horário de Brasília. Unidades com cobrança em atraso não votam.">
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              label="Abre em"
              type="datetime-local"
              value={form.votingStartsAt}
              onChange={(event) => set("votingStartsAt", event.target.value)}
              error={errors.votingStartsAt}
            />
            <TextField
              label="Fecha em"
              type="datetime-local"
              value={form.votingEndsAt}
              min={form.votingStartsAt || undefined}
              onChange={(event) => set("votingEndsAt", event.target.value)}
              error={errors.votingEndsAt}
            />
          </div>
          <div className="rounded-field bg-campo px-4">
            <Switch
              label="Também tem reunião presencial"
              description="Mostra a data e o local da reunião junto da convocação."
              checked={form.hasMeeting}
              onChange={(checked) => set("hasMeeting", checked)}
            />
          </div>
          {form.hasMeeting && (
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField label="Data da reunião" type="datetime-local" value={form.meetingAt} onChange={(event) => set("meetingAt", event.target.value)} />
              <TextField
                label="Local"
                value={form.meetingLocation}
                maxLength={LOCATION_MAX}
                onChange={(event) => set("meetingLocation", event.target.value)}
                placeholder="Ex.: Salão de festas"
              />
            </div>
          )}
        </FormSection>

        <FormSection title="Pautas" hint="Cada pauta é votada separadamente. A opção Abstenção entra sozinha.">
          {errors.items && (
            <p role="alert" className="text-sm font-medium text-vermelho">
              {errors.items}
            </p>
          )}
          <ol className="flex flex-col gap-4">
            {form.items.map((item, index) => (
              <ItemCard
                key={item.key}
                item={item}
                index={index}
                errors={errors.itemErrors?.[item.key]}
                canRemove={form.items.length > 1}
                onChange={(changes) => setItem(item.key, changes)}
                onRemove={() => removeItem(item.key)}
              />
            ))}
          </ol>
          {form.items.length < MAX_ITEMS && (
            <Button variant="quiet" size="sm" className="self-start" onClick={addItem}>
              <Plus size={16} strokeWidth={2} aria-hidden />
              Adicionar pauta
            </Button>
          )}
        </FormSection>
      </form>
    </Modal>
  );
}

type ItemCardProps = {
  item: ItemForm;
  index: number;
  errors?: { title?: string; options?: string };
  canRemove: boolean;
  onChange: (changes: Partial<ItemForm>) => void;
  onRemove: () => void;
};

function ItemCard({ item, index, errors, canRemove, onChange, onRemove }: ItemCardProps) {
  const isMultiple = item.voteType === VOTE_TYPE.multipleChoice;

  function setOption(position: number, text: string) {
    onChange({ options: item.options.map((option, current) => (current === position ? text : option)) });
  }

  return (
    <li className="flex flex-col gap-4 rounded-block border border-linha p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[13px] font-semibold uppercase tracking-[0.06em] text-tinta-suave">Pauta {index + 1}</span>
        {canRemove && (
          <button
            type="button"
            onClick={onRemove}
            aria-label={`Remover pauta ${index + 1}`}
            className="grid size-9 place-items-center rounded-full text-tinta-suave transition-colors hover:bg-vermelho-suave hover:text-vermelho"
          >
            <Trash2 size={17} strokeWidth={1.8} aria-hidden />
          </button>
        )}
      </div>
      <TextField
        label="Título"
        value={item.title}
        maxLength={ITEM_TITLE_MAX}
        onChange={(event) => onChange({ title: event.target.value })}
        placeholder="Ex.: Aprovação das contas de 2025"
        error={errors?.title}
      />
      <TextAreaField
        label="Detalhes (opcional)"
        rows={2}
        value={item.description}
        maxLength={DESCRIPTION_MAX}
        onChange={(event) => onChange({ description: event.target.value })}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField
          label="Tipo de votação"
          value={String(item.voteType)}
          options={voteTypes.map((option) => ({ value: String(option.value), label: option.label }))}
          onChange={(event) => onChange({ voteType: Number(event.target.value) as ItemForm["voteType"] })}
        />
        <SelectField
          label="Quórum para valer"
          value={String(item.quorum)}
          options={quorums.map((option) => ({ value: String(option.value), label: option.label }))}
          onChange={(event) => onChange({ quorum: Number(event.target.value) as ItemForm["quorum"] })}
        />
      </div>

      {isMultiple && (
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-sm font-semibold text-tinta">Opções</legend>
          {item.options.map((option, position) => (
            <div key={position} className="flex items-center gap-2">
              <input
                aria-label={`Opção ${position + 1}`}
                value={option}
                maxLength={OPTION_MAX}
                onChange={(event) => setOption(position, event.target.value)}
                placeholder={`Opção ${position + 1}`}
                className="min-w-0 flex-1 rounded-field bg-campo px-4 py-3 text-[15px] font-medium text-tinta outline-none transition-[background-color,box-shadow] duration-150 ease-out placeholder:font-normal placeholder:text-tinta-suave/80 focus:bg-superficie focus:ring-2 focus:ring-verde focus-visible:outline-none"
              />
              {item.options.length > 2 && (
                <button
                  type="button"
                  onClick={() => onChange({ options: item.options.filter((_, current) => current !== position) })}
                  aria-label={`Remover opção ${position + 1}`}
                  className="grid size-9 shrink-0 place-items-center rounded-full text-tinta-suave transition-colors hover:bg-menu hover:text-tinta"
                >
                  <X size={16} strokeWidth={2} aria-hidden />
                </button>
              )}
            </div>
          ))}
          {errors?.options && <p className="text-[13px] font-medium text-vermelho">{errors.options}</p>}
          {item.options.length < MAX_OPTIONS && (
            <button
              type="button"
              onClick={() => onChange({ options: [...item.options, ""] })}
              className="flex items-center gap-1.5 self-start rounded-field px-1 py-1.5 text-sm font-semibold text-verde-tinta hover:underline"
            >
              <Plus size={15} strokeWidth={2} aria-hidden />
              Adicionar opção
            </button>
          )}
        </fieldset>
      )}

      <div className="rounded-field bg-campo px-4">
        <Switch
          label="Voto secreto"
          description="O resultado não mostra como cada unidade votou."
          checked={item.isSecret}
          onChange={(checked) => onChange({ isSecret: checked })}
        />
      </div>
    </li>
  );
}

type CancelAssemblyModalProps = {
  assembly: AssemblyResponse;
  errorMessage: string;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (reason: string) => Promise<void>;
};

export function CancelAssemblyModal({ assembly, errorMessage, isSubmitting, onClose, onSubmit }: CancelAssemblyModalProps) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!reason.trim()) {
      setError("Conte o motivo. Ele vai junto do aviso aos moradores.");
      return;
    }
    await onSubmit(reason.trim());
  }

  return (
    <Modal
      title="Cancelar assembleia?"
      description={`"${assembly.title}" sai de votação e os votos já dados não contam. Todos são avisados.`}
      onClose={onClose}
      footer={
        <>
          <Button variant="quiet" onClick={onClose}>
            Voltar
          </Button>
          <Button type="submit" form="cancel-assembly-form" variant="danger" isLoading={isSubmitting} loadingText="Cancelando…">
            Cancelar assembleia
          </Button>
        </>
      }
    >
      <form id="cancel-assembly-form" onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        {errorMessage && (
          <p role="alert" className="rounded-field bg-vermelho-suave px-4 py-3 text-sm font-medium text-vermelho">
            {errorMessage}
          </p>
        )}
        <TextAreaField
          label="Motivo"
          rows={3}
          maxLength={500}
          value={reason}
          onChange={(event) => {
            setReason(event.target.value);
            setError("");
          }}
          placeholder="Ex.: A pauta vai ser revista com a administradora."
          error={error}
        />
      </form>
    </Modal>
  );
}

type MinutesModalProps = {
  currentId: number | null;
  documents: DocumentResponse[] | null;
  errorMessage: string;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (documentId: number | null) => Promise<void>;
};

// Choose the minutes among the documents of the "Atas" category.
export function MinutesModal({ currentId, documents, errorMessage, isSubmitting, onClose, onSubmit }: MinutesModalProps) {
  const [selectedId, setSelectedId] = useState<number | null>(currentId);
  const isEmpty = documents !== null && documents.length === 0;

  return (
    <Modal
      title="Ligar a ata"
      description="Escolha a ata entre os documentos da categoria Atas. Os moradores veem junto do resultado."
      onClose={onClose}
      footer={
        <>
          <Button variant="quiet" onClick={onClose}>
            Voltar
          </Button>
          {!isEmpty && (
            <Button
              onClick={() => void onSubmit(selectedId)}
              isLoading={isSubmitting}
              loadingText="Salvando…"
              disabled={documents === null || selectedId === currentId}
            >
              {selectedId === null && currentId !== null ? "Tirar a ata" : "Ligar ata"}
            </Button>
          )}
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {errorMessage && (
          <p role="alert" className="rounded-field bg-vermelho-suave px-4 py-3 text-sm font-medium text-vermelho">
            {errorMessage}
          </p>
        )}
        {documents === null ? (
          <p className="text-sm text-tinta-suave">Carregando atas…</p>
        ) : isEmpty ? (
          <p className="rounded-field bg-campo px-4 py-3 text-sm text-tinta-suave">
            Nenhuma ata enviada ainda. Envie o arquivo em Documentos, na categoria Atas, e volte aqui.
          </p>
        ) : (
          <fieldset className="flex flex-col gap-2">
            <legend className="sr-only">Atas</legend>
            {[...documents.map((document) => ({ id: document.id as number | null, title: document.title, detail: formatDate(document.createdAt) })),
              ...(currentId !== null ? [{ id: null, title: "Sem ata", detail: "Tira a ligação atual" }] : []),
            ].map((option) => {
              const isSelected = selectedId === option.id;
              return (
                <label
                  key={option.id ?? "none"}
                  className={`flex cursor-pointer items-center justify-between gap-3 rounded-field px-4 py-3 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-verde ${
                    isSelected ? "bg-verde-suave ring-2 ring-verde" : "bg-campo hover:bg-menu"
                  }`}
                >
                  <input type="radio" name="minutes" className="sr-only" checked={isSelected} onChange={() => setSelectedId(option.id)} />
                  <span className="min-w-0 truncate text-sm font-semibold text-tinta">{option.title}</span>
                  <span className="shrink-0 text-xs tabular-nums text-tinta-suave">{option.detail}</span>
                </label>
              );
            })}
          </fieldset>
        )}
      </div>
    </Modal>
  );
}
