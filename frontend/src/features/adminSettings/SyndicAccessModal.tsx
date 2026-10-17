import { useEffect, useState } from "react";
import { Button } from "../../shared/components/Button";
import { Modal } from "../../shared/components/Modal";
import { SelectField } from "../../shared/components/SelectField";
import { Switch } from "../../shared/components/Switch";
import { getBuildingsByCondominium } from "../buildings/buildingService";
import type { BuildingResponse } from "../buildings/types";
import { getPersonsByCondominium } from "../persons/personService";
import type { PersonResponse } from "../persons/types";
import { FormFeedback } from "../settings/FormFeedback";
import {
  getSyndicBuildings,
  getSyndicPermissions,
  syndicPermissionCount,
  syndicPermissionGroups,
  updateSyndicBuildings,
  updateSyndicPermissions,
  type SyndicBuildings,
} from "../syndicAccess/syndicAccessService";

type SyndicSettings = { permissions: string[]; buildings: SyndicBuildings };

const emptySettings: SyndicSettings = { permissions: [], buildings: { allBuildings: true, buildingIds: [] } };

async function loadSyndicSettings(condominiumId: number, userId: number): Promise<SyndicSettings> {
  const [permissions, buildings] = await Promise.all([getSyndicPermissions(condominiumId, userId), getSyndicBuildings(condominiumId, userId)]);
  return { permissions, buildings };
}

