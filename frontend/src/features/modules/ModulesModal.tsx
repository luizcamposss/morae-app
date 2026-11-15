import { useEffect, useState } from "react";
import { useCondominium } from "../../app/providers/useCondominium";
import { Button } from "../../shared/components/Button";
import { Modal } from "../../shared/components/Modal";
import { Switch } from "../../shared/components/Switch";
import { FormFeedback } from "../settings/FormFeedback";
import { condominiumTypeLabel, moduleDescriptions, type ModuleKey } from "./modules";
import { getCondominiumModules, updateCondominiumModules, type CondominiumModules } from "./moduleService";

// Admin turns the condominium's modules on and off. Menus follow right after saving.
export function ModulesModal({ condominiumId, onClose }: { condominiumId: number; onClose: () => void }) {
  const { refreshCondominiums } = useCondominium();
  const [loaded, setLoaded] = useState<CondominiumModules | null>(null);
  const [enabled, setEnabled] = useState<ModuleKey[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    getCondominiumModules(condominiumId)
      .then((data) => {
        if (!isMounted) return;
        setLoaded(data);
        setEnabled(data.modules.filter((module) => module.enabled).map((module) => module.key));
      })
      .catch((error) => isMounted && setErrorMessage(error instanceof Error ? error.message : "Não foi possível carregar os módulos."));

    return () => {
      isMounted = false;
    };
  }, [condominiumId]);

  function toggle(key: ModuleKey, checked: boolean) {
    setSuccessMessage("");
    setEnabled((current) => (checked ? [...current, key] : current.filter((item) => item !== key)));
  }

  async function handleSave() {
    setIsSaving(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const saved = await updateCondominiumModules(condominiumId, enabled);
      setLoaded(saved);
      await refreshCondominiums();
      setSuccessMessage("Módulos salvos. O menu de todos do condomínio já mostra só o que está ligado.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Não foi possível salvar os módulos.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Modal
      title="Módulos do condomínio"
      description={loaded ? `${condominiumTypeLabel(loaded.type)}. Desligar esconde a área para todos; nada é apagado.` : "O que aparece no menu de todos do condomínio."}
      onClose={onClose}
      footer={
        <>
          <Button variant="quiet" onClick={onClose}>
            Fechar
          </Button>
          {loaded && (
            <Button onClick={() => void handleSave()} isLoading={isSaving} loadingText="Salvando…">
              Salvar
            </Button>
          )}
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <FormFeedback errorMessage={errorMessage} successMessage={successMessage} />

        {!loaded ? (
          !errorMessage && <p className="py-6 text-center text-sm text-tinta-suave">Carregando…</p>
        ) : (
          <>
            <div className="divide-y divide-linha">
              {loaded.modules.map((module) => (
                <Switch
                  key={module.key}
                  label={module.label}
                  description={moduleDescriptions[module.key]}
                  checked={enabled.includes(module.key)}
                  onChange={(checked) => toggle(module.key, checked)}
                />
              ))}
            </div>
            <p className="rounded-field bg-campo px-4 py-3 text-[13px] text-tinta-suave">
              Financeiro, moradores, unidades e avisos ficam sempre ligados.
            </p>
          </>
        )}
      </div>
    </Modal>
  );
}
