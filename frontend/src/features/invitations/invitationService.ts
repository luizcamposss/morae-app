import { apiRequest } from "../../shared/lib/api/apiClient";
import type {
  AcceptInvitationRequest,
  CreateInvitationRequest,
  InvitationResponse,
} from "./types";

export async function getInvitationsByCondominium(
  condominiumId: number,
): Promise<InvitationResponse[]> {
  return apiRequest<InvitationResponse[]>(
    `/api/condominiums/${condominiumId}/invitations`,
    { auth: true },
  );
}

export async function createInvitation(
  data: CreateInvitationRequest,
): Promise<InvitationResponse> {
  return apiRequest<InvitationResponse>("/api/invitations", {
    method: "POST",
    body: data,
    auth: true,
  });
}

export async function getInvitationByToken(
  token: string,
): Promise<InvitationResponse> {
  return apiRequest<InvitationResponse>(`/api/invitations/${token}`);
}

export async function acceptInvitation(
  data: AcceptInvitationRequest,
): Promise<void> {
  return apiRequest<void>("/api/invitations/accept", {
    method: "POST",
    body: data,
  });
}
