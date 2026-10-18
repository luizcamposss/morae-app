import { useEffect, useMemo, useState } from "react";
import { Bell, CalendarClock, CreditCard, KeyRound, Lock, QrCode, ShieldCheck } from "lucide-react";
import { useAuth } from "../../app/providers/useAuth";
import { useCondominium } from "../../app/providers/useCondominium";
import { GroupedList, GroupedRow } from "../../shared/components/GroupedList";
import { Modal } from "../../shared/components/Modal";
import { PageHeader } from "../../shared/layout/PageHeader";
import { ChangePasswordModal } from "../auth/ChangePasswordModal";
import { getBillingSettings } from "../charges/billingService";
import { getPlatformCharges } from "../charges/chargeService";
import type { BillingSettings, ChargeResponse } from "../charges/types";
import { getCondominiumFinancialAccount, upsertCondominiumFinancialAccount } from "../financialAccounts/financialAccountService";
import type { FinancialAccountResponse } from "../financialAccounts/types";
import { MercadoPagoConnectionPanel } from "../mercadoPago/MercadoPagoConnectionPanel";
import { describePaymentMethods, useMercadoPagoConnected } from "../mercadoPago/useMercadoPagoConnected";
import { NotificationsModal, type NotificationOption } from "../settings/NotificationsModal";
import { PixKeyModal } from "../settings/PixKeyModal";
import { ProfileCard } from "../settings/ProfileCard";
import { ProfileDataModal } from "../settings/ProfileDataModal";
import { ReceivingStatus } from "../settings/ReceivingStatus";
import { StatusChip } from "../settings/StatusChip";
import { BillingRulesModal } from "./BillingRulesModal";
import { describeBillingRules } from "./billingRules";
import { PlatformPlanCard } from "./PlatformPlanCard";
import { summarizePlatformPlan } from "./platformPlan";
import { SyndicAccessModal } from "./SyndicAccessModal";

type ModalType = "profile" | "notifications" | "password" | "syndicAccess" | "pix" | "mercadoPago" | "billingRules" | null;

// What was loaded and for which condominium, so switching condominiums shows "loading" again.
type Loaded<T> = { condominiumId: number; data: T | null; error: string };

const notificationOptions: NotificationOption[] = [
  { key: "noticesEnabled", label: "Avisos", description: "Comunicados do condomínio e do Moraê" },
  { key: "billsEnabled", label: "Cobranças", description: "Cobranças criadas, pagas e atrasadas" },
  { key: "unitUpdatesEnabled", label: "Cadastros", description: "Moradores, unidades e convites" },
];

