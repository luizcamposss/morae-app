import { useEffect, useState } from "react";
import { Bell, CreditCard, KeyRound, Lock, QrCode } from "lucide-react";
import { useAuth } from "../../app/providers/useAuth";
import { GroupedList, GroupedRow } from "../../shared/components/GroupedList";
import { Modal } from "../../shared/components/Modal";
import { PageHeader } from "../../shared/layout/PageHeader";
import { ChangePasswordModal } from "../auth/ChangePasswordModal";
import { getPlatformFinancialAccount, upsertPlatformFinancialAccount } from "../financialAccounts/financialAccountService";
import type { FinancialAccountResponse } from "../financialAccounts/types";
import { MercadoPagoConnectionPanel } from "../mercadoPago/MercadoPagoConnectionPanel";
import { describePaymentMethods, useMercadoPagoConnected } from "../mercadoPago/useMercadoPagoConnected";
import { NotificationsModal, type NotificationOption } from "../settings/NotificationsModal";
import { PixKeyModal } from "../settings/PixKeyModal";
import { ProfileCard } from "../settings/ProfileCard";
import { ProfileDataModal } from "../settings/ProfileDataModal";
import { ReceivingStatus } from "../settings/ReceivingStatus";
import { StatusChip } from "../settings/StatusChip";

type ModalType = "profile" | "notifications" | "password" | "pix" | "mercadoPago" | null;

const notificationOptions: NotificationOption[] = [
  { key: "noticesEnabled", label: "Avisos", description: "Comunicados importantes da plataforma" },
  { key: "billsEnabled", label: "Cobranças", description: "Mensalidades criadas, pagas e atrasadas" },
  { key: "unitUpdatesEnabled", label: "Cadastros", description: "Convites aceitos, condomínios e acessos" },
];

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

  return (
    <>
      <PageHeader overline="Conta Master" title="Ajustes" />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
        <div className="flex flex-col gap-8">
          <ProfileCard roleLabel="Dono da plataforma Moraê" onEdit={() => setModal("profile")} />

          <GroupedList title="Segurança e avisos">
            <GroupedRow icon={Lock} title="Senha" subtitle="Trocar a senha desconecta os outros aparelhos" onClick={() => setModal("password")} />
            <GroupedRow icon={Bell} title="Notificações" subtitle="Avisos, cobranças e cadastros" onClick={() => setModal("notifications")} />
          </GroupedList>
        </div>

        <div className="flex flex-col gap-4">
          <ReceivingStatus title="Onde as mensalidades caem" isLoading={isLoadingAccount} summary={receiving} />

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
      {modal === "notifications" && <NotificationsModal options={notificationOptions} onClose={() => setModal(null)} />}
      {modal === "password" && <ChangePasswordModal onClose={() => setModal(null)} />}
      {modal === "pix" && (
        <PixKeyModal
          title="Chave Pix da plataforma"
          description="Para mensalidades pagas fora do app."
          account={account}
          save={upsertPlatformFinancialAccount}
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
