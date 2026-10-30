import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, DoorOpen, KeyRound, Lock } from "lucide-react";
import { useAuth } from "../../app/providers/useAuth";
import { GroupedList, GroupedRow } from "../../shared/components/GroupedList";
import { PageHeader } from "../../shared/layout/PageHeader";
import { ChangePasswordModal } from "../auth/ChangePasswordModal";
import { getMyUnits } from "../me/meService";
import type { MeUnitResponse } from "../me/types";
import { NotificationsModal, type NotificationOption } from "../settings/NotificationsModal";
import { ProfileCard } from "../settings/ProfileCard";
import { ProfileDataModal } from "../settings/ProfileDataModal";
import { relationshipLabel } from "../units/unitForm";

type ModalType = "profile" | "notifications" | "password" | null;

const notificationOptions: NotificationOption[] = [
  { key: "noticesEnabled", label: "Avisos", description: "Comunicados do condomínio" },
  { key: "billsEnabled", label: "Boletos", description: "Cobranças novas, vencendo e atrasadas" },
  { key: "unitUpdatesEnabled", label: "Minha unidade", description: "Novidades ligadas às suas unidades" },
];

export function ResidentSettingsPage() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [modal, setModal] = useState<ModalType>(null);
  const [units, setUnits] = useState<MeUnitResponse[] | null>(null);
  const [unitsError, setUnitsError] = useState("");

  useEffect(() => {
    let isMounted = true;

    getMyUnits()
      .then((result) => isMounted && setUnits(result))
      .catch((error) => {
        if (!isMounted) return;
        setUnits([]);
        setUnitsError(error instanceof Error ? error.message : "Não foi possível carregar suas unidades.");
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const condominiumNames = [...new Set((units ?? []).map((unit) => unit.condominiumName))];

  return (
    <>
      <PageHeader overline={condominiumNames.length === 1 ? condominiumNames[0] : "Área do morador"} title="Ajustes" />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
        <div className="flex flex-col gap-8">
          <ProfileCard roleLabel="Morador" onEdit={() => setModal("profile")} />

          <GroupedList title="Segurança e avisos">
            <GroupedRow icon={Lock} title="Senha" subtitle="Trocar a senha desconecta os outros aparelhos" onClick={() => setModal("password")} />
            <GroupedRow icon={Bell} title="Notificações" subtitle="Avisos, boletos e sua unidade" onClick={() => setModal("notifications")} />
          </GroupedList>
        </div>

        <div className="flex flex-col gap-8">
          <GroupedList title={units && units.length > 1 ? "Minhas unidades" : "Minha unidade"} footer="Para mudar um vínculo, fale com a administração do condomínio.">
            {units === null ? (
              <li className="px-5 py-4 text-sm text-tinta-suave">Carregando…</li>
            ) : unitsError ? (
              <li role="alert" className="px-5 py-4 text-sm text-vermelho">
                {unitsError}
              </li>
            ) : units.length === 0 ? (
              <li className="px-5 py-4 text-sm text-tinta-suave">Nenhuma unidade vinculada ao seu cadastro.</li>
            ) : (
              units.map((unit) => (
                <GroupedRow
                  key={unit.unitId}
                  icon={DoorOpen}
                  tone="green"
                  title={`${unit.buildingName} · Unidade ${unit.unitNumber}`}
                  subtitle={condominiumNames.length > 1 ? `${unit.condominiumName} · ${relationshipLabel(unit.relationshipType)}` : relationshipLabel(unit.relationshipType)}
                  onClick={() => navigate("/resident/unit")}
                />
              ))
            )}
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
    </>
  );
}
