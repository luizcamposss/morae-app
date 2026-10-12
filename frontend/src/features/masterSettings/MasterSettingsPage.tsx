import { useEffect, useState, type FormEvent } from "react";
import { Bell, CreditCard, KeyRound, Lock, Mail, QrCode, UserRound } from "lucide-react";
import { useAuth } from "../../app/providers/useAuth";
import { Button } from "../../shared/components/Button";
import { GroupedList, GroupedRow } from "../../shared/components/GroupedList";
import { Modal } from "../../shared/components/Modal";
import { Switch } from "../../shared/components/Switch";
import { TextField } from "../../shared/components/TextField";
import { PageHeader } from "../../shared/layout/PageHeader";
import { ChangePasswordModal } from "../auth/ChangePasswordModal";
import { FinancialAccountForm } from "../financialAccounts/FinancialAccountForm";
import { getPlatformFinancialAccount, upsertPlatformFinancialAccount } from "../financialAccounts/financialAccountService";
import type { FinancialAccountResponse, UpsertFinancialAccountRequest } from "../financialAccounts/types";
import { getNotificationPreferences, updateMyProfile, updateNotificationPreferences } from "../me/meService";
import type { NotificationPreferences } from "../me/types";
import { MercadoPagoConnectionPanel } from "../mercadoPago/MercadoPagoConnectionPanel";
import { describePaymentMethods, useMercadoPagoConnected } from "../mercadoPago/useMercadoPagoConnected";
import { ProfilePhotoBlock } from "../profile/ProfilePhotoBlock";

type ModalType = "profile" | "notifications" | "password" | "pix" | "mercadoPago" | null;

const statusTones = { success: "bg-verde-suave text-verde-tinta", warning: "bg-ambar-suave text-ambar" };

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

