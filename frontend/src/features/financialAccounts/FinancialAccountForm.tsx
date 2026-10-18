import { useState, type FormEvent } from "react";
import { Button } from "../../shared/components/Button";
import { SelectField } from "../../shared/components/SelectField";
import { TextField } from "../../shared/components/TextField";
import {
  PixKeyType,
  detectPixKeyType,
  formatPixKeyInput,
  normalizePixKey,
  pixKeyPlaceholders,
  pixKeyTypeOptions,
  validatePixKey,
} from "./pixKey";
import type { FinancialAccountResponse, UpsertFinancialAccountRequest } from "./types";

type FinancialAccountFormProps = {
  account: FinancialAccountResponse | null;
  isSubmitting: boolean;
  onSubmit: (data: UpsertFinancialAccountRequest) => Promise<void>;
};

const inputModes: Record<PixKeyType, "numeric" | "email" | "tel" | "text"> = {
  [PixKeyType.Cpf]: "numeric",
  [PixKeyType.Cnpj]: "numeric",
  [PixKeyType.Email]: "email",
  [PixKeyType.Phone]: "tel",
  [PixKeyType.Random]: "text",
};

// Saved type when the key matches it; otherwise (older keys saved without a type) guess by the format.
function initialType(account: FinancialAccountResponse | null): PixKeyType | null {
  if (!account?.pixKey) return null;
  if (account.pixKeyType && !validatePixKey(account.pixKeyType, account.pixKey)) return account.pixKeyType;
  return detectPixKeyType(account.pixKey);
}

// Starts with the saved key; remount it (key prop) to reset after loading another account.
export function FinancialAccountForm({ account, isSubmitting, onSubmit }: FinancialAccountFormProps) {
  const [pixKeyType, setPixKeyType] = useState<PixKeyType | null>(() => initialType(account));
  const [pixKey, setPixKey] = useState(() => {
    const type = initialType(account);
    return type ? formatPixKeyInput(type, account?.pixKey ?? "") : (account?.pixKey ?? "");
  });
  const [formError, setFormError] = useState("");

  function handleTypeChange(value: string) {
    setPixKeyType(value ? (Number(value) as PixKeyType) : null);
    setPixKey("");
    setFormError("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!pixKeyType) {
      setFormError("Escolha o tipo da chave Pix.");
      return;
    }

    const error = validatePixKey(pixKeyType, pixKey);
    if (error) {
      setFormError(error);
      return;
    }

    setFormError("");
    await onSubmit({ pixKeyType, pixKey: normalizePixKey(pixKeyType, pixKey) });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      <SelectField
        label="Tipo da chave"
        placeholder="Escolha o tipo"
        options={pixKeyTypeOptions}
        value={pixKeyType ? String(pixKeyType) : ""}
        onChange={(event) => handleTypeChange(event.target.value)}
        error={!pixKeyType && formError ? formError : undefined}
      />
      <TextField
        label="Chave Pix"
        value={pixKey}
        onChange={(event) => setPixKey(pixKeyType ? formatPixKeyInput(pixKeyType, event.target.value) : event.target.value)}
        disabled={!pixKeyType}
        type={pixKeyType === PixKeyType.Email ? "email" : "text"}
        inputMode={pixKeyType ? inputModes[pixKeyType] : undefined}
        autoComplete="off"
        spellCheck={false}
        placeholder={pixKeyType ? pixKeyPlaceholders[pixKeyType] : "Escolha o tipo primeiro"}
        error={pixKeyType && formError ? formError : undefined}
        hint={pixKeyType === PixKeyType.Phone ? "Celular do Brasil (+55) com DDD." : "Os pagamentos manuais são feitos para esta chave."}
      />
      <Button type="submit" fullWidth isLoading={isSubmitting} loadingText="Salvando…">
        {account?.pixKey ? "Atualizar chave Pix" : "Cadastrar chave Pix"}
      </Button>
    </form>
  );
}
