import { useState, type FormEvent } from "react";
import { Button } from "../../shared/components/Button";
import { Modal } from "../../shared/components/Modal";
import { PasswordRequirements } from "../../shared/components/PasswordRequirements";
import { TextField } from "../../shared/components/TextField";
import { isStrongPassword } from "../../shared/lib/password";
import { changePassword } from "./authService";

type ChangePasswordModalProps = {
  onClose: () => void;
};

export function ChangePasswordModal({ onClose }: ChangePasswordModalProps) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isDone, setIsDone] = useState(false);

  const confirmationMatches = confirmation.length > 0 && confirmation === newPassword;
  const canSubmit =
    currentPassword.length > 0 && isStrongPassword(newPassword) && confirmationMatches && !isSubmitting;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canSubmit) {
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage("");
      await changePassword(currentPassword, newPassword);
      setIsDone(true);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Não foi possível alterar a senha.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isDone) {
    return (
      <Modal
        title="Senha alterada"
        description="Você continua conectado aqui. Os outros aparelhos foram desconectados e vão pedir a nova senha."
        onClose={onClose}
        footer={<Button onClick={onClose}>Fechar</Button>}
      >
        <p className="text-[15px] text-tinta-suave">Enviamos um e-mail avisando da troca.</p>
      </Modal>
    );
  }

  return (
    <Modal
      title="Trocar senha"
      description="Por segurança, os outros aparelhos conectados são desconectados."
      onClose={onClose}
      footer={
        <>
          <Button variant="quiet" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="change-password" disabled={!canSubmit} isLoading={isSubmitting} loadingText="Salvando…">
            Salvar nova senha
          </Button>
        </>
      }
    >
      <form id="change-password" onSubmit={handleSubmit} className="flex flex-col gap-4">
        {errorMessage && (
          <p role="alert" className="rounded-field bg-vermelho-suave px-4 py-3 text-sm font-medium text-vermelho">
            {errorMessage}
          </p>
        )}
        <TextField label="Senha atual" type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} autoComplete="current-password" />
        <TextField label="Nova senha" type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} autoComplete="new-password" />
        <TextField label="Repita a nova senha" type="password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} autoComplete="new-password" />
        <PasswordRequirements password={newPassword} confirmation={confirmation} />
      </form>
    </Modal>
  );
}
