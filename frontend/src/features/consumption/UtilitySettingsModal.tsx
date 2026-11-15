import { useState } from "react";
import { Button } from "../../shared/components/Button";
import { Modal } from "../../shared/components/Modal";
import { Switch } from "../../shared/components/Switch";
import { FormFeedback } from "../settings/FormFeedback";
import { UTILITIES, saveUtilitySettings, type Utility } from "./consumptionService";

// Which of water, light and gas the condominium bills per unit (columns of "Água, luz e gás").
export function UtilitySettingsModal({ condominiumId, current, onClose, onSaved }: { condominiumId: number; current: Utility[]; onClose: () => void; onSaved: (utilities: Utility[]) => void }) {
  const [picked, setPicked] = useState<Utility[]>(current);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSave() {
    setIsSaving(true);
    setErrorMessage("");
    try {
      const saved = await saveUtilitySettings(condominiumId, picked);
      onSaved(saved.utilities);
      onClose();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Não foi possível salvar.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Modal
      title="Água, luz e gás"
      description="O que o condomínio cobra por unidade. O valor de cada mês é digitado na tela Água, luz e gás."
      onClose={onClose}
      footer={
        <>
          <Button variant="quiet" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={() => void handleSave()} isLoading={isSaving} loadingText="Salvando…">
            Salvar
          </Button>
        </>
      }
    >
      <FormFeedback errorMessage={errorMessage} successMessage="" />
      <div className="divide-y divide-linha">
        {UTILITIES.map((utility) => (
          <Switch
            key={utility.value}
            label={utility.label}
            checked={picked.includes(utility.value)}
            onChange={(checked) => setPicked(checked ? [...picked, utility.value] : picked.filter((item) => item !== utility.value))}
          />
        ))}
      </div>
    </Modal>
  );
}
