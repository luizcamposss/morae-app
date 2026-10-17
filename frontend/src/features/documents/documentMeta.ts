import type { DocumentCategory, DocumentResponse, DocumentVisibility } from "./types";

// Limits from DocumentService / UploadedFileInspector.
export const TITLE_MAX = 150;
export const DESCRIPTION_MAX = 1000;
export const MAX_FILE_BYTES = 20 * 1024 * 1024;
export const ACCEPTED_EXTENSIONS = [".pdf", ".jpg", ".jpeg", ".png", ".docx", ".xlsx"];
export const ACCEPT_ATTRIBUTE = ACCEPTED_EXTENSIONS.join(",");

export const DOCUMENT_CATEGORY = {
  convention: 1,
  internalRules: 2,
  minutes: 3,
  financial: 4,
  contract: 5,
  other: 6,
} as const satisfies Record<string, DocumentCategory>;

export const DOCUMENT_VISIBILITY = { everyone: 1, managementOnly: 2 } as const satisfies Record<string, DocumentVisibility>;

// Short label for the tabs, full label for forms and details.
export const documentCategories: Array<{ value: DocumentCategory; label: string; shortLabel: string }> = [
  { value: 1, label: "Convenção", shortLabel: "Convenção" },
  { value: 2, label: "Regimento interno", shortLabel: "Regimento" },
  { value: 3, label: "Atas", shortLabel: "Atas" },
  { value: 4, label: "Prestação de contas", shortLabel: "Prestação de contas" },
  { value: 5, label: "Contratos", shortLabel: "Contratos" },
  { value: 6, label: "Outros", shortLabel: "Outros" },
];

export const visibilityOptions: Array<{ value: DocumentVisibility; label: string; hint: string }> = [
  { value: 1, label: "Todos do condomínio", hint: "Moradores, síndicos e administração" },
  { value: 2, label: "Só a gestão", hint: "Administração e síndicos" },
];

export function categoryLabel(category: DocumentCategory) {
  return documentCategories.find((item) => item.value === category)?.label ?? "Outros";
}

export function visibilityLabel(visibility: DocumentVisibility) {
  return visibility === DOCUMENT_VISIBILITY.managementOnly ? "Só a gestão" : "Todos do condomínio";
}

// "1,2 MB", "340 KB".
export function formatFileSize(bytes: number) {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} MB`;
  }

  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

const fileKinds: Record<string, { label: string; tone: string }> = {
  "application/pdf": { label: "PDF", tone: "bg-vermelho-suave text-vermelho" },
  "image/jpeg": { label: "JPG", tone: "bg-ambar-suave text-ambar" },
  "image/png": { label: "PNG", tone: "bg-ambar-suave text-ambar" },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": { label: "DOCX", tone: "bg-campo text-tinta" },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": { label: "XLSX", tone: "bg-verde-suave text-verde-tinta" },
};

// Small colored tile with the file type, as in the Figma list.
export function fileKind(contentType: DocumentResponse["contentType"]) {
  return fileKinds[contentType] ?? { label: "ARQ", tone: "bg-campo text-tinta-suave" };
}

// Quick check before uploading; the API still inspects the real content.
export function validateFile(file: File) {
  const name = file.name.toLowerCase();

  if (!ACCEPTED_EXTENSIONS.some((extension) => name.endsWith(extension))) {
    return "Use um arquivo PDF, JPG, PNG, Word (.docx) ou Excel (.xlsx).";
  }

  if (file.size > MAX_FILE_BYTES) {
    return `O arquivo tem ${formatFileSize(file.size)}. O limite é 20 MB.`;
  }

  if (file.size === 0) {
    return "O arquivo está vazio. Escolha outro.";
  }

  return "";
}

// Title suggestion from the file name: "balancete_setembro.pdf" → "balancete setembro".
export function titleFromFileName(fileName: string) {
  return fileName.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim().slice(0, TITLE_MAX);
}
