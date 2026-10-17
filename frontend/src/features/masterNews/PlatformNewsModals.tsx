import { useState, type FormEvent } from "react";
import { Megaphone } from "lucide-react";
import { Button } from "../../shared/components/Button";
import { Modal } from "../../shared/components/Modal";
import { TextAreaField } from "../../shared/components/TextAreaField";
import { TextField } from "../../shared/components/TextField";
import { formatDateTime } from "../../shared/lib/date";
import { NEWS_PRIORITY, newsPriorityMeta, newsPriorityOptions } from "../news/newsPriority";
import type { NewsResponse } from "../news/types";
import { TEXT_MAX, TITLE_MAX, toNewsForm, type NewsForm } from "./newsForm";

export function PriorityChip({ priority }: { priority: number }) {
  const meta = newsPriorityMeta(priority);
  return <span className={`shrink-0 rounded-chip px-2 py-0.5 text-xs font-semibold ${meta.tone}`}>{meta.label}</span>;
}

type NewsFormModalProps = {
  news: NewsResponse | null;
  errorMessage: string;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (form: NewsForm) => Promise<void>;
};

export function NewsFormModal({ news, errorMessage, isSubmitting, onClose, onSubmit }: NewsFormModalProps) {
  const [form, setForm] = useState<NewsForm>(() => toNewsForm(news));
  const [errors, setErrors] = useState<{ title?: string; description?: string }>({});

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const title = form.title.trim();
    const description = form.description.trim();
    const nextErrors = {
      title: title.length < 3 ? "Escreva um título com pelo menos 3 caracteres." : undefined,
      description: description.length < 3 ? "Escreva o texto do aviso." : undefined,
    };

    setErrors(nextErrors);
    if (nextErrors.title || nextErrors.description) return;

    await onSubmit({ ...form, title, description });
  }

  return (
    <Modal
      title={news ? "Editar aviso" : "Novo aviso"}
      description="Vai para os administradores de todos os condomínios."
      size="lg"
      onClose={onClose}
      footer={
        <>
          <Button variant="quiet" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="platform-news" isLoading={isSubmitting} loadingText={news ? "Salvando…" : "Publicando…"}>
            {news ? "Salvar alterações" : "Publicar aviso"}
          </Button>
        </>
      }
    >
      <form id="platform-news" onSubmit={handleSubmit} className="flex flex-col gap-5">
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
          placeholder="Ex.: Manutenção programada no domingo"
          error={errors.title}
        />

        <TextAreaField
          label="Texto"
          value={form.description}
          maxLength={TEXT_MAX}
          rows={6}
          onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
          placeholder="O que os administradores precisam saber e, se for o caso, o que fazer."
          error={errors.description}
        />

        <fieldset>
          <legend className="text-sm font-semibold text-tinta">Prioridade</legend>
          <div className="mt-2 grid gap-2 sm:grid-cols-3">
            {newsPriorityOptions.map((option) => {
              const isSelected = form.priority === option.value;
              return (
                <label
                  key={option.value}
                  className={`flex cursor-pointer flex-col rounded-field px-4 py-3 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-verde ${
                    isSelected ? "bg-verde-suave ring-2 ring-verde" : "bg-campo hover:bg-menu"
                  }`}
                >
                  <input
                    type="radio"
                    name="priority"
                    className="sr-only"
                    checked={isSelected}
                    onChange={() => setForm((current) => ({ ...current, priority: option.value }))}
                  />
                  <span className="text-sm font-semibold text-tinta">{option.label}</span>
                  <span className="text-xs text-tinta-suave">{option.hint}</span>
                </label>
              );
            })}
          </div>
        </fieldset>
      </form>
    </Modal>
  );
}

type NewsDetailsModalProps = {
  news: NewsResponse;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
};

export function NewsDetailsModal({ news, onClose, onEdit, onDelete }: NewsDetailsModalProps) {
  const isImportant = news.priority === NEWS_PRIORITY.high;

  return (
    <Modal
      title={news.title}
      description={
        <span className="flex flex-wrap items-center gap-2">
          <PriorityChip priority={news.priority} />
          <span>Publicado em {formatDateTime(news.createdAt)} · para os administradores</span>
        </span>
      }
      leading={
        <span className={`grid size-11 place-items-center rounded-block ${isImportant ? "bg-vermelho-suave text-vermelho" : "bg-verde-suave text-verde-tinta"}`}>
          <Megaphone size={20} strokeWidth={1.8} aria-hidden />
        </span>
      }
      size="lg"
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onDelete} className="mr-auto rounded-full px-3 text-sm font-semibold text-vermelho hover:underline">
            Apagar aviso
          </button>
          <Button onClick={onEdit}>Editar aviso</Button>
        </>
      }
    >
      <p className="whitespace-pre-line text-[15px] leading-relaxed text-tinta">{news.description}</p>
    </Modal>
  );
}