function errorText(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export function AdminSettingsPage() {
  const { user, refreshUser } = useAuth();
  const { activeCondominium, activeCondominiumId } = useCondominium();
  const [modal, setModal] = useState<ModalType>(null);
  const [account, setAccount] = useState<Loaded<FinancialAccountResponse> | null>(null);
  const [platformCharges, setPlatformCharges] = useState<Loaded<ChargeResponse[]> | null>(null);
  const [billingSettings, setBillingSettings] = useState<Loaded<BillingSettings> | null>(null);
  // Re-checks the condominium's Mercado Pago connection whenever a dialog closes.
  const isMercadoPagoConnected = useMercadoPagoConnected(activeCondominiumId, { skip: !activeCondominiumId, refreshKey: modal });

  useEffect(() => {
    if (!activeCondominiumId) return;
    let isMounted = true;

    getCondominiumFinancialAccount(activeCondominiumId)
      .then((data) => isMounted && setAccount({ condominiumId: activeCondominiumId, data, error: "" }))
      .catch(
        (error) =>
          isMounted &&
          setAccount({ condominiumId: activeCondominiumId, data: null, error: errorText(error, "Não foi possível carregar a chave Pix do condomínio.") }),
      );

    // The Admin sees the platform charges of every condominium they manage; keep the active one.
    getPlatformCharges()
      .then(
        (charges) =>
          isMounted &&
          setPlatformCharges({ condominiumId: activeCondominiumId, data: charges.filter((charge) => charge.condominiumId === activeCondominiumId), error: "" }),
      )
      .catch(
        (error) =>
          isMounted &&
          setPlatformCharges({ condominiumId: activeCondominiumId, data: null, error: errorText(error, "Não foi possível carregar as mensalidades.") }),
      );

    getBillingSettings(activeCondominiumId)
      .then((data) => isMounted && setBillingSettings({ condominiumId: activeCondominiumId, data, error: "" }))
      .catch(
        (error) =>
          isMounted &&
          setBillingSettings({ condominiumId: activeCondominiumId, data: null, error: errorText(error, "Não foi possível carregar as regras de cobrança.") }),
      );

    return () => {
      isMounted = false;
    };
  }, [activeCondominiumId]);

  const currentAccount = account?.condominiumId === activeCondominiumId ? account : null;
  const currentCharges = platformCharges?.condominiumId === activeCondominiumId ? platformCharges : null;
  const currentBilling = billingSettings?.condominiumId === activeCondominiumId ? billingSettings : null;
  const planSummary = useMemo(() => (currentCharges?.data ? summarizePlatformPlan(currentCharges.data) : null), [currentCharges]);

  const condominiumName = activeCondominium?.condominiumName ?? "Nenhum condomínio selecionado";
  const pixKey = currentAccount?.data?.pixKey;
  const receiving = describePaymentMethods(Boolean(pixKey), isMercadoPagoConnected, "cobranças do condomínio");

  return (
    <>
      <PageHeader overline={condominiumName} title="Ajustes" />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
        <div className="flex flex-col gap-8">
          <ProfileCard roleLabel="Admin do condomínio" onEdit={() => setModal("profile")} />

          <GroupedList title="Segurança e avisos">
            <GroupedRow icon={Lock} title="Senha" subtitle="Trocar a senha desconecta os outros aparelhos" onClick={() => setModal("password")} />
            <GroupedRow icon={Bell} title="Notificações" subtitle="Avisos, cobranças e cadastros" onClick={() => setModal("notifications")} />
          </GroupedList>

          {activeCondominiumId && (
            <GroupedList title="Condomínio">
              <GroupedRow
                icon={ShieldCheck}
                title="Acessos do síndico"
                subtitle="Permissões e prédios de cada síndico"
                onClick={() => setModal("syndicAccess")}
              />
              <GroupedRow
                icon={CalendarClock}
                title="Regras de cobrança"
                subtitle={currentBilling?.data ? describeBillingRules(currentBilling.data) : currentBilling?.error || "Vencimento, multa e juros"}
                onClick={() => setModal("billingRules")}
              />
            </GroupedList>
          )}
        </div>

        <div className="flex flex-col gap-8">
          {activeCondominiumId && (
            <PlatformPlanCard summary={planSummary} errorMessage={currentCharges?.error ?? ""} condominiumName={condominiumName} />
          )}

          <div className="flex flex-col gap-4">
            {activeCondominiumId && <ReceivingStatus title="Onde as cobranças do condomínio caem" isLoading={!currentAccount} summary={receiving} />}

            {currentAccount?.error && (
              <p role="alert" className="rounded-field bg-vermelho-suave px-4 py-3 text-sm font-medium text-vermelho">
                {currentAccount.error}
              </p>
            )}

            {activeCondominiumId ? (
              <GroupedList
                title="Recebimento do condomínio"
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
                  tone={pixKey ? "green" : "neutral"}
                  title="Chave Pix"
                  subtitle={pixKey || "Para pagamentos manuais"}
                  trailing={<StatusChip tone={pixKey ? "success" : "warning"}>{pixKey ? "Cadastrada" : "Não cadastrada"}</StatusChip>}
                  onClick={currentAccount ? () => setModal("pix") : undefined}
                />
              </GroupedList>
            ) : (
              <p className="rounded-field bg-ambar-suave px-4 py-3 text-sm font-medium text-tinta">
                Selecione um condomínio no menu para configurar o recebimento.
              </p>
            )}
          </div>

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
      {modal === "syndicAccess" && activeCondominiumId && <SyndicAccessModal condominiumId={activeCondominiumId} onClose={() => setModal(null)} />}
      {modal === "billingRules" && activeCondominiumId && (
        <BillingRulesModal
          condominiumId={activeCondominiumId}
          onClose={() => setModal(null)}
          onSaved={(data) => setBillingSettings({ condominiumId: activeCondominiumId, data, error: "" })}
        />
      )}
      {modal === "pix" && activeCondominiumId && (
        <PixKeyModal
          title="Chave Pix do condomínio"
          description={`Para cobranças do ${condominiumName} pagas fora do app.`}
          account={currentAccount?.data ?? null}
          save={(data) => upsertCondominiumFinancialAccount(activeCondominiumId, data)}
          onClose={() => setModal(null)}
          onSaved={(data) => setAccount({ condominiumId: activeCondominiumId, data, error: "" })}
        />
      )}
      {modal === "mercadoPago" && activeCondominiumId && (
        <Modal title="Mercado Pago do condomínio" description="A conta onde as cobranças pagas online caem." onClose={() => setModal(null)}>
          <MercadoPagoConnectionPanel contextLabel={condominiumName} condominiumId={activeCondominiumId} onBack={() => setModal(null)} />
        </Modal>
      )}
    </>
  );
}
