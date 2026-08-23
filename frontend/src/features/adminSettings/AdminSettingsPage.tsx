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
import { FinancialAccountForm } from "../financialAccounts/FinancialAccountForm";
import {
  getCondominiumFinancialAccount,
  upsertCondominiumFinancialAccount,
} from "../financialAccounts/financialAccountService";
import type {
  FinancialAccountResponse,
  UpsertFinancialAccountRequest,
} from "../financialAccounts/types";
import { ProfilePhotoBlock } from "../profile/ProfilePhotoBlock";
import {
  defaultSyndicAccess,
  getSyndicAccess,
  syndicAccessOptions,
  updateSyndicAccess,
  type SyndicAccessKey,
  type SyndicAccessSettings,
} from "../syndicAccess/syndicAccessService";
import { getPersonsByCondominium } from "../persons/personService";
import type { PersonResponse } from "../persons/types";
import { MercadoPagoConnectionPanel } from "../mercadoPago/MercadoPagoConnectionPanel";

type ModalType = "profile" | "notifications" | "financial" | "syndicAccess" | null;

const defaultNotificationPreferences: NotificationPreferences = {
  noticesEnabled: true,
  billsEnabled: true,
  unitUpdatesEnabled: true,
};

export function AdminSettingsPage() {
  const { user, refreshUser } = useAuth();
  const { activeCondominium, activeCondominiumId } = useCondominium();
  const [modal, setModal] = useState<ModalType>(null);
  const [account, setAccount] = useState<FinancialAccountResponse | null>(null);
  const [isLoadingAccount, setIsLoadingAccount] = useState(true);
  const [accountError, setAccountError] = useState("");

  async function loadAccount() {
    if (!activeCondominiumId) {
      setAccount(null);
      setIsLoadingAccount(false);
      return;
    }

    try {
      setIsLoadingAccount(true);
      setAccountError("");
      setAccount(await getCondominiumFinancialAccount(activeCondominiumId));
    } catch (error) {
      setAccount(null);
      setAccountError(
        error instanceof Error
          ? error.message
          : "Não foi possível carregar a chave Pix do condomínio.",
      );
    } finally {
      setIsLoadingAccount(false);
    }
  }

  useEffect(() => {
    void loadAccount();
  }, [activeCondominiumId]);

  const condominiumName = activeCondominium?.condominiumName ?? "Nenhum condomínio selecionado";
  const hasPixKey = Boolean(account?.pixKey);

  return (
    <>
      <section className="rounded-[2rem] border border-[#E5E7EB] bg-white p-5 shadow-sm sm:p-6 lg:p-7">
        <div className="border-b border-[#E5E7EB] pb-6">
          <p className="text-sm font-black uppercase tracking-[0.2em] text-[#16A34A]">
            Configurações
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-[#111827] sm:text-4xl">
            Preferências do Admin
          </h1>
          <p className="mt-2 text-sm font-semibold leading-6 text-[#6B7280]">
            Ajuste seu perfil, notificações e o método de pagamento do condomínio ativo.
          </p>
        </div>

        {accountError && <FeedbackMessage variant="error" message={accountError} />}

        <div className="mt-6 grid grid-cols-1 gap-5 xl:grid-cols-4">
          <SettingsBlock
            icon="usuario"
            title="Perfil e dados pessoais"
            description="Foto, nome, telefone e e-mail usados no seu acesso Admin."
            action="Editar perfil"
            onClick={() => setModal("profile")}
          />

          <SettingsBlock
            icon="sino"
            title="Notificações"
            description="Preferências de avisos, cobranças e atualizações do condomínio."
            action="Configurar"
            onClick={() => setModal("notifications")}
          />

          <SettingsBlock
            icon="escudo"
            title="Acessos do síndico"
            description="Defina quais áreas do condomínio ficam disponíveis para o síndico."
            action="Gerenciar acessos"
            onClick={() => setModal("syndicAccess")}
          />

          <SettingsBlock
            icon="carteira"
            title="Método de pagamento"
            description={getFinancialCardDescription(isLoadingAccount, hasPixKey)}
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

      {modal === "syndicAccess" && (
        <SyndicAccessModal
          condominiumId={activeCondominiumId}
          onClose={() => setModal(null)}
        />
      )}

      {modal === "financial" && (
        <FinancialAccountModal
          account={account}
          condominiumName={condominiumName}
          isLoading={isLoadingAccount}
          condominiumId={activeCondominiumId}
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
              label="Avisos do condomínio"
              description="Receber comunicados importantes da gestão."
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
              description="Receber avisos sobre moradores, unidades e convites."
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

function SyndicAccessModal({
  condominiumId,
  onClose,
}: ModalProps & {
  condominiumId: number | null;
}) {
  const [access, setAccess] = useState<SyndicAccessSettings>(defaultSyndicAccess);
  const [syndics, setSyndics] = useState<PersonResponse[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSyndicSelectOpen, setIsSyndicSelectOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const enabledCount = Object.values(access).filter(Boolean).length;
  const selectedSyndic = syndics.find((syndic) => syndic.userId === selectedUserId);

  useEffect(() => {
    let isMounted = true;

    async function loadSyndics() {
      if (!condominiumId) {
        setSyndics([]);
        setSelectedUserId(null);
        setAccess(defaultSyndicAccess);
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setErrorMessage("");
        setSuccessMessage("");

        const people = await getPersonsByCondominium(condominiumId);
        const syndicPeople = people.filter(
          (person) => person.accessRole === "Syndic" && person.userId,
        );
        const firstUserId = syndicPeople[0]?.userId ?? null;

        if (!isMounted) {
          return;
        }

        setSyndics(syndicPeople);
        setSelectedUserId(firstUserId);

        if (firstUserId) {
          setAccess(await getSyndicAccess(condominiumId, firstUserId));
        } else {
          setAccess(defaultSyndicAccess);
        }
      } catch (error) {
        if (isMounted) {
          setSyndics([]);
          setSelectedUserId(null);
          setAccess(defaultSyndicAccess);
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "Não foi possível carregar os acessos do síndico.",
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadSyndics();

    return () => {
      isMounted = false;
    };
  }, [condominiumId]);

  async function handleSelectSyndic(userId: number) {
    if (!condominiumId) {
      return;
    }

    try {
      setIsSyndicSelectOpen(false);
      setSelectedUserId(userId);
      setIsLoading(true);
      setErrorMessage("");
      setSuccessMessage("");
      setAccess(await getSyndicAccess(condominiumId, userId));
    } catch (error) {
      setAccess(defaultSyndicAccess);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível carregar os acessos deste síndico.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  function updateAccess(key: SyndicAccessKey) {
    setErrorMessage("");
    setSuccessMessage("");
    setAccess((current) => ({
      ...current,
      [key]: !current[key],
    }));
  }

  async function handleSave() {
    if (!condominiumId || !selectedUserId) {
      return;
    }

    try {
      setIsSaving(true);
      setErrorMessage("");
      setSuccessMessage("");

      const result = await updateSyndicAccess(condominiumId, selectedUserId, access);
      setAccess(result);
      setSuccessMessage("Acessos do síndico atualizados.");
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível salvar os acessos do síndico.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <ModalShell title="Acessos do síndico" onClose={onClose}>
      <div className="space-y-5">
        {syndics.length > 0 && (
          <div className="relative">
            <span className="mb-2 block text-sm font-black text-[#111827]">Síndico</span>

            <button
              type="button"
              disabled={isLoading}
              onClick={() => setIsSyndicSelectOpen((current) => !current)}
              className="flex h-12 w-full cursor-pointer items-center justify-between rounded-2xl border border-[#E5E7EB] bg-white px-4 text-left text-sm font-bold text-[#111827] outline-none transition hover:border-[#86EFAC] focus:border-[#22C55E] focus:ring-4 focus:ring-[#86EFAC]/30 disabled:cursor-not-allowed disabled:bg-[#F3F4F6] disabled:text-[#6B7280]"
            >
              <span>{selectedSyndic?.name ?? "Selecione um síndico"}</span>
              <span
                className={`text-xs text-[#6B7280] transition ${
                  isSyndicSelectOpen ? "rotate-180" : ""
                }`}
              >
                ▼
              </span>
            </button>

            {isSyndicSelectOpen && (
              <div className="absolute left-0 right-0 top-[4.7rem] z-20 overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white p-1 shadow-xl shadow-[#0B3D2E]/10">
                {syndics.map((syndic) => {
                  const isSelected = syndic.userId === selectedUserId;

                  return (
                    <button
                      key={syndic.userId}
                      type="button"
                      onClick={() => void handleSelectSyndic(Number(syndic.userId))}
                      className={`flex w-full cursor-pointer items-center justify-between rounded-xl px-4 py-3 text-left text-sm font-bold transition ${
                        isSelected
                          ? "bg-[#DCFCE7] text-[#0B3D2E]"
                          : "text-[#111827] hover:bg-[#F3F4F6]"
                      }`}
                    >
                      <span>{syndic.name}</span>
                      {isSelected && <span className="text-[#16A34A]">Selecionado</span>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-[1.5rem] border border-[#E5E7EB] bg-[#F9FAFB] p-5">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#6B7280]">
              Áreas liberadas
            </p>
            <p className="mt-2 text-3xl font-black text-[#111827]">{enabledCount}</p>
            <p className="mt-1 text-sm font-bold text-[#16A34A]">
              De {syndicAccessOptions.length} módulos disponíveis
            </p>
          </div>

          <div className="rounded-[1.5rem] border border-[#E5E7EB] bg-[#F9FAFB] p-5">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#6B7280]">
              Aplicação
            </p>
            <p className="mt-2 text-lg font-black text-[#111827]">Controle por usuário</p>
            <p className="mt-1 text-sm font-semibold leading-6 text-[#6B7280]">
              Cada síndico pode ter uma configuração própria dentro do condomínio.
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="rounded-[1.5rem] border border-[#E5E7EB] bg-[#F9FAFB] p-5 text-sm font-bold text-[#6B7280]">
            Carregando acessos...
          </div>
        ) : syndics.length === 0 ? (
          <div className="rounded-[1.5rem] border border-dashed border-[#CBD5E1] bg-[#F9FAFB] p-6 text-sm font-bold text-[#6B7280]">
            Nenhum síndico com acesso ativo foi encontrado neste condomínio.
          </div>
        ) : (
          <div className="space-y-4">
            {syndicAccessOptions.map((option) => (
              <ToggleRow
                key={option.key}
                label={option.label}
                description={option.description}
                checked={access[option.key]}
                onChange={() => updateAccess(option.key)}
              />
            ))}
          </div>
        )}

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
            type="button"
            disabled={!condominiumId || !selectedUserId || isLoading || isSaving}
            onClick={() => void handleSave()}
            className="h-12 cursor-pointer rounded-2xl bg-[#16A34A] px-6 text-sm font-black text-white shadow-sm shadow-[#16A34A]/25 transition hover:bg-[#0B3D2E] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSaving ? "Salvando..." : "Salvar acessos"}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

function FinancialAccountModal({
  account,
  condominiumName,
  condominiumId,
  isLoading,
  onClose,
  onSaved,
}: ModalProps & {
  account: FinancialAccountResponse | null;
  condominiumName: string;
  condominiumId: number | null;
  isLoading: boolean;
  onSaved: (account: FinancialAccountResponse) => Promise<void>;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [selectedMethod, setSelectedMethod] = useState<"choice" | "pix" | "mercadoPago">("choice");

  async function handleSubmit(data: UpsertFinancialAccountRequest) {
    if (!condominiumId) {
      setErrorMessage("Selecione um condomínio antes de salvar a chave Pix.");
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage("");
      setSuccessMessage("");

      const result = await upsertCondominiumFinancialAccount(condominiumId, data);
      await onSaved(result);
      setSuccessMessage("Chave Pix do condomínio atualizada.");
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível salvar a chave Pix.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (selectedMethod === "choice") {
    return (
      <ModalShell title="Método de pagamento" onClose={onClose}>
        <div className="space-y-5">
          <PaymentMethodStatus
            label="Método em uso"
            value={account?.pixKey ? "Pix normal" : "Nenhum método configurado"}
            description={
              account?.pixKey
                ? `As cobranças internas do ${condominiumName} usam a chave Pix cadastrada.`
                : "Cadastre uma chave Pix para liberar a criação de cobranças internas."
            }
            tone={account?.pixKey ? "success" : "warning"}
          />

          <PaymentMethodChoice
            pixConfigured={Boolean(account?.pixKey)}
            pixKey={account?.pixKey ?? ""}
            onSelectPix={() => setSelectedMethod("pix")}
            onSelectMercadoPago={() => setSelectedMethod("mercadoPago")}
          />
        </div>
      </ModalShell>
    );
  }

  if (selectedMethod === "mercadoPago") {
    return (
      <ModalShell title="Mercado Pago" onClose={onClose}>
        <MercadoPagoConnectionPanel
          contextLabel={condominiumName}
          onBack={() => setSelectedMethod("choice")}
        />
      </ModalShell>
    );
  }

  return (
    <ModalShell title="Pix normal" onClose={onClose}>
      <div className="space-y-5">
        <PaymentMethodStatus
          label="Método selecionado"
          value="Pix normal"
          description={
            account?.pixKey
              ? "Este é o método em uso nas cobranças internas."
              : "Cadastre a chave Pix para ativar este método."
          }
          tone={account?.pixKey ? "success" : "warning"}
        />

        <div className="rounded-2xl border border-[#BBF7D0] bg-[#DCFCE7] p-4">
          <p className="text-sm font-extrabold text-[#0B3D2E]">
            Configure a chave Pix do condomínio ativo.
          </p>
          <p className="mt-2 text-sm font-semibold leading-6 text-[#0D7A3A]">
            Esses dados ficam vinculados ao {condominiumName} e organizam os recebimentos internos.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setSelectedMethod("choice")}
          className="h-11 cursor-pointer rounded-2xl border border-[#E5E7EB] bg-white px-5 text-sm font-black text-[#6B7280] transition hover:bg-[#F3F4F6] hover:text-[#111827]"
        >
          Trocar método
        </button>

        {isLoading ? (
          <div className="rounded-[1.5rem] border border-[#E5E7EB] bg-[#F9FAFB] p-5 text-sm font-bold text-[#6B7280]">
            Carregando chave Pix...
          </div>
        ) : (
          <>
            {account?.pixKey && <PixKeyPreview pixKey={account.pixKey} />}
            <FinancialAccountForm
              account={account}
              isSubmitting={isSubmitting}
              onSubmit={handleSubmit}
            />
          </>
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

function PaymentMethodStatus({
  label,
  value,
  description,
  tone,
}: {
  label: string;
  value: string;
  description: string;
  tone: "success" | "warning" | "info";
}) {
  const styles = {
    success: "border-[#BBF7D0] bg-[#ECFDF5] text-[#065F46]",
    warning: "border-[#FDE68A] bg-[#FFFBEB] text-[#92400E]",
    info: "border-[#BAE6FD] bg-[#F0F9FF] text-[#075985]",
  }[tone];

  return (
    <div className={`rounded-2xl border px-5 py-4 ${styles}`}>
      <p className="text-xs font-black uppercase tracking-[0.16em]">{label}</p>
      <p className="mt-1 text-lg font-black text-[#111827]">{value}</p>
      <p className="mt-1 text-sm font-semibold leading-6">{description}</p>
    </div>
  );
}

function PaymentMethodChoice({
  pixConfigured,
  pixKey,
  onSelectPix,
  onSelectMercadoPago,
}: {
  pixConfigured: boolean;
  pixKey: string;
  onSelectPix: () => void;
  onSelectMercadoPago: () => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <button
        type="button"
        onClick={onSelectPix}
        className="group min-h-48 cursor-pointer rounded-[1.5rem] border border-[#BBF7D0] bg-[#F9FAFB] p-5 text-left transition hover:-translate-y-0.5 hover:bg-white hover:shadow-xl hover:shadow-[#0B3D2E]/10"
      >
        <div className="flex size-12 items-center justify-center rounded-2xl bg-[#DCFCE7] text-2xl text-[#16A34A] transition group-hover:bg-[#16A34A] group-hover:text-white">
          <EduIcon nome="carteira" />
        </div>
        <h3 className="mt-5 text-xl font-black text-[#111827]">Pix normal</h3>
        <p className="mt-2 text-sm font-semibold leading-6 text-[#6B7280]">
          Receba usando uma chave Pix cadastrada manualmente.
        </p>
        <span className="mt-5 inline-flex text-sm font-black text-[#16A34A]">
          {pixConfigured ? "Editar chave Pix" : "Cadastrar chave Pix"} →
        </span>
        {pixConfigured && (
          <div className="mt-4 rounded-2xl border border-[#BBF7D0] bg-white px-4 py-3">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#16A34A]">
              Chave cadastrada
            </p>
            <p className="mt-1 break-all text-sm font-black text-[#111827]">{pixKey}</p>
          </div>
        )}
      </button>

      <button
        type="button"
        onClick={onSelectMercadoPago}
        className="group min-h-48 cursor-pointer rounded-[1.5rem] border border-[#E5E7EB] bg-[#F9FAFB] p-5 text-left transition hover:-translate-y-0.5 hover:bg-white hover:shadow-xl hover:shadow-[#0B3D2E]/10"
      >
        <div className="flex size-12 items-center justify-center rounded-2xl bg-[#E0F2FE] text-2xl text-[#0284C7] transition group-hover:bg-[#0284C7] group-hover:text-white">
          <EduIcon nome="cartao" />
        </div>
        <h3 className="mt-5 text-xl font-black text-[#111827]">Mercado Pago</h3>
        <p className="mt-2 text-sm font-semibold leading-6 text-[#6B7280]">
          Conecte a conta Mercado Pago para ativar checkout e recebimentos automaticos.
        </p>
        <span className="mt-5 inline-flex text-sm font-black text-[#0284C7]">
          Conectar conta →
        </span>
      </button>
    </div>
  );
}

function PixKeyPreview({ pixKey }: { pixKey: string }) {
  return (
    <div className="rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] px-5 py-4">
      <p className="text-xs font-black uppercase tracking-[0.16em] text-[#16A34A]">
        Chave Pix atual
      </p>
      <p className="mt-2 break-all text-base font-black text-[#111827]">{pixKey}</p>
    </div>
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
  hasPixKey: boolean,
) {
  if (isLoading) {
    return "Carregando método de pagamento do condomínio.";
  }

  if (hasPixKey) {
    return "Pix normal configurado para recebimentos internos.";
  }

  return "Escolha Pix normal ou Mercado Pago para organizar recebimentos internos.";
}

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}
