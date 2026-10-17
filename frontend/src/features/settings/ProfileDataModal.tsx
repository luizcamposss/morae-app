import { useState, type FormEvent } from "react";
import { Button } from "../../shared/components/Button";
import { Modal } from "../../shared/components/Modal";
import { TextField } from "../../shared/components/TextField";
import { updateMyProfile } from "../me/meService";
import { FormFeedback } from "./FormFeedback";
import { formatPhone, onlyDigits } from "./phone";

type ProfileDataModalProps = {
  userName: string;
  phoneNumber: string;
  onClose: () => void;
  onSaved: () => Promise<unknown>;
};

// Name and phone of the signed-in user (shared by the settings screens).
export function ProfileDataModal({ userName, phoneNumber, onClose, onSaved }: ProfileDataModalProps) {
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
        <FormFeedback errorMessage={errorMessage} successMessage={successMessage} />
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