// What each syndic of the condominium can do and which buildings they look after; every syndic has its own settings.
export function SyndicAccessModal({ condominiumId, onClose }: { condominiumId: number; onClose: () => void }) {
  const [settings, setSettings] = useState<SyndicSettings>(emptySettings);
  const [syndics, setSyndics] = useState<PersonResponse[]>([]);
  const [buildings, setBuildings] = useState<BuildingResponse[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const { permissions, buildings: scope } = settings;

  useEffect(() => {
    let isMounted = true;

    Promise.all([getPersonsByCondominium(condominiumId), getBuildingsByCondominium(condominiumId)])
      .then(async ([people, condominiumBuildings]) => {
        const syndicPeople = people.filter((person) => person.accessRole === "Syndic" && person.userId);
        const firstUserId = syndicPeople[0]?.userId ?? null;
        const firstSettings = firstUserId ? await loadSyndicSettings(condominiumId, firstUserId) : emptySettings;

        if (!isMounted) return;
        setSyndics(syndicPeople);
        setBuildings(condominiumBuildings);
        setSelectedUserId(firstUserId);
        setSettings(firstSettings);
      })
      .catch((error) => isMounted && setErrorMessage(error instanceof Error ? error.message : "Não foi possível carregar os acessos do síndico."))
      .finally(() => isMounted && setIsLoading(false));

    return () => {
      isMounted = false;
    };
  }, [condominiumId]);

  async function handleSelectSyndic(userId: number) {
    try {
      setSelectedUserId(userId);
      setIsLoading(true);
      setErrorMessage("");
      setSuccessMessage("");
      setSettings(await loadSyndicSettings(condominiumId, userId));
    } catch (error) {
      setSettings(emptySettings);
      setErrorMessage(error instanceof Error ? error.message : "Não foi possível carregar os acessos deste síndico.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSave() {
    if (!selectedUserId) return;

    if (!scope.allBuildings && scope.buildingIds.length === 0) {
      setErrorMessage("Escolha pelo menos um prédio ou libere todos.");
      return;
    }

    try {
      setIsSaving(true);
      setErrorMessage("");
      setSuccessMessage("");
      const [savedPermissions, savedBuildings] = await Promise.all([
        updateSyndicPermissions(condominiumId, selectedUserId, permissions),
        updateSyndicBuildings(condominiumId, selectedUserId, scope),
      ]);
      setSettings({ permissions: savedPermissions, buildings: savedBuildings });
      setSuccessMessage("Acessos do síndico atualizados.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Não foi possível salvar os acessos do síndico.");
    } finally {
      setIsSaving(false);
    }
  }

  function changeSettings(update: (current: SyndicSettings) => SyndicSettings) {
    setErrorMessage("");
    setSuccessMessage("");
    setSettings(update);
  }

  function togglePermission(key: string, checked: boolean) {
    changeSettings((current) => ({
      ...current,
      permissions: checked ? [...current.permissions, key] : current.permissions.filter((permission) => permission !== key),
    }));
  }

  function toggleAllBuildings(checked: boolean) {
    changeSettings((current) => ({ ...current, buildings: { allBuildings: checked, buildingIds: checked ? [] : current.buildings.buildingIds } }));
  }

  function toggleBuilding(buildingId: number, checked: boolean) {
    changeSettings((current) => {
      const { buildingIds } = current.buildings;
      return { ...current, buildings: { allBuildings: false, buildingIds: checked ? [...buildingIds, buildingId] : buildingIds.filter((id) => id !== buildingId) } };
    });
  }

  const hasSyndics = syndics.length > 0;

  return (
    <Modal
      title="Acessos do síndico"
      description="Escolha o que cada síndico pode fazer e de quais prédios ele cuida."
      onClose={onClose}
      footer={
        <>
          <Button variant="quiet" onClick={onClose}>
            Fechar
          </Button>
          {hasSyndics && (
            <Button onClick={() => void handleSave()} disabled={!selectedUserId || isLoading} isLoading={isSaving} loadingText="Salvando…">
              Salvar
            </Button>
          )}
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <FormFeedback errorMessage={errorMessage} successMessage={successMessage} />

        {hasSyndics && (
          <SelectField
            label="Síndico"
            value={selectedUserId ? String(selectedUserId) : ""}
            disabled={isLoading || isSaving}
            options={syndics.map((syndic) => ({ value: String(syndic.userId), label: syndic.name }))}
            onChange={(event) => void handleSelectSyndic(Number(event.target.value))}
          />
        )}

        {isLoading && !hasSyndics ? (
          <p className="py-6 text-center text-sm text-tinta-suave">Carregando…</p>
        ) : !hasSyndics ? (
          !errorMessage && <p className="rounded-field bg-campo px-4 py-5 text-center text-sm text-tinta-suave">Nenhum síndico com acesso ativo neste condomínio.</p>
        ) : (
          <>
            <section>
              <p className="text-[13px] font-semibold text-tinta-suave tabular-nums">
                {permissions.length} de {syndicPermissionCount} permissões liberadas
              </p>
              {syndicPermissionGroups.map((group) => (
                <div key={group.title} className="mt-3">
                  <h3 className="text-[12px] font-semibold uppercase tracking-[0.06em] text-tinta-suave">{group.title}</h3>
                  <div className="divide-y divide-linha">
                    {group.permissions.map((permission) => (
                      <Switch
                        key={permission.key}
                        label={permission.label}
                        description={permission.description}
                        checked={permissions.includes(permission.key)}
                        disabled={isLoading}
                        onChange={(checked) => togglePermission(permission.key, checked)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </section>

            <section className="border-t border-linha pt-4">
              <h3 className="text-[15px] font-semibold text-tinta">Prédios</h3>
              <p className="text-[13px] text-tinta-suave">Nas telas do síndico aparecem só os prédios que ele cuida.</p>
              <div className="divide-y divide-linha">
                <Switch
                  label="Todos os prédios"
                  description="Inclui os prédios cadastrados depois."
                  checked={scope.allBuildings}
                  disabled={isLoading}
                  onChange={toggleAllBuildings}
                />
                {!scope.allBuildings &&
                  (buildings.length === 0 ? (
                    <p className="py-3.5 text-sm text-tinta-suave">Nenhum prédio cadastrado neste condomínio.</p>
                  ) : (
                    buildings.map((building) => (
                      <Switch
                        key={building.id}
                        label={building.name}
                        description={building.unitCount === 1 ? "1 unidade" : `${building.unitCount} unidades`}
                        checked={scope.buildingIds.includes(building.id)}
                        disabled={isLoading}
                        onChange={(checked) => toggleBuilding(building.id, checked)}
                      />
                    ))
                  ))}
              </div>
              {!scope.allBuildings && buildings.length > 0 && scope.buildingIds.length === 0 && (
                <p className="pt-1 text-[13px] font-semibold text-ambar">Escolha pelo menos um prédio para este síndico.</p>
              )}
            </section>
          </>
        )}
      </div>
    </Modal>
  );
}
