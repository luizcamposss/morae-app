import { apiRequest } from "../../shared/lib/api/apiClient";
import type { CreateNewsRequest, NewsResponse, UpdateNewsRequest } from "./types";

export async function getPlatformNews(): Promise<NewsResponse[]> {
  return apiRequest<NewsResponse[]>("/api/news/platform", {
    auth: true,
  });
}

export async function getNewsByCondominium(
  condominiumId: number,
): Promise<NewsResponse[]> {
  return apiRequest<NewsResponse[]>(`/api/condominiums/${condominiumId}/news`, {
    auth: true,
  });
}

export async function createNews(data: CreateNewsRequest): Promise<NewsResponse> {
  return apiRequest<NewsResponse>("/api/news", {
    method: "POST",
    body: data,
    auth: true,
  });
}

export async function updateNews(id: number, data: UpdateNewsRequest): Promise<void> {
  await apiRequest<void>(`/api/news/${id}`, {
    method: "PUT",
    body: data,
    auth: true,
  });
}

export async function deleteNews(id: number): Promise<void> {
  await apiRequest<void>(`/api/news/${id}`, {
    method: "DELETE",
    auth: true,
  });
}
