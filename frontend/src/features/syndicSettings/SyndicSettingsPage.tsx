import { useState } from "react";
import { Bell, Building2, KeyRound, Lock } from "lucide-react";
import { useAuth } from "../../app/providers/useAuth";
import { useCondominium } from "../../app/providers/useCondominium";
import { GroupedList, GroupedRow } from "../../shared/components/GroupedList";
import { PageHeader } from "../../shared/layout/PageHeader";
import { ChangePasswordModal } from "../auth/ChangePasswordModal";
import { NotificationsModal, type NotificationOption } from "../settings/NotificationsModal";
import { ProfileCard } from "../settings/ProfileCard";
import { ProfileDataModal } from "../settings/ProfileDataModal";

type ModalType = "profile" | "notifications" | "password" | null;

const notificationOptions: NotificationOption[] = [
  { key: "noticesEnabled", label: "Avisos", description: "Comunicados do condomínio" },
  { key: "billsEnabled", label: "Cobranças", description: "Cobranças em aberto e atrasadas" },
  { key: "unitUpdatesEnabled", label: "Unidades e ocorrências", description: "Alertas ligados às unidades e ocorrências" },
];

export function SyndicSettingsPage() {
  const { user, refreshUser } = useAuth();
  const { activeCondominium } = useCondominium();
  const [modal, setModal] = useState<ModalType>(null);

  const condominiumName = activeCondominium?.condominiumName;

  return (
    <>
      <PageHeader overline={condominiumName ?? "Área do síndico"} title="Ajustes" />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
        <ProfileCard roleLabel="Síndico" onEdit={() => setModal("profile")} />

        <div className="flex flex-col gap-8">
          <GroupedList title="Segurança e avisos">
            <GroupedRow icon={Lock} title="Senha" subtitle="Trocar a senha desconecta os outros aparelhos" onClick={() => setModal("password")} />
            <GroupedRow icon={Bell} title="Notificações" subtitle="Avisos, cobranças e unidades" onClick={() => setModal("notifications")} />
          </GroupedList>

          <GroupedList title="Acesso" footer="Suas permissões e prédios são definidos pela administração do condomínio.">
            <GroupedRow icon={KeyRound} title="E-mail de acesso" subtitle={user?.email} />
            <GroupedRow
              icon={Building2}
              tone={condominiumName ? "green" : "neutral"}
              title="Condomínio"
              subtitle={condominiumName ?? "Nenhum condomínio ativo"}
            />
          </GroupedList>
        </div>
      </div>

      {modal === "profile" && user && (
        <ProfileDataModal userName={user.personName} phoneNumber={user.phoneNumber ?? ""} onClose={() => setModal(null)} onSaved={refreshUser} />
      )}
      {modal === "notifications" && <NotificationsModal options={notificationOptions} onClose={() => setModal(null)} />}
      {modal === "password" && <ChangePasswordModal onClose={() => setModal(null)} />}
    </>
  );
}
