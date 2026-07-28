import { useEffect, useRef, useState } from "react";
import { svgIcone } from "@edusites/icons/core";
import { useAuth } from "../../app/providers/useAuth";
import { getNotificationPreferences } from "../../features/me/meService";
import type { NotificationPreferences } from "../../features/me/types";

type NotificationTab = "all" | "system";

export function Topbar() {
  const { user } = useAuth();
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<NotificationTab>("all");
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [isLoadingPreferences, setIsLoadingPreferences] = useState(false);
  const [preferencesError, setPreferencesError] = useState("");
  const [areNotificationsCleared, setAreNotificationsCleared] = useState(false);
  const notificationsRef = useRef<HTMLDivElement | null>(null);

  const displayName = user?.personName || user?.userName || "Usuário";
  const avatarLetter = displayName.charAt(0).toUpperCase();
  const hasSystemPreferences =
    !!preferences &&
    (preferences.noticesEnabled ||
      preferences.billsEnabled ||
      preferences.unitUpdatesEnabled);
  const shouldShowSystemNotifications =
    hasSystemPreferences && !areNotificationsCleared;

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

  useEffect(() => {
    if (!isNotificationsOpen || preferences) return;

    async function loadPreferences() {
      try {
        setIsLoadingPreferences(true);
        setPreferencesError("");
        setPreferences(await getNotificationPreferences());
      } catch (error) {
        setPreferencesError(
          error instanceof Error
            ? error.message
            : "Não foi possível carregar as notificações.",
        );
      } finally {
        setIsLoadingPreferences(false);
      }
    }

    void loadPreferences();
  }, [isNotificationsOpen, preferences]);

  return (
    <div className="flex h-full items-center justify-between rounded-[1.75rem] border border-[#E5E7EB] bg-white/95 px-5 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex size-9 items-center justify-center rounded-xl bg-[#0B3D2E] text-sm font-black text-white">
          M
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
            onClick={() => setIsNotificationsOpen((current) => !current)}
            className="relative flex size-9 cursor-pointer items-center justify-center rounded-full bg-[#F3F4F6] text-lg font-bold text-[#6B7280] transition hover:bg-[#DCFCE7] hover:text-[#16A34A]"
          >
            <EduIcon nome="sino" />
            {shouldShowSystemNotifications && (
              <span className="absolute right-2 top-2 size-2 rounded-full bg-[#16A34A] ring-2 ring-[#F3F4F6]" />
            )}
          </button>

          {isNotificationsOpen && (
            <div className="absolute right-0 top-12 z-50 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-[1.6rem] border border-[#E5E7EB] bg-white shadow-2xl shadow-[#0B3D2E]/15">
              <div className="flex items-center justify-between border-b border-[#E5E7EB] px-5 py-4">
                <div>
                  <h2 className="text-base font-black text-[#111827]">
                    Notificações
                  </h2>
                  <p className="mt-1 text-xs font-bold text-[#6B7280]">
                    Central do sistema
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {shouldShowSystemNotifications && (
                    <button
                      type="button"
                      onClick={() => setAreNotificationsCleared(true)}
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
                    label="Sistema"
                    isActive={activeTab === "system"}
                    onClick={() => setActiveTab("system")}
                  />
                </div>
              </div>

              <div className="max-h-[24rem] overflow-y-auto px-4 pb-4">
                {isLoadingPreferences ? (
                  <NotificationState
                    icon="relogio"
                    title="Carregando notificações"
                    description="Buscando suas preferências no backend."
                  />
                ) : preferencesError ? (
                  <NotificationState
                    icon="alerta"
                    title="Não foi possível carregar"
                    description={preferencesError}
                    variant="danger"
                  />
                ) : (
                  <>
                    <p className="px-1 py-3 text-xs font-black uppercase tracking-[0.18em] text-[#9CA3AF]">
                      Hoje
                    </p>

                    {shouldShowSystemNotifications ? (
                      <div className="space-y-2">
                        {preferences?.noticesEnabled && (
                          <NotificationItem
                            icon="envelope-2"
                            title="Avisos do condomínio ativados"
                            description="Você receberá destaque para novos comunicados."
                          />
                        )}
                        {preferences?.billsEnabled && (
                          <NotificationItem
                            icon="boleto"
                            title="Lembretes de boletos ativados"
                            description="Você receberá avisos sobre cobranças em aberto."
                          />
                        )}
                        {preferences?.unitUpdatesEnabled && (
                          <NotificationItem
                            icon="apartamento"
                            title="Atualizações da unidade ativadas"
                            description="Você receberá avisos relacionados às suas unidades."
                          />
                        )}
                      </div>
                    ) : (
                      <NotificationState
                        icon="sino"
                        title={
                          areNotificationsCleared
                            ? "Notificações limpas"
                            : "Nenhuma notificação ativa"
                        }
                        description={
                          areNotificationsCleared
                            ? "Você limpou todas as notificações desta visualização."
                            : "Ative preferências em Configurações para receber alertas do sistema."
                        }
                      />
                    )}

                    <p className="px-1 py-3 text-xs font-black uppercase tracking-[0.18em] text-[#9CA3AF]">
                      Histórico
                    </p>
                    <NotificationState
                      icon="check-redondo"
                      title="Tudo em dia"
                      description="Nenhuma nova notificação real foi recebida pelo sistema."
                    />
                  </>
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
  icon: string;
  title: string;
  description: string;
};

function NotificationItem({ icon, title, description }: NotificationItemProps) {
  return (
    <article className="flex gap-3 rounded-2xl border border-[#E5E7EB] bg-white p-3">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-[#DCFCE7] text-lg text-[#16A34A]">
        <EduIcon nome={icon} />
      </div>
      <div>
        <h3 className="text-sm font-black leading-5 text-[#111827]">{title}</h3>
        <p className="mt-1 text-xs font-semibold leading-5 text-[#6B7280]">
          {description}
        </p>
      </div>
    </article>
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
