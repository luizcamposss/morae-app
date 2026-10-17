import { useState } from "react";
import { Modal } from "../../shared/components/Modal";
import { FinancialAccountForm } from "../financialAccounts/FinancialAccountForm";
import type { FinancialAccountResponse, UpsertFinancialAccountRequest } from "../financialAccounts/types";
import { FormFeedback } from "./FormFeedback";

type PixKeyModalProps = {
  title: string;
  description: string;
  account: FinancialAccountResponse | null;
  // Saves the key where it belongs (platform or condominium) and returns the stored account.
  save: (data: UpsertFinancialAccountRequest) => Promise<FinancialAccountResponse>;
  onClose: () => void;
  onSaved: (account: FinancialAccountResponse) => void;
};

export function PixKeyModal({ title, description, account, save, onClose, onSaved }: PixKeyModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  async function handleSubmit(data: UpsertFinancialAccountRequest) {
    try {
      setIsSubmitting(true);
      setErrorMessage("");
      setSuccessMessage("");
      onSaved(await save(data));
      setSuccessMessage("Chave Pix salva.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Não foi possível salvar a chave Pix.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal title={title} description={description} onClose={onClose}>
      <FormFeedback errorMessage={errorMessage} successMessage={successMessage} className="mb-4" />
      <FinancialAccountForm account={account} isSubmitting={isSubmitting} onSubmit={handleSubmit} />
    </Modal>
  );
}
