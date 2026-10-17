import { useId, useState, type DragEvent, type FormEvent } from "react";
import { FileUp, X } from "lucide-react";
import { Button } from "../../shared/components/Button";
import { Modal } from "../../shared/components/Modal";
import { SelectField } from "../../shared/components/SelectField";
import { TextAreaField } from "../../shared/components/TextAreaField";
import { TextField } from "../../shared/components/TextField";
import { formatDateTime } from "../../shared/lib/date";
import {
  ACCEPT_ATTRIBUTE,
  DESCRIPTION_MAX,
  DOCUMENT_VISIBILITY,
  TITLE_MAX,
  categoryLabel,
  documentCategories,
  fileKind,
  formatFileSize,
  titleFromFileName,
  validateFile,
  visibilityLabel,
  visibilityOptions,
} from "./documentMeta";
import type { CreateDocumentRequest, DocumentCategory, DocumentResponse, DocumentVisibility } from "./types";

export function FileTile({ contentType, size = "md" }: { contentType: string; size?: "md" | "lg" }) {
  const kind = fileKind(contentType);
  return (
    <span
      aria-hidden
      className={`grid shrink-0 place-items-center font-bold tracking-[0.02em] ${kind.tone} ${
        size === "lg" ? "size-11 rounded-block text-[11px]" : "size-10 rounded-[9px] text-[10px]"
      }`}
    >
      {kind.label}
    </span>
  );
}

export function VisibilityChip({ visibility }: { visibility: DocumentVisibility }) {
  const isManagement = visibility === DOCUMENT_VISIBILITY.managementOnly;
  return (
    <span className={`shrink-0 rounded-chip px-2 py-0.5 text-xs font-semibold ${isManagement ? "bg-ambar-suave text-ambar" : "bg-campo text-tinta-suave"}`}>
      {visibilityLabel(visibility)}
    </span>
  );
}

type FormFields = {
  title: string;
  description: string;
  category: DocumentCategory | "";
  visibility: DocumentVisibility;
  file: File | null;
};

type DocumentFormModalProps = {
  // null = new upload; otherwise only the details are edited (the file stays the same).
  document: DocumentResponse | null;
  initialCategory?: DocumentCategory;
  errorMessage: string;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (data: CreateDocumentRequest | Omit<CreateDocumentRequest, "file">) => Promise<void>;
};

