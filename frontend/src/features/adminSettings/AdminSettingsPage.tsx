import { useEffect, useState } from "react";
import { useCondominium } from "../../app/providers/useCondominium";
import { FinancialAccountForm } from "../financialAccounts/FinancialAccountForm";
import { ProfilePhotoBlock } from "../profile/ProfilePhotoBlock";
import {
  getCondominiumFinancialAccount,
  upsertCondominiumFinancialAccount,
} from "../financialAccounts/financialAccountService";
import type {
  FinancialAccountResponse,
  UpsertFinancialAccountRequest,
} from "../financialAccounts/types";

export function AdminSettingsPage() {
  const { activeCondominium, activeCondominiumId } = useCondominium();
  const [account, setAccount] = useState<FinancialAccountResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  async function loadAccount() {
    if (!activeCondominiumId) {
      setAccount(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setErrorMessage("");
      setAccount(await getCondominiumFinancialAccount(activeCondominiumId));
    } catch (error) {
      setAccount(null);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível carregar os dados financeiros do condomínio.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadAccount();
  }, [activeCondominiumId]);

  async function handleSubmit(data: UpsertFinancialAccountRequest) {
    if (!activeCondominiumId) {
      setErrorMessage("Selecione um condomínio antes de salvar os dados financeiros.");
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage("");
      setSuccessMessage("");

      const result = await upsertCondominiumFinancialAccount(activeCondominiumId, data);
      setAccount(result);
      setSuccessMessage("Dados financeiros do condomínio salvos com sucesso.");
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível salvar os dados financeiros.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const hasBankAccount = Boolean(account?.bankName && account?.agency && account?.accountNumber);
  const hasPixKey = Boolean(account?.pixKey);
  const condominiumName = activeCondominium?.condominiumName ?? "Nenhum condomínio selecionado";

  return (
    <div className="space-y-7">
      <header>
        <p className="text-sm font-black uppercase tracking-[0.2em] text-[#16A34A]">
          Configurações
        </p>
        <h1 className="mt-2 text-4xl font-black tracking-tight text-[#111827]">
          Dados financeiros
        </h1>
        <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-[#6B7280]">
          Cadastre a conta bancária e a chave Pix do condomínio ativo para
          organizar recebimentos internos.
        </p>
        <p className="mt-2 text-sm font-bold text-[#16A34A]">{condominiumName}</p>
      </header>

      <ProfilePhotoBlock />

      {errorMessage && <FeedbackMessage variant="error" message={errorMessage} />}
      {successMessage && <FeedbackMessage variant="success" message={successMessage} />}

      <section className="grid grid-cols-1 gap-5 md:grid-cols-3">
        <SettingsBlock
          title="Conta bancária"
          description="Conta recebedora do condomínio selecionado."
          status={hasBankAccount ? "Cadastrada" : "Pendente"}
          tone={hasBankAccount ? "success" : "warning"}
        />
        <SettingsBlock
          title="Chave Pix"
          description="Chave usada nos recebimentos do condomínio."
          status={hasPixKey ? "Cadastrada" : "Pendente"}
          tone={hasPixKey ? "success" : "warning"}
        />
        <SettingsBlock
          title="Condomínio ativo"
          description={condominiumName}
          status={activeCondominiumId ? "Selecionado" : "Pendente"}
          tone={activeCondominiumId ? "success" : "warning"}
        />
      </section>

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-[2rem] border border-[#E5E7EB] bg-white p-6 shadow-sm">
          <div>
            <h2 className="text-2xl font-black text-[#111827]">
              Conta recebedora do condomínio
            </h2>
            <p className="mt-1 text-sm font-semibold text-[#6B7280]">
              Esses dados pertencem ao condomínio selecionado e não ficam visíveis para o Master.
            </p>
          </div>

          <div className="mt-6">
            {isLoading ? (
              <div className="rounded-2xl border border-dashed border-[#D1D5DB] bg-[#F9FAFB] px-4 py-10 text-center text-sm font-bold text-[#6B7280]">
                Carregando dados financeiros...
              </div>
            ) : (
              <FinancialAccountForm
                account={account}
                isSubmitting={isSubmitting}
                onSubmit={handleSubmit}
              />
            )}
          </div>
        </div>

        <aside className="space-y-5">
          <section className="rounded-[2rem] border border-[#E5E7EB] bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-black text-[#111827]">Resumo</h2>
            <div className="mt-5 space-y-3">
              <InfoRow label="Status" value={account ? "Cadastrado" : "Não cadastrado"} />
              <InfoRow label="Banco" value={account?.bankName ?? "-"} />
              <InfoRow label="Pix" value={account?.pixKey ?? "-"} />
              <InfoRow
                label="Atualizado em"
                value={account ? formatDate(account.updatedAt) : "-"}
              />
            </div>
          </section>

          <section className="rounded-[2rem] border border-[#BBF7D0] bg-[#DCFCE7] p-6">
            <h2 className="text-xl font-black text-[#0B3D2E]">Escopo do Admin</h2>
            <p className="mt-3 text-sm font-bold leading-6 text-[#0B3D2E]/80">
              O Admin cadastra somente os dados financeiros dos condomínios onde
              possui acesso ativo. A conta da plataforma MORAÊ continua restrita ao Master.
            </p>
          </section>
        </aside>
      </section>
    </div>
  );
}

type SettingsBlockProps = {
  title: string;
  description: string;
  status: string;
  tone: "success" | "warning";
};

function SettingsBlock({ title, description, status, tone }: SettingsBlockProps) {
  const statusClasses =
    tone === "success"
      ? "bg-[#DCFCE7] text-[#0B3D2E]"
      : "bg-[#FEF3C7] text-[#92400E]";

  return (
    <article className="min-h-40 rounded-[1.5rem] border border-[#E5E7EB] bg-[#F3F4F6] p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-[#86EFAC] hover:bg-[#DCFCE7] hover:shadow-md">
      <span className="block text-2xl font-extrabold text-[#111827]">{title}</span>
      <span className="mt-3 block text-sm font-semibold leading-6 text-[#6B7280]">
        {description}
      </span>
      <span className={`mt-5 inline-flex rounded-full px-3 py-1 text-xs font-black ${statusClasses}`}>
        {status}
      </span>
    </article>
  );
}

type FeedbackMessageProps = {
  message: string;
  variant: "success" | "error";
};

function FeedbackMessage({ message, variant }: FeedbackMessageProps) {
  const classes =
    variant === "success"
      ? "border-[#BBF7D0] bg-[#DCFCE7] text-[#0B3D2E]"
      : "border-[#FECACA] bg-[#FDECEC] text-[#B42318]";

  return (
    <div className={`rounded-2xl border px-4 py-3 text-sm font-bold ${classes}`}>
      {message}
    </div>
  );
}

type InfoRowProps = {
  label: string;
  value: string;
};

function InfoRow({ label, value }: InfoRowProps) {
  return (
    <div className="rounded-2xl bg-[#F3F4F6] px-4 py-3">
      <p className="text-xs font-black uppercase tracking-wide text-[#6B7280]">{label}</p>
      <p className="mt-1 break-words text-sm font-extrabold text-[#111827]">{value}</p>
    </div>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR").format(new Date(value));
}
