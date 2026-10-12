import { useState, type FormEvent } from "react";
import { Button } from "../../shared/components/Button";
import { TextField } from "../../shared/components/TextField";
import type { FinancialAccountResponse, UpsertFinancialAccountRequest } from "./types";

type FinancialAccountFormProps = {
  account: FinancialAccountResponse | null;
  isSubmitting: boolean;
  onSubmit: (data: UpsertFinancialAccountRequest) => Promise<void>;
};

// Starts with the saved key; remount it (key prop) to reset after loading another account.
export function FinancialAccountForm({ account, isSubmitting, onSubmit }: FinancialAccountFormProps) {
  const [pixKey, setPixKey] = useState(account?.pixKey ?? "");
  const [formError, setFormError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = pixKey.trim();

    if (!value) {
      setFormError("Informe a chave Pix.");
      return;
    }

    if (value.length < 3) {
      setFormError("A chave Pix precisa ter pelo menos 3 caracteres.");
      return;
    }

    setFormError("");
    await onSubmit({ pixKey: value });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <TextField
        label="Chave Pix"
        value={pixKey}
        onChange={(event) => setPixKey(event.target.value)}
        placeholder="CPF, CNPJ, e-mail, telefone ou chave aleatória"
        error={formError || undefined}
        hint="Os pagamentos manuais são feitos para esta chave."
      />
      <Button type="submit" fullWidth isLoading={isSubmitting} loadingText="Salvando…">
        {account?.pixKey ? "Atualizar chave Pix" : "Cadastrar chave Pix"}
      </Button>
    </form>
  );
}
