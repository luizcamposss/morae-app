import { apiRequest } from "../../shared/lib/api/apiClient";
import type { AssemblyResponse, AssemblyResults, CastVotesRequest, MyBallot, SaveAssemblyRequest } from "./types";

export async function getAssemblies(condominiumId: number): Promise<AssemblyResponse[]> {
  return apiRequest<AssemblyResponse[]>(`/api/condominiums/${condominiumId}/assemblies`, { auth: true });
}

export async function getAssembly(id: number): Promise<AssemblyResponse> {
  return apiRequest<AssemblyResponse>(`/api/assemblies/${id}`, { auth: true });
}

export async function createAssembly(condominiumId: number, data: SaveAssemblyRequest): Promise<AssemblyResponse> {
  return apiRequest<AssemblyResponse>(`/api/condominiums/${condominiumId}/assemblies`, { method: "POST", body: data, auth: true });
}

export async function updateAssembly(id: number, data: SaveAssemblyRequest): Promise<AssemblyResponse> {
  return apiRequest<AssemblyResponse>(`/api/assemblies/${id}`, { method: "PUT", body: data, auth: true });
}

export async function deleteAssembly(id: number): Promise<void> {
  await apiRequest<void>(`/api/assemblies/${id}`, { method: "DELETE", auth: true });
}

export async function publishAssembly(id: number): Promise<AssemblyResponse> {
  return apiRequest<AssemblyResponse>(`/api/assemblies/${id}/publish`, { method: "POST", auth: true });
}

export async function cancelAssembly(id: number, reason: string): Promise<AssemblyResponse> {
  return apiRequest<AssemblyResponse>(`/api/assemblies/${id}/cancel`, { method: "POST", body: { reason }, auth: true });
}

export async function getAssemblyResults(id: number): Promise<AssemblyResults> {
  return apiRequest<AssemblyResults>(`/api/assemblies/${id}/results`, { auth: true });
}

// Null removes the link.
export async function setAssemblyMinutes(id: number, documentId: number | null): Promise<AssemblyResponse> {
  return apiRequest<AssemblyResponse>(`/api/assemblies/${id}/minutes`, { method: "PUT", body: { documentId }, auth: true });
}

// The units the user can vote for and their current votes.
export async function getMyBallot(id: number): Promise<MyBallot> {
  return apiRequest<MyBallot>(`/api/assemblies/${id}/my-ballot`, { auth: true });
}

// Votes (or changes the votes) of one unit; returns the updated ballot.
export async function castVotes(id: number, data: CastVotesRequest): Promise<MyBallot> {
  return apiRequest<MyBallot>(`/api/assemblies/${id}/votes`, { method: "PUT", body: data, auth: true });
}
