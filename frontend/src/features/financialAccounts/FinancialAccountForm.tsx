import { useEffect, useState, type FormEvent } from "react";
import type {
  FinancialAccountResponse,
  UpsertFinancialAccountRequest,
} from "./types";

type FinancialAccountFormProps = {
  account: FinancialAccountResponse | null;
  isSubmitting: boolean;
  onSubmit: (data: UpsertFinancialAccountRequest) => Promise<void>;
};

type FormState = {
  pixKey: string;
};

const initialForm: FormState = {
  pixKey: "",
};

export function FinancialAccountForm({
  account,
  isSubmitting,
  onSubmit,
}: FinancialAccountFormProps) {
  const [form, setForm] = useState<FormState>(initialForm);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    if (!account) {
      setForm(initialForm);
      return;
    }

    setForm({
      pixKey: account.pixKey,
    });
  }, [account]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const pixKey = form.pixKey.trim();

    if (!pixKey) {
      setFormError("Informe a chave Pix.");
      return;
    }

    if (pixKey.length < 3) {
      setFormError("A chave Pix precisa ter pelo menos 3 caracteres.");
      return;
    }

    setFormError("");

    await onSubmit({
      pixKey,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {formError && (
        <div className="rounded-2xl border border-[#FECACA] bg-[#FDECEC] px-4 py-3 text-sm font-bold text-[#B42318]">
          {formError}
        </div>
      )}

      <div className="grid grid-cols-1 gap-5">
        <FormInput
          label="Chave Pix"
          value={form.pixKey}
          onChange={(value) => setForm((current) => ({ ...current, pixKey: value }))}
          placeholder="CPF, CNPJ, e-mail, telefone ou chave aleatória"
        />
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="h-12 w-full cursor-pointer rounded-2xl bg-[#16A34A] text-sm font-extrabold text-white shadow-sm shadow-[#16A34A]/30 transition hover:bg-[#0B3D2E] disabled:cursor-not-allowed disabled:bg-[#9CA3AF]"
      >
        {isSubmitting ? "Salvando..." : account ? "Atualizar chave Pix" : "Cadastrar chave Pix"}
      </button>
    </form>
  );
}

type FormInputProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
};

function FormInput({ label, value, onChange, placeholder, className = "" }: FormInputProps) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-2 block text-sm font-extrabold text-[#111827]">{label}</span>
      <input
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="h-12 w-full rounded-2xl border border-[#E5E7EB] bg-white px-4 text-sm font-bold text-[#111827] outline-none transition focus:border-[#22C55E] focus:ring-4 focus:ring-[#86EFAC]/30"
      />
    </label>
  );
}