export function DocumentFormModal({ document, initialCategory, errorMessage, isSubmitting, onClose, onSubmit }: DocumentFormModalProps) {
  const fileInputId = useId();
  const [form, setForm] = useState<FormFields>(() => ({
    title: document?.title ?? "",
    description: document?.description ?? "",
    category: document?.category ?? initialCategory ?? "",
    visibility: document?.visibility ?? DOCUMENT_VISIBILITY.everyone,
    file: null,
  }));
  const [errors, setErrors] = useState<{ title?: string; category?: string; file?: string }>({});
  const [isDragging, setIsDragging] = useState(false);

  function pickFile(file?: File) {
    if (!file) return;

    const fileError = validateFile(file);
    setErrors((current) => ({ ...current, file: fileError || undefined }));
    if (fileError) return;

    // Suggests a title from the file name when the field is still empty.
    setForm((current) => ({ ...current, file, title: current.title.trim() ? current.title : titleFromFileName(file.name) }));
    setErrors((current) => ({ ...current, title: undefined }));
  }

  // Updates a field and clears its error, so the message leaves as soon as the user fixes it.
  function setField<K extends "title" | "category">(field: K, value: FormFields[K]) {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setIsDragging(false);
    pickFile(event.dataTransfer.files?.[0]);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const title = form.title.trim();
    const nextErrors = {
      title: title.length === 0 ? "Informe o título do documento." : undefined,
      category: form.category === "" ? "Escolha a categoria do documento." : undefined,
      file: !document && !form.file ? "Escolha o arquivo do documento." : errors.file,
    };

    setErrors(nextErrors);
    if (nextErrors.title || nextErrors.category || nextErrors.file || form.category === "") return;

    const details = { title, description: form.description.trim() || null, category: form.category, visibility: form.visibility };
    await onSubmit(document ? details : { ...details, file: form.file as File });
  }

  return (
    <Modal
      title={document ? "Editar documento" : "Enviar documento"}
      description={document ? "O arquivo continua o mesmo. Para trocar, apague e envie de novo." : "PDF, JPG, PNG, Word ou Excel de até 20 MB."}
      size="lg"
      onClose={onClose}
      footer={
        <>
          <Button variant="quiet" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="document-form" isLoading={isSubmitting} loadingText={document ? "Salvando…" : "Enviando…"}>
            {document ? "Salvar alterações" : "Enviar documento"}
          </Button>
        </>
      }
    >
      <form id="document-form" onSubmit={handleSubmit} className="flex flex-col gap-5">
        {errorMessage && (
          <p role="alert" className="rounded-field bg-vermelho-suave px-4 py-3 text-sm font-medium text-vermelho">
            {errorMessage}
          </p>
        )}

        {document ? (
          <div className="flex items-center gap-3 rounded-field bg-campo px-4 py-3">
            <FileTile contentType={document.contentType} />
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold text-tinta">{document.fileName}</span>
              <span className="block text-[13px] tabular-nums text-tinta-suave">{formatFileSize(document.sizeBytes)}</span>
            </span>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-tinta">Arquivo</span>
            {form.file ? (
              <div className="flex items-center gap-3 rounded-field bg-campo px-4 py-3">
                <FileTile contentType={form.file.type} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-tinta">{form.file.name}</span>
                  <span className="block text-[13px] tabular-nums text-tinta-suave">{formatFileSize(form.file.size)}</span>
                </span>
                <button
                  type="button"
                  onClick={() => setForm((current) => ({ ...current, file: null }))}
                  aria-label="Trocar arquivo"
                  className="grid size-9 shrink-0 place-items-center rounded-full text-tinta-suave transition-colors hover:bg-menu hover:text-tinta"
                >
                  <X size={18} strokeWidth={1.8} aria-hidden />
                </button>
              </div>
            ) : (
              <label
                htmlFor={fileInputId}
                onDragOver={(event) => {
                  event.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                className={`flex cursor-pointer flex-col items-center rounded-field border-2 border-dashed px-4 py-7 text-center transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-verde ${
                  errors.file ? "border-vermelho bg-vermelho-suave/40" : isDragging ? "border-verde bg-verde-suave" : "border-linha bg-campo hover:bg-menu"
                }`}
              >
                <span className="grid size-10 place-items-center rounded-block bg-superficie text-tinta shadow-whisper">
                  <FileUp size={19} strokeWidth={1.8} aria-hidden />
                </span>
                <span className="mt-3 text-sm font-semibold text-tinta">Escolha o arquivo ou arraste até aqui</span>
                <span className="mt-0.5 text-[13px] text-tinta-suave">PDF, JPG, PNG, Word ou Excel · até 20 MB</span>
                <input
                  id={fileInputId}
                  type="file"
                  accept={ACCEPT_ATTRIBUTE}
                  className="sr-only"
                  onChange={(event) => {
                    pickFile(event.target.files?.[0]);
                    event.target.value = "";
                  }}
                />
              </label>
            )}
            {errors.file && <p className="text-[13px] font-medium text-vermelho">{errors.file}</p>}
          </div>
        )}

        <TextField
          label="Título"
          value={form.title}
          maxLength={TITLE_MAX}
          onChange={(event) => setField("title", event.target.value)}
          placeholder="Ex.: Balancete de setembro"
          error={errors.title}
        />

        <SelectField
          label="Categoria"
          value={String(form.category)}
          placeholder="Escolha a categoria"
          options={documentCategories.map((category) => ({ value: String(category.value), label: category.label }))}
          onChange={(event) => setField("category", event.target.value ? (Number(event.target.value) as DocumentCategory) : "")}
          error={errors.category}
        />

        <TextAreaField
          label="Descrição (opcional)"
          value={form.description}
          maxLength={DESCRIPTION_MAX}
          rows={3}
          onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
          placeholder="O que tem no documento, período a que se refere…"
        />

        <fieldset>
          <legend className="text-sm font-semibold text-tinta">Quem pode ver</legend>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {visibilityOptions.map((option) => {
              const isSelected = form.visibility === option.value;
              return (
                <label
                  key={option.value}
                  className={`flex cursor-pointer flex-col rounded-field px-4 py-3 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-verde ${
                    isSelected ? "bg-verde-suave ring-2 ring-verde" : "bg-campo hover:bg-menu"
                  }`}
                >
                  <input
                    type="radio"
                    name="visibility"
                    className="sr-only"
                    checked={isSelected}
                    onChange={() => setForm((current) => ({ ...current, visibility: option.value }))}
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

type DocumentDetailsModalProps = {
  document: DocumentResponse;
  isDownloading: boolean;
  onClose: () => void;
  onDownload: () => void;
  onEdit: () => void;
  onDelete: () => void;
};

export function DocumentDetailsModal({ document, isDownloading, onClose, onDownload, onEdit, onDelete }: DocumentDetailsModalProps) {
  const wasEdited = document.updatedAt.slice(0, 16) !== document.createdAt.slice(0, 16);

  return (
    <Modal
      title={document.title}
      description={
        <span className="flex flex-wrap items-center gap-2">
          <span className="font-medium text-tinta">{categoryLabel(document.category)}</span>
          <VisibilityChip visibility={document.visibility} />
        </span>
      }
      leading={<FileTile contentType={document.contentType} size="lg" />}
      size="lg"
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onDelete} className="mr-auto rounded-full px-3 text-sm font-semibold text-vermelho hover:underline">
            Apagar
          </button>
          <Button variant="quiet" onClick={onEdit}>
            Editar
          </Button>
          <Button onClick={onDownload} isLoading={isDownloading} loadingText="Baixando…">
            Baixar
          </Button>
        </>
      }
    >
      {document.description && <p className="mb-5 whitespace-pre-line text-[15px] leading-relaxed text-tinta">{document.description}</p>}
      <dl className="divide-y divide-linha rounded-field bg-campo text-sm">
        {[
          { label: "Arquivo", value: document.fileName },
          { label: "Tamanho", value: formatFileSize(document.sizeBytes) },
          { label: "Enviado por", value: document.uploadedByName || "-" },
          { label: "Enviado em", value: formatDateTime(document.createdAt) },
          ...(wasEdited ? [{ label: "Editado em", value: formatDateTime(document.updatedAt) }] : []),
        ].map((row) => (
          <div key={row.label} className="flex items-baseline justify-between gap-4 px-4 py-2.5">
            <dt className="shrink-0 text-tinta-suave">{row.label}</dt>
            <dd className="min-w-0 truncate text-right font-medium tabular-nums text-tinta">{row.value}</dd>
          </div>
        ))}
      </dl>
    </Modal>
  );
}
