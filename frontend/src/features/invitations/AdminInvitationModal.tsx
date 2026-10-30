import { useState, type FormEvent } from "react";
import { Button } from "../../shared/components/Button";
import { Modal } from "../../shared/components/Modal";
import { SelectField } from "../../shared/components/SelectField";
import { TextField } from "../../shared/components/TextField";
import type { CondominiumResponse } from "../condominiums/types";
import {
  formatCpfInput,
  formatPhoneInput,
  isValidCpf,
  isValidEmail,
  onlyDigits,
  type CreateAdminInvitationRequest,
} from "../masterCondominiums/condominiumForm";

type AdminInvitationModalProps = {
  // Fixed condominium (opened from it), or a list to choose from.
  condominium?: CondominiumResponse;
  condominiums?: CondominiumResponse[];
  isSaving: boolean;
  errorMessage: string;
  onClose: () => void;
  onConfirm: (data: CreateAdminInvitationRequest) => Promise<void>;
};

const FORM_ID = "admin-invitation-form";

export function AdminInvitationModal({ condominium, condominiums = [], isSaving, errorMessage, onClose, onConfirm }: AdminInvitationModalProps) {
  const [form, setForm] = useState({ name: "", cpf: "", phoneNumber: "", email: "", condominiumId: condominium ? String(condominium.id) : "" });
  const [localError, setLocalError] = useState("");

  function updateField(field: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
    setLocalError("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.condominiumId) {
      setLocalError("Escolha o condomínio.");
      return;
    }

    if (form.name.trim().length < 3) {
      setLocalError("Informe o nome completo do admin.");
      return;
    }

    if (!isValidCpf(form.cpf)) {
      setLocalError("Informe um CPF válido.");
      return;
    }

    const phoneDigits = onlyDigits(form.phoneNumber);

    if (phoneDigits.length < 10 || phoneDigits.length > 11) {
      setLocalError("Informe um telefone válido com DDD.");
      return;
    }

    if (!isValidEmail(form.email)) {
      setLocalError("Informe um e-mail válido.");
      return;
    }

    await onConfirm({
      condominiumId: Number(form.condominiumId),
      name: form.name.trim(),
      cpf: form.cpf,
      phoneNumber: form.phoneNumber,
      email: form.email.trim(),
    });
  }

  const message = localError || errorMessage;

  return (
    <Modal
      title="Convidar admin"
      description={condominium ? `O convite para administrar o ${condominium.name} vai por e-mail.` : "O convite vai por e-mail e a pessoa cria a própria senha."}
      onClose={onClose}
      footer={
        <>
          <Button variant="quiet" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form={FORM_ID} isLoading={isSaving} loadingText="Enviando…">
            Enviar convite
          </Button>
        </>
      }
    >
      <form id={FORM_ID} onSubmit={handleSubmit} noValidate className="grid gap-4 sm:grid-cols-2">
        {message && (
          <p role="alert" className="rounded-field bg-vermelho-suave px-4 py-3 text-sm font-medium text-vermelho sm:col-span-2">
            {message}
          </p>
        )}
        {!condominium && (
          <SelectField
            className="sm:col-span-2"
            label="Condomínio"
            value={form.condominiumId}
            onChange={(event) => updateField("condominiumId", event.target.value)}
            placeholder="Selecione o condomínio"
            options={condominiums.map((item) => ({ value: String(item.id), label: item.name }))}
          />
        )}
        <TextField className="sm:col-span-2" label="Nome" value={form.name} onChange={(event) => updateField("name", event.target.value)} placeholder="Carla Mendes" />
        <TextField label="CPF" value={form.cpf} onChange={(event) => updateField("cpf", formatCpfInput(event.target.value))} placeholder="000.000.000-00" inputMode="numeric" />
        <TextField label="Telefone" value={form.phoneNumber} onChange={(event) => updateField("phoneNumber", formatPhoneInput(event.target.value))} placeholder="(11) 99999-9999" inputMode="tel" />
        <TextField className="sm:col-span-2" label="E-mail" type="email" value={form.email} onChange={(event) => updateField("email", event.target.value)} placeholder="admin@email.com" />
      </form>
    </Modal>
  );
}
