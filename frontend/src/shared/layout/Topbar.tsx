import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { svgIcone } from "@edusites/icons/core";
import { useAuth } from "../../app/providers/useAuth";
import {
  clearNotifications,
  getNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from "../../features/notifications/notificationService";
import type { NotificationResponse, NotificationType } from "../../features/notifications/types";
import logoMorae from "../../assets/logo-morae.svg";

type NotificationTab = "all" | "unread";

export function Topbar() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<NotificationTab>("all");
  const [notifications, setNotifications] = useState<NotificationResponse[]>([]);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false);
  const [notificationsError, setNotificationsError] = useState("");
  const notificationsRef = useRef<HTMLDivElement | null>(null);

  const displayName = user?.personName || user?.userName || "Usuário";
  const avatarLetter = displayName.charAt(0).toUpperCase();
  const unreadCount = notifications.filter((notification) => !notification.isRead).length;
  const visibleNotifications =
    activeTab === "unread"
      ? notifications.filter((notification) => !notification.isRead)
      : notifications;

  async function loadNotifications() {
    if (!user) return;

    try {
      setIsLoadingNotifications(true);
      setNotificationsError("");
      setNotifications(await getNotifications());
    } catch (error) {
      setNotifications([]);
      setNotificationsError(
        error instanceof Error
          ? error.message
          : "Não foi possível carregar as notificações.",
      );
    } finally {
      setIsLoadingNotifications(false);
    }
  }

  useEffect(() => {
    void loadNotifications();
  }, [user?.userId]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!notificationsRef.current?.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, []);

  async function handleNotificationClick(notification: NotificationResponse) {
    if (!notification.isRead) {
      try {
        const updatedNotification = await markNotificationAsRead(notification.id);

        setNotifications((current) =>
          current.map((item) =>
            item.id === updatedNotification.id ? updatedNotification : item,
          ),
        );
      } catch {
        setNotifications((current) =>
          current.map((item) =>
            item.id === notification.id
              ? { ...item, isRead: true, readAt: new Date().toISOString() }
              : item,
          ),
        );
      }
    }

    if (notification.linkUrl) {
      setIsNotificationsOpen(false);
      navigate(notification.linkUrl);
    }
  }

  async function handleMarkAllAsRead() {
    try {
      await markAllNotificationsAsRead();
      setNotifications((current) =>
        current.map((notification) => ({
          ...notification,
          isRead: true,
          readAt: notification.readAt ?? new Date().toISOString(),
        })),
      );
    } catch (error) {
      setNotificationsError(
        error instanceof Error
          ? error.message
          : "Não foi possível marcar as notificações como lidas.",
      );
    }
  }

  async function handleClearAll() {
    try {
      await clearNotifications();
      setNotifications([]);
      setActiveTab("all");
    } catch (error) {
      setNotificationsError(
        error instanceof Error
          ? error.message
          : "Não foi possível limpar as notificações.",
      );
    }
  }

  return (
    <div className="flex h-full items-center justify-between rounded-[1.75rem] border border-[#E5E7EB] bg-white/95 px-5 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex size-12 items-center justify-center">
          <img
            src={logoMorae}
            alt="Logo MORAÊ"
            className="h-10 w-10 object-contain"
          />
        </div>
        <span className="text-lg font-extrabold tracking-wide text-[#0B3D2E]">
          MORAÊ
        </span>
      </div>

      <div className="flex items-center gap-3">
        <div ref={notificationsRef} className="relative">
          <button
            type="button"
            aria-label="Notificações"
            aria-expanded={isNotificationsOpen}
            onClick={() => {
              setIsNotificationsOpen((current) => !current);
              if (!isNotificationsOpen) {
                void loadNotifications();
              }
            }}
            className="relative flex size-9 cursor-pointer items-center justify-center rounded-full bg-[#F3F4F6] text-lg font-bold text-[#6B7280] transition hover:bg-[#DCFCE7] hover:text-[#16A34A]"
          >
            <EduIcon nome="sino" />
            {unreadCount > 0 && (
              <span className="absolute right-1.5 top-1.5 flex size-4 items-center justify-center rounded-full bg-[#16A34A] text-[0.6rem] font-black text-white ring-2 ring-white">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          {isNotificationsOpen && (
            <div className="absolute right-0 top-12 z-50 w-[min(23rem,calc(100vw-2rem))] overflow-hidden rounded-[1.6rem] border border-[#E5E7EB] bg-white shadow-2xl shadow-[#0B3D2E]/15">
              <div className="flex items-center justify-between border-b border-[#E5E7EB] px-5 py-4">
                <div>
                  <h2 className="text-base font-black text-[#111827]">
                    Notificações
                  </h2>
                  <p className="mt-1 text-xs font-bold text-[#6B7280]">
                    {unreadCount > 0
                      ? `${unreadCount} nova${unreadCount > 1 ? "s" : ""}`
                      : "Tudo em dia"}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {notifications.length > 0 && (
                    <button
                      type="button"
                      onClick={() => void handleClearAll()}
                      className="h-9 cursor-pointer rounded-full bg-[#DCFCE7] px-3 text-xs font-black text-[#0B3D2E] transition hover:bg-[#BBF7D0]"
                    >
                      Limpar todas
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setIsNotificationsOpen(false)}
                    className="flex size-9 cursor-pointer items-center justify-center rounded-full bg-[#F3F4F6] text-sm font-black text-[#6B7280] transition hover:bg-[#FDECEC] hover:text-[#B42318]"
                  >
                    ×
                  </button>
                </div>
              </div>

              <div className="bg-[#F9FAFB] p-3">
                <div className="grid grid-cols-2 rounded-2xl bg-[#EEF2F7] p-1">
                  <TabButton
                    label="Todas"
                    isActive={activeTab === "all"}
                    onClick={() => setActiveTab("all")}
                  />
                  <TabButton
                    label="Não lidas"
                    isActive={activeTab === "unread"}
                    onClick={() => setActiveTab("unread")}
                  />
                </div>
              </div>

              <div className="max-h-[24rem] overflow-y-auto px-4 pb-4">
                <div className="flex items-center justify-between px-1 py-3">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-[#9CA3AF]">
                    Recentes
                  </p>

                  {unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={() => void handleMarkAllAsRead()}
                      className="cursor-pointer text-xs font-black text-[#16A34A] transition hover:text-[#0B3D2E]"
                    >
                      Marcar lidas
                    </button>
                  )}
                </div>

                {isLoadingNotifications ? (
                  <NotificationState
                    icon="relogio"
                    title="Carregando notificações"
                    description="Buscando seus alertas mais recentes."
                  />
                ) : notificationsError ? (
                  <NotificationState
                    icon="alerta"
                    title="Não foi possível carregar"
                    description={notificationsError}
                    variant="danger"
                  />
                ) : visibleNotifications.length === 0 ? (
                  <NotificationState
                    icon="check-redondo"
                    title={activeTab === "unread" ? "Nada novo por aqui" : "Tudo em dia"}
                    description={
                      activeTab === "unread"
                        ? "Você não tem notificações não lidas."
                        : "Nenhuma notificação real foi recebida pelo sistema."
                    }
                  />
                ) : (
                  <div className="space-y-2">
                    {visibleNotifications.map((notification) => (
                      <NotificationItem
                        key={notification.id}
                        notification={notification}
                        onClick={() => void handleNotificationClick(notification)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {user?.profilePhotoUrl ? (
          <img
            src={user.profilePhotoUrl}
            alt={`Foto de ${displayName}`}
            className="size-10 rounded-full object-cover shadow-sm shadow-[#16A34A]/20"
          />
        ) : (
          <div className="flex size-10 items-center justify-center rounded-full bg-[#16A34A] text-sm font-extrabold text-white shadow-sm shadow-[#16A34A]/30">
            {avatarLetter}
          </div>
        )}
      </div>
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
      onClick={onClick}
      className={`h-10 cursor-pointer rounded-xl text-sm font-black transition ${
        isActive
          ? "bg-white text-[#111827] shadow-sm"
          : "text-[#6B7280] hover:text-[#0B3D2E]"
      }`}
    >
      {label}
    </button>
  );
}

type NotificationItemProps = {
  notification: NotificationResponse;
  onClick: () => void;
};

function NotificationItem({ notification, onClick }: NotificationItemProps) {
  const meta = getNotificationMeta(notification.type);

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full cursor-pointer gap-3 rounded-2xl border p-3 text-left transition hover:border-[#86EFAC] hover:bg-white ${
        notification.isRead
          ? "border-[#E5E7EB] bg-white"
          : "border-[#BBF7D0] bg-[#F0FDF4]"
      }`}
    >
      <div className={`flex size-10 shrink-0 items-center justify-center rounded-2xl text-lg ${meta.classes}`}>
        <EduIcon nome={meta.icon} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-sm font-black leading-5 text-[#111827]">
            {notification.title}
          </h3>
          {!notification.isRead && (
            <span className="mt-1 size-2 shrink-0 rounded-full bg-[#16A34A]" />
          )}
        </div>
        <p className="mt-1 text-xs font-semibold leading-5 text-[#6B7280]">
          {notification.message}
        </p>
        <p className="mt-2 text-[0.68rem] font-black uppercase tracking-[0.14em] text-[#9CA3AF]">
          {formatNotificationDate(notification.createdAt)}
        </p>
      </div>
    </button>
  );
}

type NotificationStateProps = {
  icon: string;
  title: string;
  description: string;
  variant?: "neutral" | "danger";
};

function NotificationState({
  icon,
  title,
  description,
  variant = "neutral",
}: NotificationStateProps) {
  return (
    <div className="rounded-2xl border border-[#E5E7EB] bg-white p-4 text-center">
      <div
        className={`mx-auto flex size-11 items-center justify-center rounded-2xl text-xl ${
          variant === "danger"
            ? "bg-[#FDECEC] text-[#EF4444]"
            : "bg-[#DCFCE7] text-[#16A34A]"
        }`}
      >
        <EduIcon nome={icon} />
      </div>
      <h3 className="mt-3 text-sm font-black text-[#111827]">{title}</h3>
      <p className="mt-1 text-xs font-semibold leading-5 text-[#6B7280]">
        {description}
      </p>
    </div>
  );
}

function EduIcon({ nome }: { nome: string }) {
  const [svg, setSvg] = useState<string | null>(() =>
    svgIcone({
      nome,
      cor: "currentColor",
      tamanho: "1em",
    }) ?? null,
  );

  useEffect(() => {
    let isMounted = true;

    async function loadIcon() {
      const icons = await import("@edusites/icons/core");
      const loadedSvg = await (icons as typeof icons & {
        svgIconeAsync?: (options: {
          nome: string;
          cor: string;
          tamanho: string;
        }) => Promise<string | null | undefined>;
      }).svgIconeAsync?.({
        nome,
        cor: "currentColor",
        tamanho: "1em",
      });

      if (isMounted) {
        setSvg(loadedSvg ?? null);
      }
    }

    if (!svg) {
      void loadIcon();
    }

    return () => {
      isMounted = false;
    };
  }, [nome, svg]);

  if (!svg) {
    return <span aria-hidden="true" className="inline-flex size-[1em]" />;
  }

  return (
    <span
      aria-hidden="true"
      className="inline-flex leading-none"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

function getNotificationMeta(type: NotificationType) {
  const baseClasses = "bg-[#DCFCE7] text-[#16A34A]";

  const map: Record<NotificationType, { icon: string; classes: string }> = {
    System: { icon: "sino", classes: baseClasses },
    Invitation: { icon: "envelope-2", classes: baseClasses },
    Charge: { icon: "boleto", classes: "bg-[#FEF3C7] text-[#D97706]" },
    Payment: { icon: "check-redondo", classes: baseClasses },
    Access: { icon: "check-escudo", classes: baseClasses },
    News: { icon: "avisos", classes: baseClasses },
    Occurrence: { icon: "alerta", classes: "bg-[#FDECEC] text-[#EF4444]" },
  };

  return map[type] ?? { icon: "sino", classes: baseClasses };
}

function formatNotificationDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
