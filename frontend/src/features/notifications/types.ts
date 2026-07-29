export type NotificationType =
  | "System"
  | "Invitation"
  | "Charge"
  | "Payment"
  | "Access"
  | "News"
  | "Occurrence";

export type NotificationResponse = {
  id: number;
  type: NotificationType;
  title: string;
  message: string;
  linkUrl?: string | null;
  createdAt: string;
  readAt?: string | null;
  isRead: boolean;
};
