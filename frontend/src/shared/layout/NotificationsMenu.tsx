import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  CircleCheck,
  Mail,
  Megaphone,
  Receipt,
  ShieldCheck,
  TriangleAlert,
  X,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "../../app/providers/useAuth";
import {
  clearNotifications,
  getNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from "../../features/notifications/notificationService";
import type { NotificationResponse, NotificationType } from "../../features/notifications/types";
import { formatDateTime } from "../lib/date";

type NotificationTab = "all" | "unread";

const notificationMeta: Record<NotificationType, { icon: LucideIcon; tone: string }> = {
  System: { icon: Bell, tone: "bg-verde-suave text-verde-tinta" },
  Invitation: { icon: Mail, tone: "bg-verde-suave text-verde-tinta" },
  Charge: { icon: Receipt, tone: "bg-ambar-suave text-ambar" },
  Payment: { icon: CircleCheck, tone: "bg-verde-suave text-verde-tinta" },
  Access: { icon: ShieldCheck, tone: "bg-verde-suave text-verde-tinta" },
  News: { icon: Megaphone, tone: "bg-verde-suave text-verde-tinta" },
  Occurrence: { icon: TriangleAlert, tone: "bg-vermelho-suave text-vermelho" },
};

export function NotificationsMenu() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<NotificationTab>("all");
  const [notifications, setNotifications] = useState<NotificationResponse[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const menuRef = useRef<HTMLDivElement | null>(null);

  const unreadCount = notifications.filter((notification) => !notification.isRead).length;
  const visibleNotifications =
    activeTab === "unread" ? notifications.filter((notification) => !notification.isRead) : notifications;

  async function loadNotifications() {
    try {
      setIsLoading(true);
      setErrorMessage("");
      setNotifications(await getNotifications());
    } catch (error) {
      setNotifications([]);
      setErrorMessage(error instanceof Error ? error.message : "Não foi possível carregar as notificações.");
    } finally {
      setIsLoading(false);
    }
  }

  // First load for the unread badge; opening the menu refreshes the list.
  useEffect(() => {
    if (!user?.userId) {
      return;
    }

    let isMounted = true;

    getNotifications()
      .then((items) => isMounted && setNotifications(items))
      .catch(() => isMounted && setNotifications([]));

    return () => {
      isMounted = false;
    };
  }, [user?.userId]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  function handleToggle() {
    if (!isOpen) {
      void loadNotifications();
    }

    setIsOpen((current) => !current);
  }

  async function handleNotificationClick(notification: NotificationResponse) {
    if (!notification.isRead) {
      try {
        const updated = await markNotificationAsRead(notification.id);
        setNotifications((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      } catch {
        setNotifications((current) =>
          current.map((item) =>
            item.id === notification.id ? { ...item, isRead: true, readAt: new Date().toISOString() } : item,
          ),
        );
      }
    }

    if (notification.linkUrl) {
      setIsOpen(false);
      navigate(notification.linkUrl);
    }
  }

  async function handleMarkAllAsRead() {
    try {
      await markAllNotificationsAsRead();
      setNotifications((current) =>
        current.map((item) => ({ ...item, isRead: true, readAt: item.readAt ?? new Date().toISOString() })),
      );
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Não foi possível marcar as notificações como lidas.");
    }
  }

  async function handleClearAll() {
    try {
      await clearNotifications();
      setNotifications([]);
      setActiveTab("all");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Não foi possível limpar as notificações.");
    }
  }

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={handleToggle}
        aria-label={unreadCount > 0 ? `Notificações, ${unreadCount} não lidas` : "Notificações"}
        aria-expanded={isOpen}
        className="relative grid size-10 place-items-center rounded-full bg-superficie text-tinta shadow-whisper transition-colors duration-150 hover:bg-campo"
      >
        <Bell size={18} strokeWidth={1.7} aria-hidden />
        {unreadCount > 0 && (
          <span className="absolute right-2 top-2 size-2 rounded-full bg-verde ring-2 ring-superficie" aria-hidden />
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-12 z-50 w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-card bg-superficie shadow-window">
          <div className="flex items-start justify-between gap-3 px-5 pb-3 pt-5">
            <div>
              <h2 className="font-display text-xl font-bold tracking-[-0.01em] text-tinta">Notificações</h2>
              <p className="mt-0.5 text-[13px] text-tinta-suave">
                {unreadCount > 0 ? `${unreadCount} não lida${unreadCount > 1 ? "s" : ""}` : "Tudo lido"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label="Fechar notificações"
              className="grid size-8 place-items-center rounded-full text-tinta-suave transition-colors hover:bg-campo hover:text-tinta"
            >
              <X size={16} strokeWidth={1.8} aria-hidden />
            </button>
          </div>

          <div className="flex items-center justify-between gap-3 border-b border-linha px-5 pb-3">
            <div className="flex rounded-full bg-campo p-0.5" role="tablist" aria-label="Filtrar notificações">
              <TabButton label="Todas" isActive={activeTab === "all"} onClick={() => setActiveTab("all")} />
              <TabButton label="Não lidas" isActive={activeTab === "unread"} onClick={() => setActiveTab("unread")} />
            </div>
            <div className="flex items-center gap-3 text-[13px] font-semibold">
              {unreadCount > 0 && (
                <button type="button" onClick={() => void handleMarkAllAsRead()} className="text-verde hover:text-verde-forte">
                  Marcar lidas
                </button>
              )}
              {notifications.length > 0 && (
                <button type="button" onClick={() => void handleClearAll()} className="text-tinta-suave hover:text-vermelho">
                  Limpar
                </button>
              )}
            </div>
          </div>

          <div className="max-h-[26rem] overflow-y-auto">
            {isLoading && notifications.length === 0 ? (
              <EmptyState title="Carregando…" description="Buscando suas notificações." />
            ) : errorMessage ? (
              <EmptyState title="Não foi possível carregar" description={errorMessage} />
            ) : visibleNotifications.length === 0 ? (
              <EmptyState
                title={activeTab === "unread" ? "Nada novo por aqui" : "Nenhuma notificação"}
                description={
                  activeTab === "unread"
                    ? "Você já leu todas as notificações."
                    : "Avisos, cobranças e convites aparecem aqui."
                }
              />
            ) : (
              <ul className="divide-y divide-linha">
                {visibleNotifications.map((notification) => (
                  <li key={notification.id}>
                    <NotificationItem
                      notification={notification}
                      onClick={() => void handleNotificationClick(notification)}
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

type TabButtonProps = {
  label: string;
  isActive: boolean;
  onClick: () => void;
};

function TabButton({ label, isActive, onClick }: TabButtonProps) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={isActive}
      onClick={onClick}
      className={`rounded-full px-3 py-1 text-[13px] font-semibold transition-colors ${
        isActive ? "bg-superficie text-tinta shadow-whisper" : "text-tinta-suave hover:text-tinta"
      }`}
    >
      {label}
    </button>
  );
}

function NotificationItem({ notification, onClick }: { notification: NotificationResponse; onClick: () => void }) {
  const meta = notificationMeta[notification.type] ?? notificationMeta.System;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full gap-3 px-5 py-3.5 text-left transition-colors hover:bg-campo ${
        notification.isRead ? "" : "bg-verde-suave/40"
      }`}
    >
      <span className={`grid size-9 shrink-0 place-items-center rounded-[9px] ${meta.tone}`}>
        <meta.icon size={17} strokeWidth={1.7} aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-start justify-between gap-3">
          <span className="text-[15px] font-semibold leading-snug text-tinta">{notification.title}</span>
          {!notification.isRead && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-verde" aria-label="Não lida" />}
        </span>
        <span className="mt-0.5 block text-[13px] leading-snug text-tinta-suave">{notification.message}</span>
        <span className="mt-1.5 block text-xs tabular-nums text-tinta-suave/80">
          {formatDateTime(notification.createdAt, "").replace(",", " às")}
        </span>
      </span>
    </button>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="px-5 py-10 text-center">
      <p className="text-[15px] font-semibold text-tinta">{title}</p>
      <p className="mt-1 text-[13px] text-tinta-suave">{description}</p>
    </div>
  );
}
