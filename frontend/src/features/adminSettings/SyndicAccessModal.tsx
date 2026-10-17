import { useEffect, useState } from "react";
import { Button } from "../../shared/components/Button";
import { Modal } from "../../shared/components/Modal";
import { SelectField } from "../../shared/components/SelectField";
import { Switch } from "../../shared/components/Switch";
import { getPersonsByCondominium } from "../persons/personService";
import type { PersonResponse } from "../persons/types";
import { FormFeedback } from "../settings/FormFeedback";
import { defaultSyndicAccess, getSyndicAccess, syndicAccessOptions, updateSyndicAccess, type SyndicAccessSettings } from "../syndicAccess/syndicAccessService";

// Which areas each syndic of the condominium can use; every syndic has its own settings.
export function SyndicAccessModal({ condominiumId, onClose }: { condominiumId: number; onClose: () => void }) {
  const [access, setAccess] = useState<SyndicAccessSettings>(defaultSyndicAccess);
  const [syndics, setSyndics] = useState<PersonResponse[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const enabledCount = Object.values(access).filter(Boolean).length;

  useEffect(() => {
    let isMounted = true;

    getPersonsByCondominium(condominiumId)
      .then(async (people) => {
        const syndicPeople = people.filter((person) => person.accessRole === "Syndic" && person.userId);
        const firstUserId = syndicPeople[0]?.userId ?? null;
        const firstAccess = firstUserId ? await getSyndicAccess(condominiumId, firstUserId) : defaultSyndicAccess;

        if (!isMounted) return;
        setSyndics(syndicPeople);
        setSelectedUserId(firstUserId);
        setAccess(firstAccess);
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
      setAccess(await getSyndicAccess(condominiumId, userId));
    } catch (error) {
      setAccess(defaultSyndicAccess);
      setErrorMessage(error instanceof Error ? error.message : "Não foi possível carregar os acessos deste síndico.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSave() {
    if (!selectedUserId) return;

    try {
      setIsSaving(true);
      setErrorMessage("");
      setSuccessMessage("");
      setAccess(await updateSyndicAccess(condominiumId, selectedUserId, access));
      setSuccessMessage("Acessos do síndico atualizados.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Não foi possível salvar os acessos do síndico.");
    } finally {
      setIsSaving(false);
    }
  }

  const hasSyndics = syndics.length > 0;

  return (
    <Modal
      title="Acessos do síndico"
      description="Escolha o que cada síndico pode ver e fazer neste condomínio."
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
          <div>
            <p className="text-[13px] font-semibold text-tinta-suave tabular-nums">
              {enabledCount} de {syndicAccessOptions.length} áreas liberadas
            </p>
            <div className="mt-1 divide-y divide-linha">
              {syndicAccessOptions.map((option) => (
                <Switch
                  key={option.key}
                  label={option.label}
                  description={option.description}
                  checked={access[option.key]}
                  disabled={isLoading}
                  onChange={(checked) => {
                    setErrorMessage("");
                    setSuccessMessage("");
                    setAccess({ ...access, [option.key]: checked });
                  }}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