function formatPhone(value: string) {
  const digits = onlyDigits(value);
  if (digits.length < 10) return value;
  return digits.length === 11 ? `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}` : `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
}

function StatusChip({ tone, children }: { tone: "success" | "warning"; children: string }) {
  return <span className={`shrink-0 rounded-chip px-2 py-0.5 text-xs font-semibold ${statusTones[tone]}`}>{children}</span>;
}

export function MasterSettingsPage() {
  const { user, refreshUser } = useAuth();
  const [modal, setModal] = useState<ModalType>(null);
  const [account, setAccount] = useState<FinancialAccountResponse | null>(null);
  const [isLoadingAccount, setIsLoadingAccount] = useState(true);
  const [accountError, setAccountError] = useState("");
  // Re-checks the Mercado Pago connection whenever a dialog closes.
  const isMercadoPagoConnected = useMercadoPagoConnected(null, { refreshKey: modal });

  useEffect(() => {
    let isMounted = true;

    getPlatformFinancialAccount()
      .then((result) => isMounted && setAccount(result))
      .catch((error) => isMounted && setAccountError(error instanceof Error ? error.message : "Não foi possível carregar a chave Pix."))
      .finally(() => isMounted && setIsLoadingAccount(false));

    return () => {
      isMounted = false;
    };
  }, []);

  const hasPixKey = Boolean(account?.pixKey);
  const receiving = describePaymentMethods(hasPixKey, isMercadoPagoConnected, "mensalidades");
  const displayName = user?.personName || user?.userName || "Usuário";

  return (
    <>
      <PageHeader overline="Conta Master" title="Ajustes" />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
        <div className="flex flex-col gap-8">
          <section className="rounded-card bg-superficie p-6 shadow-whisper">
            <ProfilePhotoBlock />
            <div className="mt-5 border-t border-linha pt-5">
              <p className="font-display text-2xl font-bold tracking-[-0.01em] text-tinta">{displayName}</p>
              <p className="mt-0.5 text-sm text-tinta-suave">Dono da plataforma Moraê</p>
              <dl className="mt-4 space-y-2 text-sm">
                <div className="flex items-center gap-2.5 text-tinta">
                  <Mail size={16} strokeWidth={1.7} aria-hidden className="text-tinta-suave" />
                  <dt className="sr-only">E-mail</dt>
                  <dd>{user?.email}</dd>
                </div>
                <div className="flex items-center gap-2.5 text-tinta">
                  <UserRound size={16} strokeWidth={1.7} aria-hidden className="text-tinta-suave" />
                  <dt className="sr-only">Telefone</dt>
                  <dd>{user?.phoneNumber ? formatPhone(user.phoneNumber) : "Telefone não informado"}</dd>
                </div>
              </dl>
              <Button variant="quiet" size="sm" className="mt-5" onClick={() => setModal("profile")}>
                Editar dados pessoais
              </Button>
            </div>
          </section>

          <GroupedList title="Segurança e avisos">
            <GroupedRow icon={Lock} title="Senha" subtitle="Trocar a senha desconecta os outros aparelhos" onClick={() => setModal("password")} />
            <GroupedRow icon={Bell} title="Notificações" subtitle="Avisos, cobranças e cadastros" onClick={() => setModal("notifications")} />
          </GroupedList>
        </div>

        <div className="flex flex-col gap-4">
          <div className={`rounded-card px-5 py-4 ${receiving.tone === "success" ? "bg-verde-suave/70" : "bg-ambar-suave"}`}>
            <p className="text-[13px] font-semibold text-tinta-suave">Onde as mensalidades caem</p>
            <p className="mt-1 font-display text-xl font-bold tracking-[-0.01em] text-tinta">{isLoadingAccount ? "Verificando…" : receiving.value}</p>
            <p className="mt-1 text-sm text-tinta-suave">{receiving.description}</p>
          </div>

          {accountError && (
            <p role="alert" className="rounded-field bg-vermelho-suave px-4 py-3 text-sm font-medium text-vermelho">
              {accountError}
            </p>
          )}

          <GroupedList
            title="Recebimento da plataforma"
            footer="O Mercado Pago recebe Pix, cartão e boleto pelo app e dá baixa sozinho. A chave Pix serve para pagamentos manuais."
          >
            <GroupedRow
              icon={CreditCard}
              tone={isMercadoPagoConnected ? "green" : "neutral"}
              title="Mercado Pago"
              subtitle={isMercadoPagoConnected ? "Pagamentos online com baixa automática" : "Conecte para receber online"}
              trailing={<StatusChip tone={isMercadoPagoConnected ? "success" : "warning"}>{isMercadoPagoConnected ? "Conectado" : "Não conectado"}</StatusChip>}
              onClick={() => setModal("mercadoPago")}
            />
            <GroupedRow
              icon={QrCode}
              tone={hasPixKey ? "green" : "neutral"}
              title="Chave Pix"
              subtitle={hasPixKey ? account?.pixKey : "Para pagamentos manuais"}
              trailing={<StatusChip tone={hasPixKey ? "success" : "warning"}>{hasPixKey ? "Cadastrada" : "Não cadastrada"}</StatusChip>}
              onClick={() => setModal("pix")}
            />
          </GroupedList>

          <GroupedList title="Acesso">
            <GroupedRow icon={KeyRound} title="E-mail de acesso" subtitle={user?.email} />
          </GroupedList>
        </div>
      </div>

      {modal === "profile" && user && (
        <ProfileDataModal userName={user.personName} phoneNumber={user.phoneNumber ?? ""} onClose={() => setModal(null)} onSaved={refreshUser} />
      )}
      {modal === "notifications" && <NotificationsModal onClose={() => setModal(null)} />}
      {modal === "password" && <ChangePasswordModal onClose={() => setModal(null)} />}
      {modal === "pix" && (
        <PixModal
          account={account}
          onClose={() => setModal(null)}
          onSaved={(result) => {
            setAccount(result);
            setAccountError("");
          }}
        />
      )}
      {modal === "mercadoPago" && (
        <Modal title="Mercado Pago da plataforma" description="A conta onde as mensalidades pagas online caem." onClose={() => setModal(null)}>
          <MercadoPagoConnectionPanel contextLabel="mensalidades" onBack={() => setModal(null)} />
        </Modal>
      )}
    </>
  );
}

function ProfileDataModal({
  userName,
  phoneNumber,
  onClose,
  onSaved,
}: {
  userName: string;
  phoneNumber: string;
  onClose: () => void;
  onSaved: () => Promise<unknown>;
}) {
  const [form, setForm] = useState({ name: userName, phoneNumber: formatPhone(phoneNumber) });
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
      await updateMyProfile({ name: form.name.trim(), phoneNumber: phoneDigits });
      await onSaved();
      setSuccessMessage("Dados pessoais atualizados.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Não foi possível atualizar seus dados.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal
      title="Dados pessoais"
      onClose={onClose}
      footer={
        <>
          <Button variant="quiet" onClick={onClose}>
            Fechar
          </Button>
          <Button type="submit" form="profile-data" isLoading={isSubmitting} loadingText="Salvando…">
            Salvar
          </Button>
        </>
      }
    >
      <form id="profile-data" onSubmit={handleSubmit} className="flex flex-col gap-4">
        {(errorMessage || successMessage) && (
          <p
            role={errorMessage ? "alert" : "status"}
            className={`rounded-field px-4 py-3 text-sm font-medium ${errorMessage ? "bg-vermelho-suave text-vermelho" : "bg-verde-suave text-verde-tinta"}`}
          >
            {errorMessage || successMessage}
          </p>
        )}
        <TextField label="Nome" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} autoComplete="name" />
        <TextField
          label="Telefone"
          value={form.phoneNumber}
          onChange={(event) => setForm({ ...form, phoneNumber: event.target.value })}
          inputMode="tel"
          autoComplete="tel"
          placeholder="(11) 99999-9999"
        />
      </form>
    </Modal>
  );
}

const notificationOptions: Array<{ key: keyof NotificationPreferences; label: string; description: string }> = [
  { key: "noticesEnabled", label: "Avisos", description: "Comunicados importantes da plataforma" },
  { key: "billsEnabled", label: "Cobranças", description: "Mensalidades criadas, pagas e atrasadas" },
  { key: "unitUpdatesEnabled", label: "Cadastros", description: "Convites aceitos, condomínios e acessos" },
];

function NotificationsModal({ onClose }: { onClose: () => void }) {
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    getNotificationPreferences()
      .then((result) => isMounted && setPreferences(result))
      .catch((error) => isMounted && setErrorMessage(error instanceof Error ? error.message : "Não foi possível carregar suas preferências."));

    return () => {
      isMounted = false;
    };
  }, []);

  async function handleSave() {
    if (!preferences) return;

    try {
      setIsSubmitting(true);
      setErrorMessage("");
      setSuccessMessage("");
      setPreferences(await updateNotificationPreferences(preferences));
      setSuccessMessage("Preferências salvas.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Não foi possível salvar suas preferências.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal
      title="Notificações"
      description="O que aparece no sininho e chega por e-mail."
      onClose={onClose}
      footer={
        <>
          <Button variant="quiet" onClick={onClose}>
            Fechar
          </Button>
          <Button onClick={() => void handleSave()} disabled={!preferences} isLoading={isSubmitting} loadingText="Salvando…">
            Salvar
          </Button>
        </>
      }
    >
      {(errorMessage || successMessage) && (
        <p
          role={errorMessage ? "alert" : "status"}
          className={`mb-2 rounded-field px-4 py-3 text-sm font-medium ${errorMessage ? "bg-vermelho-suave text-vermelho" : "bg-verde-suave text-verde-tinta"}`}
        >
          {errorMessage || successMessage}
        </p>
      )}
      {preferences ? (
        <div className="divide-y divide-linha">
          {notificationOptions.map((option) => (
            <Switch
              key={option.key}
              label={option.label}
              description={option.description}
              checked={preferences[option.key]}
              onChange={(checked) => {
                setSuccessMessage("");
                setPreferences({ ...preferences, [option.key]: checked });
              }}
            />
          ))}
        </div>
      ) : (
        !errorMessage && <p className="py-6 text-center text-sm text-tinta-suave">Carregando…</p>
      )}
    </Modal>
  );
}

function PixModal({
  account,
  onClose,
  onSaved,
}: {
  account: FinancialAccountResponse | null;
  onClose: () => void;
  onSaved: (account: FinancialAccountResponse) => void;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  async function handleSubmit(data: UpsertFinancialAccountRequest) {
    try {
      setIsSubmitting(true);
      setErrorMessage("");
      setSuccessMessage("");
      onSaved(await upsertPlatformFinancialAccount(data));
      setSuccessMessage("Chave Pix salva.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Não foi possível salvar a chave Pix.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal title="Chave Pix da plataforma" description="Para mensalidades pagas fora do app." onClose={onClose}>
      {(errorMessage || successMessage) && (
        <p
          role={errorMessage ? "alert" : "status"}
          className={`mb-4 rounded-field px-4 py-3 text-sm font-medium ${errorMessage ? "bg-vermelho-suave text-vermelho" : "bg-verde-suave text-verde-tinta"}`}
        >
          {errorMessage || successMessage}
        </p>
      )}
      <FinancialAccountForm account={account} isSubmitting={isSubmitting} onSubmit={handleSubmit} />
    </Modal>
  );
}
