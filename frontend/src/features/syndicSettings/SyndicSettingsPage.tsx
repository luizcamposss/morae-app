import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { svgIcone } from "@edusites/icons/core";
import { useAuth } from "../../app/providers/useAuth";
import { useCondominium } from "../../app/providers/useCondominium";
import {
  getNotificationPreferences,
  updateMyProfile,
  updateNotificationPreferences,
} from "../me/meService";
import type { NotificationPreferences } from "../me/types";
import { ProfilePhotoBlock } from "../profile/ProfilePhotoBlock";

type ModalType = "profile" | "notifications" | null;

const defaultNotificationPreferences: NotificationPreferences = {
  noticesEnabled: true,
  billsEnabled: true,
  unitUpdatesEnabled: true,
};

export function SyndicSettingsPage() {
  const { user, refreshUser } = useAuth();
  const { activeCondominium } = useCondominium();
  const [modal, setModal] = useState<ModalType>(null);

  return (
    <>
      <section className="rounded-[2rem] border border-[#E5E7EB] bg-white p-5 shadow-sm sm:p-6 lg:p-7">
        <div className="border-b border-[#E5E7EB] pb-6">
          <p className="text-xs font-black uppercase tracking-[0.38em] text-[#16A34A]">
            Preferências
          </p>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-[#111827] sm:text-4xl">
            Configurações
          </h1>
          <p className="mt-2 text-sm font-semibold text-[#6B7280]">
            Ajuste seus dados de síndico no MORAÊ.
          </p>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-2">
          <SettingsBlock
            icon="usuario"
            title="Perfil e dados pessoais"
            description="Foto, nome, telefone, e-mail e condomínio vinculado."
            action="Editar perfil"
            onClick={() => setModal("profile")}
          />

          <SettingsBlock
            icon="sino"
            title="Notificações"
            description="Preferências de comunicados, cobranças e atualizações."
            action="Configurar"
            onClick={() => setModal("notifications")}
          />
        </div>
      </section>

      {modal === "profile" && user && (
        <ProfileDataModal
          userName={user.personName}
          email={user.email}
          phoneNumber={user.phoneNumber ?? ""}
          condominiumName={activeCondominium?.condominiumName ?? "Nenhum condomínio ativo"}
          onClose={() => setModal(null)}
          onSaved={async () => {
            await refreshUser();
          }}
        />
      )}

      {modal === "notifications" && <NotificationsModal onClose={() => setModal(null)} />}
    </>
  );
}

type SettingsBlockProps = {
  icon: string;
  title: string;
  description: string;
  action: string;
  onClick: () => void;
};

function SettingsBlock({ icon, title, description, action, onClick }: SettingsBlockProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group min-h-52 cursor-pointer rounded-[1.7rem] border border-[#E5E7EB] bg-[#F9FAFB] p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-[#86EFAC] hover:bg-white hover:shadow-xl hover:shadow-[#0B3D2E]/8"
    >
      <div className="flex size-12 items-center justify-center rounded-2xl bg-[#DCFCE7] text-2xl text-[#16A34A] transition group-hover:bg-[#16A34A] group-hover:text-white">
        <EduIcon nome={icon} />
      </div>

      <h2 className="mt-7 text-2xl font-black text-[#111827]">{title}</h2>
      <p className="mt-3 min-h-12 text-sm font-semibold leading-6 text-[#6B7280]">
        {description}
      </p>

      <span className="mt-6 inline-flex items-center gap-2 text-sm font-black text-[#16A34A]">
        {action}
        <span className="transition group-hover:translate-x-1">→</span>
      </span>
    </button>
  );
}

type ModalProps = {
  onClose: () => void;
};

function ModalShell({
  title,
  children,
  onClose,
}: ModalProps & { title: string; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0B3D2E]/30 px-4 py-8 backdrop-blur-sm">
      <div className="max-h-[calc(100vh-4rem)] w-full max-w-3xl overflow-y-auto rounded-[2rem] border border-[#E5E7EB] bg-white shadow-2xl shadow-[#0B3D2E]/20">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#E5E7EB] bg-white px-6 py-5">
          <h2 className="text-2xl font-black text-[#111827]">{title}</h2>

          <button
            type="button"
            onClick={onClose}
            className="flex size-10 cursor-pointer items-center justify-center rounded-full bg-[#F3F4F6] text-xl font-light text-[#6B7280] transition hover:bg-[#FDECEC] hover:text-[#B42318]"
          >
            ×
          </button>
        </div>

        <div className="px-5 py-6 sm:px-8">{children}</div>
      </div>
    </div>
  );
}

