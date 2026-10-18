import { apiDownload, apiRequest } from "../../shared/lib/api/apiClient";
import type { ImportPreview, ImportResult } from "./types";

// Preview and confirm receive the same file: the API keeps nothing between the two calls.
function fileForm(file: File) {
  const form = new FormData();
  form.append("file", file);
  return form;
}

export async function previewImport(condominiumId: number, file: File): Promise<ImportPreview> {
  return apiRequest<ImportPreview>(`/api/condominiums/${condominiumId}/imports/preview`, {
    method: "POST",
    body: fileForm(file),
    auth: true,
  });
}

export async function confirmImport(condominiumId: number, file: File): Promise<ImportResult> {
  return apiRequest<ImportResult>(`/api/condominiums/${condominiumId}/imports/confirm`, {
    method: "POST",
    body: fileForm(file),
    auth: true,
  });
}

export async function downloadImportTemplate(condominiumId: number, format: "csv" | "xlsx"): Promise<void> {
  await apiDownload(`/api/condominiums/${condominiumId}/imports/template?format=${format}`, `modelo-importacao-morae.${format}`);
}
