import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { svgIcone } from "@edusites/icons/core";
import { useAuth } from "../../app/providers/useAuth";
import {
  getNotificationPreferences,
  updateMyProfile,
  updateNotificationPreferences,
} from "../me/meService";
import type { NotificationPreferences } from "../me/types";
import {
  getPlatformFinancialAccount,
  upsertPlatformFinancialAccount,
} from "../financialAccounts/financialAccountService";
import { FinancialAccountForm } from "../financialAccounts/FinancialAccountForm";
import type {
  FinancialAccountResponse,
  UpsertFinancialAccountRequest,
} from "../financialAccounts/types";
import { ProfilePhotoBlock } from "../profile/ProfilePhotoBlock";

type ModalType = "profile" | "notifications" | "financial" | null;

const defaultNotificationPreferences: NotificationPreferences = {
  noticesEnabled: true,
  billsEnabled: true,
  unitUpdatesEnabled: true,
};

export function MasterSettingsPage() {
  const { user, refreshUser } = useAuth();
  const [modal, setModal] = useState<ModalType>(null);
  const [account, setAccount] = useState<FinancialAccountResponse | null>(null);
  const [isLoadingAccount, setIsLoadingAccount] = useState(true);
  const [accountError, setAccountError] = useState("");

  async function loadAccount() {
    try {
      setIsLoadingAccount(true);
      setAccountError("");
      setAccount(await getPlatformFinancialAccount());
    } catch (error) {
      setAccount(null);
      setAccountError(
        error instanceof Error
          ? error.message
          : "Não foi possível carregar a conta recebedora.",
      );
    } finally {
      setIsLoadingAccount(false);
    }
  }

  useEffect(() => {
    void loadAccount();
  }, []);

  const hasBankAccount = Boolean(account?.bankName && account?.agency && account?.accountNumber);
  const hasPixKey = Boolean(account?.pixKey);

  return (
    <>
      <section className="rounded-[2rem] border border-[#E5E7EB] bg-white p-5 shadow-sm sm:p-6 lg:p-7">
        <div className="border-b border-[#E5E7EB] pb-6">
          <h1 className="text-3xl font-black tracking-tight text-[#111827] sm:text-4xl">
            Configurações
          </h1>
          <p className="mt-2 text-sm font-semibold text-[#6B7280]">
            Ajuste seu perfil, notificações e dados de recebimento da plataforma.
          </p>
        </div>

        {accountError && (
          <FeedbackMessage variant="error" message={accountError} />
        )}

        <div className="mt-6 grid grid-cols-1 gap-5 xl:grid-cols-3">
          <SettingsBlock
            icon="usuario"
            title="Perfil e dados pessoais"
            description="Foto, nome, telefone e e-mail do seu perfil Master."
            action="Editar perfil"
            onClick={() => setModal("profile")}
          />

          <SettingsBlock
            icon="sino"
            title="Notificações"
            description="Preferências de avisos e lembretes da sua conta."
            action="Configurar"
            onClick={() => setModal("notifications")}
          />

          <SettingsBlock
            icon="carteira"
            title="Conta recebedora"
            description={getFinancialCardDescription(isLoadingAccount, hasBankAccount, hasPixKey)}
            action="Configurar"
            onClick={() => setModal("financial")}
          />
        </div>
      </section>

      {modal === "profile" && user && (
        <ProfileDataModal
          userName={user.personName}
          email={user.email}
          phoneNumber={user.phoneNumber ?? ""}
          onClose={() => setModal(null)}
          onSaved={async () => {
            await refreshUser();
          }}
        />
      )}

      {modal === "notifications" && <NotificationsModal onClose={() => setModal(null)} />}

      {modal === "financial" && (
        <FinancialAccountModal
          account={account}
          isLoading={isLoadingAccount}
          onClose={() => setModal(null)}
          onSaved={async (result) => {
            setAccount(result);
            await loadAccount();
          }}
        />
      )}
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
      className="group min-h-56 cursor-pointer rounded-[1.7rem] border border-[#E5E7EB] bg-[#F9FAFB] p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-[#86EFAC] hover:bg-white hover:shadow-xl hover:shadow-[#0B3D2E]/8"
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
  onClose,
  onSaved,
}: ModalProps & {
  userName: string;
  email: string;
  phoneNumber: string;
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
          </div>

          {(errorMessage || successMessage) && (
            <FeedbackMessage
              variant={errorMessage ? "error" : "success"}
              message={errorMessage || successMessage}
            />
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
              label="Avisos institucionais"
              description="Receber comunicados importantes da plataforma."
              checked={preferences.noticesEnabled}
              onChange={() => updatePreference("noticesEnabled")}
            />
            <ToggleRow
              label="Lembretes financeiros"
              description="Exibir alertas sobre cobranças e recebimentos."
              checked={preferences.billsEnabled}
              onChange={() => updatePreference("billsEnabled")}
            />
            <ToggleRow
              label="Atualizações de cadastro"
              description="Receber avisos sobre convites, condomínios e acessos."
              checked={preferences.unitUpdatesEnabled}
              onChange={() => updatePreference("unitUpdatesEnabled")}
            />
          </>
        )}

        {(errorMessage || successMessage) && (
          <FeedbackMessage
            variant={errorMessage ? "error" : "success"}
            message={errorMessage || successMessage}
          />
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

function FinancialAccountModal({
  account,
  isLoading,
  onClose,
  onSaved,
}: ModalProps & {
  account: FinancialAccountResponse | null;
  isLoading: boolean;
  onSaved: (account: FinancialAccountResponse) => Promise<void>;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  async function handleSubmit(data: UpsertFinancialAccountRequest) {
    try {
      setIsSubmitting(true);
      setErrorMessage("");
      setSuccessMessage("");

      const result = await upsertPlatformFinancialAccount(data);
      await onSaved(result);
      setSuccessMessage("Conta recebedora atualizada.");
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível salvar os dados financeiros.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <ModalShell title="Conta recebedora" onClose={onClose}>
      <div className="space-y-5">
        <div className="rounded-2xl border border-[#BBF7D0] bg-[#DCFCE7] p-4">
          <p className="text-sm font-extrabold text-[#0B3D2E]">
            Configure a conta bancária e a chave Pix usadas nos recebimentos do MORAÊ.
          </p>
          <p className="mt-2 text-sm font-semibold leading-6 text-[#0D7A3A]">
            Dados internos dos condomínios continuam restritos aos administradores de cada operação.
          </p>
        </div>

        {isLoading ? (
          <div className="rounded-[1.5rem] border border-[#E5E7EB] bg-[#F9FAFB] p-5 text-sm font-bold text-[#6B7280]">
            Carregando dados financeiros...
          </div>
        ) : (
          <FinancialAccountForm
            account={account}
            isSubmitting={isSubmitting}
            onSubmit={handleSubmit}
          />
        )}

        {(errorMessage || successMessage) && (
          <FeedbackMessage
            variant={errorMessage ? "error" : "success"}
            message={errorMessage || successMessage}
          />
        )}
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

function FeedbackMessage({
  message,
  variant,
}: {
  message: string;
  variant: "success" | "error";
}) {
  const classes =
    variant === "success"
      ? "border-[#BBF7D0] bg-[#DCFCE7] text-[#0B3D2E]"
      : "border-[#FECACA] bg-[#FDECEC] text-[#B42318]";

  return (
    <div className={`mt-5 rounded-2xl border px-4 py-3 text-sm font-bold ${classes}`}>
      {message}
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

function getFinancialCardDescription(
  isLoading: boolean,
  hasBankAccount: boolean,
  hasPixKey: boolean,
) {
  if (isLoading) {
    return "Carregando status da conta da plataforma.";
  }

  if (hasBankAccount && hasPixKey) {
    return "Conta bancária e Pix configurados para recebimentos.";
  }

  if (hasBankAccount) {
    return "Conta bancária cadastrada. Falta adicionar a chave Pix.";
  }

  if (hasPixKey) {
    return "Chave Pix cadastrada. Falta completar os dados bancários.";
  }

  return "Cadastre banco e Pix para receber cobranças institucionais.";
}

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}
