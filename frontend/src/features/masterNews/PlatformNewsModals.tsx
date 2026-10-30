import { useState, type FormEvent } from "react";
import { Button } from "../../shared/components/Button";
import { Modal } from "../../shared/components/Modal";
import { TextAreaField } from "../../shared/components/TextAreaField";
import { TextField } from "../../shared/components/TextField";
import { TEXT_MAX, TITLE_MAX, toNewsForm, validateNewsForm, type NewsForm, type NewsFormErrors } from "../news/newsForm";
import { newsPriorityOptions } from "../news/newsPriority";
import type { NewsResponse } from "../news/types";

type NewsFormModalProps = {
  news: NewsResponse | null;
  errorMessage: string;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (form: NewsForm) => Promise<void>;
};

export function NewsFormModal({ news, errorMessage, isSubmitting, onClose, onSubmit }: NewsFormModalProps) {
  const [form, setForm] = useState<NewsForm>(() => toNewsForm(news));
  const [errors, setErrors] = useState<NewsFormErrors>({});

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = validateNewsForm(form);
    setErrors(result.errors);
    if (!result.isValid) return;

    await onSubmit(result.form);
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
