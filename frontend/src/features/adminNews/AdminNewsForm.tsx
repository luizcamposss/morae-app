import { useState, type FormEvent } from "react";
import { Button } from "../../shared/components/Button";
import { SelectField } from "../../shared/components/SelectField";
import { TextAreaField } from "../../shared/components/TextAreaField";
import { TextField } from "../../shared/components/TextField";
import type { BuildingResponse } from "../buildings/types";
import { condominiumAudienceOptions, NEWS_AUDIENCE, newsAudienceLabel } from "../news/newsAudience";
import { TEXT_MAX, TITLE_MAX, toNewsForm, validateNewsForm, type NewsForm, type NewsFormErrors } from "../news/newsForm";
import { newsPriorityOptions } from "../news/newsPriority";
import type { NewsResponse, NewsTargetAudience } from "../news/types";

export type CondominiumNewsForm = NewsForm & { targetAudience: NewsTargetAudience; buildingId: number | null };

type AdminNewsFormProps = {
  news: NewsResponse | null;
  buildings: BuildingResponse[];
  errorMessage: string;
  isSubmitting: boolean;
  disabled?: boolean;
  onCancelEdit: () => void;
  onSubmit: (form: CondominiumNewsForm) => Promise<void>;
};

type SegmentedProps<T extends number> = {
  legend: string;
  name: string;
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (value: T) => void;
};

// Pill segmented control built on radios (keyboard arrows work natively).
function Segmented<T extends number>({ legend, name, value, options, onChange }: SegmentedProps<T>) {
  return (
    <fieldset>
      <legend className="text-sm font-semibold text-tinta">{legend}</legend>
      <div className="mt-2 inline-flex max-w-full flex-wrap gap-1 rounded-field bg-campo p-1">
        {options.map((option) => {
          const isSelected = option.value === value;
          return (
            <label
              key={option.value}
              className={`cursor-pointer rounded-[7px] px-3.5 py-1.5 text-sm font-semibold transition-colors duration-150 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-verde ${
                isSelected ? "bg-superficie text-tinta shadow-whisper" : "text-tinta-suave hover:text-tinta"
              }`}
            >
              <input type="radio" name={name} className="sr-only" checked={isSelected} onChange={() => onChange(option.value)} />
              {option.label}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

function toForm(news: NewsResponse | null): CondominiumNewsForm {
  return {
    ...toNewsForm(news),
    targetAudience: news?.targetAudience || NEWS_AUDIENCE.everyone,
    buildingId: news?.buildingId ?? null,
  };
}

// Side panel form (Figma "Novo aviso"); also used to edit a notice.
export function AdminNewsForm({ news, buildings, errorMessage, isSubmitting, disabled, onCancelEdit, onSubmit }: AdminNewsFormProps) {
  const [form, setForm] = useState<CondominiumNewsForm>(() => toForm(news));
  const [errors, setErrors] = useState<NewsFormErrors>({});

  // Keep an audience the form does not offer (e.g. an old "Administração" notice) when editing.
  const audienceOptions = condominiumAudienceOptions.some((option) => option.value === form.targetAudience)
    ? condominiumAudienceOptions
    : [...condominiumAudienceOptions, { value: form.targetAudience, label: newsAudienceLabel(form.targetAudience) }];
  const selectedBuilding = buildings.find((building) => building.id === form.buildingId);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = validateNewsForm(form);
    setErrors(result.errors);
    if (!result.isValid) return;

    await onSubmit(result.form);
  }

  return (
    <form id="admin-news-form" onSubmit={handleSubmit} className="flex flex-col gap-5 rounded-card bg-superficie p-5 shadow-whisper sm:p-6">
      {errorMessage && (
        <p role="alert" className="rounded-field bg-vermelho-suave px-4 py-3 text-sm font-medium text-vermelho">
          {errorMessage}
        </p>
      )}

      <TextField
        label="Título"
        value={form.title}
        maxLength={TITLE_MAX}
        onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
        placeholder="Ex.: Manutenção do elevador"
        error={errors.title}
      />

      <Segmented
        legend="Para quem"
        name="news-audience"
        value={form.targetAudience}
        options={audienceOptions}
        onChange={(targetAudience) => setForm((current) => ({ ...current, targetAudience }))}
      />

      {buildings.length > 0 && (
        <div className="flex flex-col gap-2">
          <SelectField
            label="Prédio"
            value={form.buildingId ? String(form.buildingId) : ""}
            placeholder="Todos os prédios"
            options={buildings.map((building) => ({ value: String(building.id), label: building.name }))}
            onChange={(event) => setForm((current) => ({ ...current, buildingId: event.target.value ? Number(event.target.value) : null }))}
          />
          {selectedBuilding && <p className="text-[13px] text-tinta-suave">Só quem mora ou cuida de {selectedBuilding.name} recebe.</p>}
        </div>
      )}

      <TextAreaField
        label="Mensagem"
        value={form.description}
        maxLength={TEXT_MAX}
        rows={5}
        onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
        placeholder="O que os moradores precisam saber e, se for o caso, o que fazer."
        error={errors.description}
      />

      <Segmented
        legend="Prioridade"
        name="news-priority"
        value={form.priority}
        options={newsPriorityOptions}
        onChange={(priority) => setForm((current) => ({ ...current, priority }))}
      />

      <div className="flex flex-col gap-2 pt-1">
        <Button type="submit" fullWidth disabled={disabled} isLoading={isSubmitting} loadingText={news ? "Salvando…" : "Publicando…"}>
          {news ? "Salvar alterações" : "Publicar aviso"}
        </Button>
        {news && (
          <Button variant="quiet" fullWidth onClick={onCancelEdit}>
            Cancelar edição
          </Button>
        )}
      </div>
    </form>
  );
}
