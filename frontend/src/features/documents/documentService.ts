import { apiDownload, apiRequest } from "../../shared/lib/api/apiClient";
import type { CreateDocumentRequest, DocumentDetailsRequest, DocumentResponse } from "./types";

export async function getDocuments(condominiumId: number): Promise<DocumentResponse[]> {
  return apiRequest<DocumentResponse[]>(`/api/condominiums/${condominiumId}/documents`, {
    auth: true,
  });
}

export async function createDocument(condominiumId: number, data: CreateDocumentRequest): Promise<DocumentResponse> {
  const form = new FormData();
  form.append("file", data.file);
  form.append("title", data.title);
  form.append("description", data.description ?? "");
  form.append("category", String(data.category));
  form.append("visibility", String(data.visibility));

  return apiRequest<DocumentResponse>(`/api/condominiums/${condominiumId}/documents`, {
    method: "POST",
    body: form,
    auth: true,
  });
}

export async function updateDocument(id: number, data: DocumentDetailsRequest): Promise<DocumentResponse> {
  return apiRequest<DocumentResponse>(`/api/documents/${id}`, {
    method: "PUT",
    body: data,
    auth: true,
  });
}

export async function deleteDocument(id: number): Promise<void> {
  await apiRequest<void>(`/api/documents/${id}`, {
    method: "DELETE",
    auth: true,
  });
}

export async function downloadDocument(document: Pick<DocumentResponse, "id" | "fileName">): Promise<void> {
  await apiDownload(`/api/documents/${document.id}/download`, document.fileName);
}
