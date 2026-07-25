import { useEffect, useState, type FormEvent } from "react";
import type {
  BankAccountType,
  FinancialAccountResponse,
  PixKeyType,
  UpsertFinancialAccountRequest,
} from "./types";

type FinancialAccountFormProps = {
  account: FinancialAccountResponse | null;
  isSubmitting: boolean;
  onSubmit: (data: UpsertFinancialAccountRequest) => Promise<void>;
};

type FormState = {
  holderName: string;
  holderDocument: string;
  bankName: string;
  bankCode: string;
  agency: string;
  accountNumber: string;
  accountDigit: string;
  accountType: BankAccountType;
  pixKeyType: PixKeyType;
  pixKey: string;
};

const initialForm: FormState = {
  holderName: "",
  holderDocument: "",
  bankName: "",
  bankCode: "",
  agency: "",
  accountNumber: "",
  accountDigit: "",
  accountType: 1,
  pixKeyType: 3,
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
      holderName: account.holderName,
      holderDocument: account.holderDocument,
      bankName: account.bankName,
      bankCode: account.bankCode,
      agency: account.agency,
      accountNumber: account.accountNumber,
      accountDigit: account.accountDigit ?? "",
      accountType: account.accountType,
      pixKeyType: account.pixKeyType,
      pixKey: account.pixKey,
    });
  }, [account]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.holderName.trim() || !form.holderDocument.trim() || !form.bankName.trim()) {
      setFormError("Informe titular, CPF/CNPJ e banco.");
      return;
    }

    if (!form.bankCode.trim() || !form.agency.trim() || !form.accountNumber.trim()) {
      setFormError("Informe código do banco, agência e conta.");
      return;
    }

    if (!form.pixKey.trim()) {
      setFormError("Informe a chave Pix recebedora.");
      return;
    }

    setFormError("");

    await onSubmit({
      holderName: form.holderName.trim(),
      holderDocument: form.holderDocument.trim(),
      bankName: form.bankName.trim(),
      bankCode: form.bankCode.trim(),
      agency: form.agency.trim(),
      accountNumber: form.accountNumber.trim(),
      accountDigit: form.accountDigit.trim() || null,
      accountType: form.accountType,
      pixKeyType: form.pixKeyType,
      pixKey: form.pixKey.trim(),
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {formError && (
        <div className="rounded-2xl border border-[#FECACA] bg-[#FDECEC] px-4 py-3 text-sm font-bold text-[#B42318]">
          {formError}
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <FormInput
          label="Titular da conta"
          value={form.holderName}
          onChange={(value) => setForm((current) => ({ ...current, holderName: value }))}
        />
        <FormInput
          label="CPF/CNPJ do titular"
          value={form.holderDocument}
          onChange={(value) => setForm((current) => ({ ...current, holderDocument: value }))}
        />
        <FormInput
          label="Banco"
          value={form.bankName}
          onChange={(value) => setForm((current) => ({ ...current, bankName: value }))}
        />
        <FormInput
          label="Código do banco"
          value={form.bankCode}
          onChange={(value) => setForm((current) => ({ ...current, bankCode: value }))}
        />
        <FormInput
          label="Agência"
          value={form.agency}
          onChange={(value) => setForm((current) => ({ ...current, agency: value }))}
        />
        <div className="grid grid-cols-[1fr_90px] gap-3">
          <FormInput
            label="Conta"
            value={form.accountNumber}
            onChange={(value) => setForm((current) => ({ ...current, accountNumber: value }))}
          />
          <FormInput
            label="Dígito"
            value={form.accountDigit}
            onChange={(value) => setForm((current) => ({ ...current, accountDigit: value }))}
          />
        </div>
        <label className="block">
          <span className="mb-2 block text-sm font-extrabold text-[#111827]">
            Tipo de conta
          </span>
          <select
            value={form.accountType}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                accountType: Number(event.target.value) as BankAccountType,
              }))
            }
            className="h-12 w-full rounded-2xl border border-[#E5E7EB] bg-white px-4 text-sm font-bold text-[#111827] outline-none transition focus:border-[#22C55E] focus:ring-4 focus:ring-[#86EFAC]/30"
          >
            <option value={1}>Conta corrente</option>
            <option value={2}>Conta poupança</option>
            <option value={3}>Conta pagamento</option>
          </select>
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-extrabold text-[#111827]">
            Tipo de chave Pix
          </span>
          <select
            value={form.pixKeyType}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                pixKeyType: Number(event.target.value) as PixKeyType,
              }))
            }
            className="h-12 w-full rounded-2xl border border-[#E5E7EB] bg-white px-4 text-sm font-bold text-[#111827] outline-none transition focus:border-[#22C55E] focus:ring-4 focus:ring-[#86EFAC]/30"
          >
            <option value={1}>CPF</option>
            <option value={2}>CNPJ</option>
            <option value={3}>E-mail</option>
            <option value={4}>Telefone</option>
            <option value={5}>Chave aleatória</option>
          </select>
        </label>
        <FormInput
          label="Chave Pix"
          value={form.pixKey}
          onChange={(value) => setForm((current) => ({ ...current, pixKey: value }))}
          className="md:col-span-2"
        />
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="h-12 w-full cursor-pointer rounded-2xl bg-[#16A34A] text-sm font-extrabold text-white shadow-sm shadow-[#16A34A]/30 transition hover:bg-[#0B3D2E] disabled:cursor-not-allowed disabled:bg-[#9CA3AF]"
      >
        {isSubmitting ? "Salvando..." : account ? "Atualizar dados financeiros" : "Cadastrar dados financeiros"}
      </button>
    </form>
  );
}

type FormInputProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
};

function FormInput({ label, value, onChange, className = "" }: FormInputProps) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-2 block text-sm font-extrabold text-[#111827]">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-12 w-full rounded-2xl border border-[#E5E7EB] bg-white px-4 text-sm font-bold text-[#111827] outline-none transition focus:border-[#22C55E] focus:ring-4 focus:ring-[#86EFAC]/30"
      />
    </label>
  );
}