function ProfileDataModal({
  userName,
  email,
  phoneNumber,
  condominiumName,
  onClose,
  onSaved,
}: ModalProps & {
  userName: string;
  email: string;
  phoneNumber: string;
  condominiumName: string;
  onSaved: () => Promise<void>;
}) {
  const [form, setForm] = useState({
    name: userName,
    phoneNumber,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const phoneDigits = onlyDigits(form.phoneNumber);

    if (form.name.trim().length < 2) {
      setErrorMessage("Informe um nome com pelo menos 2 caracteres.");
      return;
    }

    if (phoneDigits.length < 10) {
      setErrorMessage("Informe um telefone válido com DDD.");
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage("");
      setSuccessMessage("");

      await updateMyProfile({
        name: form.name.trim(),
        phoneNumber: phoneDigits,
      });
      await onSaved();

      setSuccessMessage("Dados pessoais atualizados.");
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível atualizar seus dados.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <ModalShell title="Perfil e dados pessoais" onClose={onClose}>
      <div className="space-y-6">
        <ProfilePhotoBlock />

        <form onSubmit={(event) => void handleSubmit(event)} className="space-y-6">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <TextField
              label="Nome"
              value={form.name}
              onChange={(value) => setForm((current) => ({ ...current, name: value }))}
            />
            <TextField
              label="Telefone"
              value={form.phoneNumber}
              onChange={(value) =>
                setForm((current) => ({ ...current, phoneNumber: value }))
              }
            />
            <TextField label="E-mail" value={email} disabled />
            <TextField label="Condomínio" value={condominiumName} disabled />
          </div>

          {(errorMessage || successMessage) && (
            <p
              className={`rounded-2xl border px-4 py-3 text-sm font-bold ${
                errorMessage
                  ? "border-[#FECACA] bg-[#FDECEC] text-[#B42318]"
                  : "border-[#BBF7D0] bg-[#DCFCE7] text-[#0B3D2E]"
              }`}
            >
              {errorMessage || successMessage}
            </p>
          )}

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="h-12 cursor-pointer rounded-2xl border border-[#E5E7EB] bg-white px-5 text-sm font-black text-[#6B7280] transition hover:bg-[#F3F4F6]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="h-12 cursor-pointer rounded-2xl bg-[#16A34A] px-6 text-sm font-black text-white shadow-sm shadow-[#16A34A]/25 transition hover:bg-[#0B3D2E] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting ? "Salvando..." : "Salvar alterações"}
            </button>
          </div>
        </form>
      </div>
    </ModalShell>
  );
}

function NotificationsModal({ onClose }: ModalProps) {
  const [preferences, setPreferences] = useState<NotificationPreferences>(
    defaultNotificationPreferences,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    async function loadPreferences() {
      try {
        setIsLoading(true);
        setErrorMessage("");
        setPreferences(await getNotificationPreferences());
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Não foi possível carregar suas preferências.",
        );
      } finally {
        setIsLoading(false);
      }
    }

    void loadPreferences();
  }, []);

  function updatePreference(key: keyof NotificationPreferences) {
    setSuccessMessage("");
    setPreferences((current) => ({
      ...current,
      [key]: !current[key],
    }));
  }

  async function handleSave() {
    try {
      setIsSubmitting(true);
      setErrorMessage("");
      setSuccessMessage("");

      const result = await updateNotificationPreferences(preferences);
      setPreferences(result);
      setSuccessMessage("Preferências de notificação atualizadas.");
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível salvar suas preferências.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <ModalShell title="Notificações" onClose={onClose}>
      <div className="space-y-4">
        {isLoading ? (
          <div className="rounded-[1.5rem] border border-[#E5E7EB] bg-[#F9FAFB] p-5 text-sm font-bold text-[#6B7280]">
            Carregando preferências...
          </div>
        ) : (
          <>
            <ToggleRow
              label="Comunicados do condomínio"
              description="Receber destaque para novos avisos publicados."
              checked={preferences.noticesEnabled}
              onChange={() => updatePreference("noticesEnabled")}
            />
            <ToggleRow
              label="Lembretes financeiros"
              description="Exibir lembretes sobre cobranças em aberto."
              checked={preferences.billsEnabled}
              onChange={() => updatePreference("billsEnabled")}
            />
            <ToggleRow
              label="Atualizações operacionais"
              description="Receber alertas ligados às unidades e ocorrências."
              checked={preferences.unitUpdatesEnabled}
              onChange={() => updatePreference("unitUpdatesEnabled")}
            />
          </>
        )}

        {(errorMessage || successMessage) && (
          <p
            className={`rounded-2xl border px-4 py-3 text-sm font-bold ${
              errorMessage
                ? "border-[#FECACA] bg-[#FDECEC] text-[#B42318]"
                : "border-[#BBF7D0] bg-[#DCFCE7] text-[#0B3D2E]"
            }`}
          >
            {errorMessage || successMessage}
          </p>
        )}

        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={isLoading || isSubmitting}
            className="h-12 cursor-pointer rounded-2xl bg-[#16A34A] px-6 text-sm font-black text-white shadow-sm shadow-[#16A34A]/25 transition hover:bg-[#0B3D2E] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting ? "Salvando..." : "Salvar preferências"}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

type TextFieldProps = {
  label: string;
  value: string;
  disabled?: boolean;
  onChange?: (value: string) => void;
};

function TextField({ label, value, disabled = false, onChange }: TextFieldProps) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-black text-[#111827]">{label}</span>
      <input
        value={value}
        disabled={disabled}
        onChange={(event) => onChange?.(event.target.value)}
        className="h-12 w-full rounded-2xl border border-[#E5E7EB] bg-white px-4 text-sm font-bold text-[#111827] outline-none transition focus:border-[#22C55E] focus:ring-4 focus:ring-[#86EFAC]/30 disabled:bg-[#F3F4F6] disabled:text-[#6B7280]"
      />
    </label>
  );
}

type ToggleRowProps = {
  label: string;
  description: string;
  checked: boolean;
  onChange: () => void;
};

function ToggleRow({ label, description, checked, onChange }: ToggleRowProps) {
  return (
    <button
      type="button"
      onClick={onChange}
      className="flex w-full cursor-pointer items-center justify-between gap-4 rounded-[1.5rem] border border-[#E5E7EB] bg-[#F9FAFB] p-5 text-left transition hover:border-[#86EFAC] hover:bg-white"
    >
      <span>
        <span className="block text-base font-black text-[#111827]">{label}</span>
        <span className="mt-1 block text-sm font-semibold leading-6 text-[#6B7280]">
          {description}
        </span>
      </span>

      <span
        className={`flex h-8 w-14 shrink-0 items-center rounded-full p-1 transition ${
          checked ? "bg-[#16A34A]" : "bg-[#E5E7EB]"
        }`}
      >
        <span
          className={`size-6 rounded-full bg-white shadow-sm transition ${
            checked ? "translate-x-6" : "translate-x-0"
          }`}
        />
      </span>
    </button>
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

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}
