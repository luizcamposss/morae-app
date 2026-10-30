import { useState, type FormEvent } from "react";
import { Button } from "../../shared/components/Button";
import { Modal } from "../../shared/components/Modal";
import { TextField } from "../../shared/components/TextField";

type SuspendAccessModalProps = {
  personName: string;
  condominiumName: string;
  isSaving: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
};

const FORM_ID = "suspend-access-form";

// The reason is shown to the person on the "Acesso pausado" screen.
export function SuspendAccessModal({ personName, condominiumName, isSaving, onClose, onConfirm }: SuspendAccessModalProps) {
  const [reason, setReason] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onConfirm(reason.trim());
  }

  return (
    <Modal
      title={`Suspender ${personName}?`}
      description={`A pessoa perde o acesso ao ${condominiumName} até ser reativada. Nenhum dado é apagado.`}
      onClose={onClose}
      footer={
        <>
          <Button variant="quiet" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form={FORM_ID} variant="danger" isLoading={isSaving} loadingText="Suspendendo…">
            Suspender acesso
          </Button>
        </>
      }
    >
      <form id={FORM_ID} onSubmit={handleSubmit}>
        <TextField
          label="Motivo (opcional)"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          maxLength={300}
          placeholder="Ex.: contrato encerrado com a administradora"
          hint="Aparece para a pessoa na tela de acesso pausado."
        />
      </form>
    </Modal>
  );
}
