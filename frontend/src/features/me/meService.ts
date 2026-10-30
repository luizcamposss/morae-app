import { apiRequest } from "../../shared/lib/api/apiClient";
import type {
  MeCondominiumResponse,
  MeResponse,
  MeUnitResponse,
  NotificationPreferences,
  UpdateMyProfileRequest,
} from "./types";

export async function getMe(): Promise<MeResponse> {
  return apiRequest<MeResponse>("/api/me", {
    auth: true,
  });
}

export async function updateProfilePhoto(profilePhotoUrl: string | null): Promise<MeResponse> {
  return apiRequest<MeResponse>("/api/me/profile-photo", {
    method: "PUT",
    body: { profilePhotoUrl },
    auth: true,
  });
}

export async function updateMyProfile(data: UpdateMyProfileRequest): Promise<MeResponse> {
  return apiRequest<MeResponse>("/api/me/profile", {
    method: "PUT",
    body: data,
    auth: true,
  });
}

export async function getNotificationPreferences(): Promise<NotificationPreferences> {
  return apiRequest<NotificationPreferences>("/api/me/notification-preferences", {
    auth: true,
  });
}

export async function updateNotificationPreferences(
  data: NotificationPreferences,
): Promise<NotificationPreferences> {
  return apiRequest<NotificationPreferences>("/api/me/notification-preferences", {
    method: "PUT",
    body: data,
    auth: true,
  });
}

export async function getMyCondominiums(): Promise<MeCondominiumResponse[]> {
  return apiRequest<MeCondominiumResponse[]>("/api/me/condominiums", {
    auth: true,
  });
}

export async function getMyUnits(): Promise<MeUnitResponse[]> {
  return apiRequest<MeUnitResponse[]>("/api/me/units", {
    auth: true,
  });
}
