import { apiRequest } from "../../shared/lib/api/apiClient";
import type { NotificationResponse } from "./types";

export async function getNotifications(): Promise<NotificationResponse[]> {
  return apiRequest<NotificationResponse[]>("/api/notifications", {
    auth: true,
  });
}

export async function markNotificationAsRead(
  notificationId: number,
): Promise<NotificationResponse> {
  return apiRequest<NotificationResponse>(`/api/notifications/${notificationId}/read`, {
    method: "PATCH",
    auth: true,
  });
}

export async function markAllNotificationsAsRead(): Promise<void> {
  return apiRequest<void>("/api/notifications/read-all", {
    method: "PATCH",
    auth: true,
  });
}

export async function clearNotifications(): Promise<void> {
  return apiRequest<void>("/api/notifications/clear", {
    method: "DELETE",
    auth: true,
  });
}
