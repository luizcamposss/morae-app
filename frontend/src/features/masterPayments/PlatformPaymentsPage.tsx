import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { MetricCard } from "../../shared/components/MetricCard";
import { StatusBadge } from "../../shared/components/StatusBadge";
import { cancelCharge, createCharge, getPlatformCharges } from "../charges/chargeService";
import type { ChargeResponse } from "../charges/types";
import { getCondominiums } from "../condominiums/condominiumService";
import type { CondominiumResponse } from "../condominiums/types";
import { createManualPayment } from "../payments/paymentService";
import type { PaymentMethod } from "../payments/types";

type CreateFormState = {
  condominiumId: string;
  description: string;
  value: string;
  dueDate: string;
};

type PaymentFormState = {
  chargeId: number;
  amountPaid: string;
  paymentMethod: PaymentMethod;
  paidAt: string;
  notes: string;
};

type CancelFormState = {
  chargeId: number;
  reason: string;
};

const initialCreateForm: CreateFormState = {
  condominiumId: "",
  description: "",
  value: "",
  dueDate: "",
};

export function PlatformPaymentsPage() {
  const [charges, setCharges] = useState<ChargeResponse[]>([]);
  const [condominiums, setCondominiums] = useState<CondominiumResponse[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CreateFormState>(initialCreateForm);
  const [paymentForm, setPaymentForm] = useState<PaymentFormState | null>(null);
  const [cancelForm, setCancelForm] = useState<CancelFormState | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  async function loadPage() {
    try {
      setIsLoading(true);
      setErrorMessage("");

      const [platformCharges, masterCondominiums] = await Promise.all([
        getPlatformCharges(),
        getCondominiums(),
      ]);

      setCharges(platformCharges);
      setCondominiums(masterCondominiums);
    } catch (error) {
      setCharges([]);
      setCondominiums([]);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível carregar os pagamentos da plataforma.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadPage();
  }, []);

  async function handleCreateCharge(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!createForm.condominiumId || !createForm.description.trim() || !createForm.value || !createForm.dueDate) {
      setErrorMessage("Preencha condomínio, descrição, valor e vencimento.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      await createCharge({
        scope: 1,
        condominiumId: Number(createForm.condominiumId),
        targetUserId: null,
        unitId: null,
        value: Number(createForm.value),
        dueDate: createForm.dueDate,
        description: createForm.description.trim(),
      });

      setCreateForm(initialCreateForm);
      setIsCreateOpen(false);
      setSuccessMessage("Cobrança da plataforma criada com sucesso.");
      await loadPage();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Não foi possível criar a cobrança.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleManualPayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!paymentForm) {
      return;
    }

    if (!paymentForm.amountPaid || paymentForm.paymentMethod === 0) {
      setErrorMessage("Informe valor pago e método de pagamento.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      await createManualPayment(paymentForm.chargeId, {
        amountPaid: Number(paymentForm.amountPaid),
        paymentMethod: paymentForm.paymentMethod,
        paidAt: paymentForm.paidAt || null,
        notes: paymentForm.notes.trim() || null,
      });

      setPaymentForm(null);
      setSuccessMessage("Pagamento registrado com sucesso.");
      await loadPage();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Não foi possível registrar o pagamento.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleCancelCharge(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!cancelForm) {
      return;
    }

    if (!cancelForm.reason.trim()) {
      setErrorMessage("Informe o motivo do cancelamento.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      await cancelCharge(cancelForm.chargeId, cancelForm.reason.trim());
      setCancelForm(null);
      setSuccessMessage("Cobrança cancelada com sucesso.");
      await loadPage();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Não foi possível cancelar a cobrança.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const filteredCharges = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return charges.filter((charge) => {
      const searchableText = [
        charge.description,
        charge.condominiumName,
        charge.id.toString(),
      ]
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        normalizedSearch.length === 0 || searchableText.includes(normalizedSearch);
      const matchesStatus =
        statusFilter === "all" || charge.status.toString() === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [charges, searchTerm, statusFilter]);

  const pendingCharges = charges.filter((charge) => charge.status === 1);
  const paidCharges = charges.filter((charge) => charge.status === 2);
  const overdueCharges = charges.filter((charge) => charge.status === 3);

  return (
    <>
      <section className="rounded-[2rem] border border-[#E5E7EB] bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-[#111827]">
              Pagamentos
            </h1>
            <p className="mt-1 text-sm font-semibold text-[#6B7280]">
              Cobranças institucionais da plataforma MORAÊ.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={loadPage}
              className="h-11 cursor-pointer rounded-2xl border border-[#E5E7EB] bg-white px-5 text-sm font-bold text-[#6B7280] transition hover:bg-[#DCFCE7] hover:text-[#0B3D2E]"
            >
              Atualizar
            </button>
            <button
              type="button"
              onClick={() => setIsCreateOpen(true)}
              disabled={condominiums.length === 0}
              className="h-11 cursor-pointer rounded-2xl bg-[#16A34A] px-5 text-sm font-extrabold text-white shadow-sm shadow-[#16A34A]/30 transition hover:bg-[#0B3D2E] disabled:cursor-not-allowed disabled:bg-[#9CA3AF]"
            >
              + Nova cobrança
            </button>
          </div>
        </div>

        {errorMessage && <FeedbackMessage variant="error" message={errorMessage} />}
        {successMessage && <FeedbackMessage variant="success" message={successMessage} />}

        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Total lançado"
            value={formatCurrency(sumCharges(charges))}
            helper={`${charges.length} cobranças`}
          />
          <MetricCard
            label="Recebido"
            value={formatCurrency(sumCharges(paidCharges))}
            helper="Cobranças pagas"
          />
          <MetricCard
            label="Em aberto"
            value={formatCurrency(sumCharges(pendingCharges))}
            helper={`${pendingCharges.length} pendentes`}
          />
          <MetricCard
            label="Atrasado"
            value={formatCurrency(sumCharges(overdueCharges))}
            helper={`${overdueCharges.length} atrasadas`}
          />
        </div>

        <div className="mt-6 rounded-[1.5rem] border border-[#E5E7EB] bg-[#F3F4F6] p-4">
          <div className="mb-4 flex flex-col gap-3 md:flex-row">
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Buscar por descrição, condomínio ou ID..."
              className="h-11 flex-1 rounded-2xl border border-[#E5E7EB] bg-white px-4 text-sm font-semibold text-[#111827] outline-none transition placeholder:text-[#9CA3AF] focus:border-[#22C55E] focus:ring-4 focus:ring-[#86EFAC]/30"
            />

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="h-11 rounded-2xl border border-[#E5E7EB] bg-white px-5 text-sm font-bold text-[#6B7280] outline-none transition focus:border-[#22C55E] focus:ring-4 focus:ring-[#86EFAC]/30"
            >
              <option value="all">Todos</option>
              <option value="1">Pendentes</option>
              <option value="2">Pagos</option>
              <option value="3">Atrasados</option>
              <option value="4">Cancelados</option>
            </select>
          </div>

          <div className="overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead className="bg-[#DCFCE7] text-xs uppercase tracking-wide text-[#0B3D2E]">
                  <tr>
                    <th className="px-4 py-3 font-extrabold">Cobrança</th>
                    <th className="px-4 py-3 font-extrabold">Condomínio</th>
                    <th className="px-4 py-3 font-extrabold">Valor</th>
                    <th className="px-4 py-3 font-extrabold">Vencimento</th>
                    <th className="px-4 py-3 font-extrabold">Status</th>
                    <th className="px-4 py-3 font-extrabold">Ações</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-[#E5E7EB]">
                  {isLoading ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-10 text-center font-bold text-[#6B7280]">
                        Carregando cobranças...
                      </td>
                    </tr>
                  ) : filteredCharges.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-10 text-center font-bold text-[#6B7280]">
                        Nenhuma cobrança da plataforma encontrada.
                      </td>
                    </tr>
                  ) : (
                    filteredCharges.map((charge) => (
                      <tr key={charge.id} className="transition hover:bg-[#F3F4F6]">
                        <td className="px-4 py-4 font-extrabold text-[#111827]">
                          {charge.description}
                        </td>
                        <td className="px-4 py-4 font-semibold text-[#6B7280]">
                          {charge.condominiumName || `Condomínio #${charge.condominiumId}`}
                        </td>
                        <td className="px-4 py-4 font-semibold text-[#6B7280]">
                          {formatCurrency(charge.value)}
                        </td>
                        <td className="px-4 py-4 font-semibold text-[#6B7280]">
                          {formatDate(charge.dueDate)}
                        </td>
                        <td className="px-4 py-4">
                          <StatusBadge
                            label={getChargeStatusLabel(charge.status)}
                            variant={getChargeStatusVariant(charge.status)}
                          />
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => openPaymentModal(charge, setPaymentForm)}
                              disabled={charge.status === 2 || charge.status === 4}
                              className="h-9 cursor-pointer rounded-xl bg-[#16A34A] px-3 text-xs font-extrabold text-white transition hover:bg-[#0B3D2E] disabled:cursor-not-allowed disabled:bg-[#D1D5DB]"
                            >
                              Baixar
                            </button>
                            <button
                              type="button"
                              onClick={() => setCancelForm({ chargeId: charge.id, reason: "" })}
                              disabled={charge.status === 2 || charge.status === 4}
                              className="h-9 cursor-pointer rounded-xl border border-[#FECACA] bg-white px-3 text-xs font-extrabold text-[#B42318] transition hover:bg-[#FDECEC] disabled:cursor-not-allowed disabled:border-[#E5E7EB] disabled:text-[#9CA3AF]"
                            >
                              Cancelar
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {isCreateOpen && (
        <Modal title="Nova cobrança" subtitle="Crie uma cobrança institucional para um condomínio.">
          <form onSubmit={handleCreateCharge}>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <label className="block md:col-span-2">
                <span className="mb-2 block text-sm font-extrabold text-[#111827]">
                  Condomínio
                </span>
                <select
                  value={createForm.condominiumId}
                  onChange={(event) =>
                    setCreateForm((current) => ({
                      ...current,
                      condominiumId: event.target.value,
                    }))
                  }
                  className="h-12 w-full rounded-2xl border border-[#E5E7EB] bg-white px-4 text-sm font-bold text-[#111827] outline-none transition focus:border-[#22C55E] focus:ring-4 focus:ring-[#86EFAC]/30"
                >
                  <option value="">Selecione</option>
                  {condominiums.map((condominium) => (
                    <option key={condominium.id} value={condominium.id}>
                      {condominium.name}
                    </option>
                  ))}
                </select>
              </label>

              <FormInput
                label="Valor"
                type="number"
                min="0.01"
                step="0.01"
                value={createForm.value}
                onChange={(value) => setCreateForm((current) => ({ ...current, value }))}
              />
              <FormInput
                label="Vencimento"
                type="date"
                value={createForm.dueDate}
                onChange={(value) => setCreateForm((current) => ({ ...current, dueDate: value }))}
              />
              <FormInput
                label="Descrição"
                value={createForm.description}
                onChange={(value) =>
                  setCreateForm((current) => ({ ...current, description: value }))
                }
                className="md:col-span-2"
              />
            </div>

            <ModalActions
              onClose={() => setIsCreateOpen(false)}
              isSubmitting={isSubmitting}
              submitLabel="Criar cobrança"
            />
          </form>
        </Modal>
      )}

      {paymentForm && (
        <Modal title="Registrar pagamento" subtitle="Baixa manual confirmada pelo Master.">
          <form onSubmit={handleManualPayment}>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <FormInput
                label="Valor pago"
                type="number"
                min="0.01"
                step="0.01"
                value={paymentForm.amountPaid}
                onChange={(value) =>
                  setPaymentForm((current) =>
                    current ? { ...current, amountPaid: value } : current,
                  )
                }
              />
              <label className="block">
                <span className="mb-2 block text-sm font-extrabold text-[#111827]">
                  Método
                </span>
                <select
                  value={paymentForm.paymentMethod}
                  onChange={(event) =>
                    setPaymentForm((current) =>
                      current
                        ? { ...current, paymentMethod: Number(event.target.value) as PaymentMethod }
                        : current,
                    )
                  }
                  className="h-12 w-full rounded-2xl border border-[#E5E7EB] bg-white px-4 text-sm font-bold text-[#111827] outline-none transition focus:border-[#22C55E] focus:ring-4 focus:ring-[#86EFAC]/30"
                >
                  <option value={0}>Selecione</option>
                  <option value={1}>Pix</option>
                  <option value={2}>Cartão de crédito</option>
                  <option value={3}>Cartão de débito</option>
                  <option value={4}>Boleto</option>
                </select>
              </label>
              <FormInput
                label="Data do pagamento"
                type="date"
                value={paymentForm.paidAt}
                onChange={(value) =>
                  setPaymentForm((current) => (current ? { ...current, paidAt: value } : current))
                }
              />
              <FormInput
                label="Observação"
                value={paymentForm.notes}
                onChange={(value) =>
                  setPaymentForm((current) => (current ? { ...current, notes: value } : current))
                }
              />
            </div>

            <ModalActions
              onClose={() => setPaymentForm(null)}
              isSubmitting={isSubmitting}
              submitLabel="Registrar baixa"
            />
          </form>
        </Modal>
      )}

      {cancelForm && (
        <Modal title="Cancelar cobrança" subtitle="Informe o motivo para manter auditoria do processo.">
          <form onSubmit={handleCancelCharge}>
            <label className="block">
              <span className="mb-2 block text-sm font-extrabold text-[#111827]">
                Motivo
              </span>
              <textarea
                value={cancelForm.reason}
                onChange={(event) =>
                  setCancelForm((current) =>
                    current ? { ...current, reason: event.target.value } : current,
                  )
                }
                className="min-h-28 w-full resize-none rounded-2xl border border-[#E5E7EB] bg-white px-4 py-3 text-sm font-bold text-[#111827] outline-none transition focus:border-[#22C55E] focus:ring-4 focus:ring-[#86EFAC]/30"
              />
            </label>

            <ModalActions
              onClose={() => setCancelForm(null)}
              isSubmitting={isSubmitting}
              submitLabel="Confirmar cancelamento"
            />
          </form>
        </Modal>
      )}
    </>
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
    <div className={`mt-5 rounded-2xl border px-4 py-3 text-sm font-bold ${classes}`}>
      {message}
    </div>
  );
}

type ModalProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
};

function Modal({ title, subtitle, children }: ModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0B3D2E]/30 px-6 py-8 backdrop-blur-sm">
      <div className="w-full max-w-3xl overflow-hidden rounded-[2rem] border border-[#E5E7EB] bg-white shadow-2xl shadow-[#0B3D2E]/20">
        <div className="border-b border-[#E5E7EB] px-6 py-5">
          <h2 className="text-2xl font-extrabold text-[#111827]">{title}</h2>
          <p className="mt-1 text-sm font-semibold text-[#6B7280]">{subtitle}</p>
        </div>
        <div className="px-8 py-7">{children}</div>
      </div>
    </div>
  );
}

type ModalActionsProps = {
  onClose: () => void;
  isSubmitting: boolean;
  submitLabel: string;
};

function ModalActions({ onClose, isSubmitting, submitLabel }: ModalActionsProps) {
  return (
    <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
      <button
        type="button"
        onClick={onClose}
        className="h-12 cursor-pointer rounded-2xl border border-[#E5E7EB] bg-white px-6 text-sm font-extrabold text-[#6B7280] transition hover:bg-[#F3F4F6]"
      >
        Fechar
      </button>
      <button
        type="submit"
        disabled={isSubmitting}
        className="h-12 cursor-pointer rounded-2xl bg-[#16A34A] px-6 text-sm font-extrabold text-white shadow-sm shadow-[#16A34A]/30 transition hover:bg-[#0B3D2E] disabled:cursor-not-allowed disabled:bg-[#9CA3AF]"
      >
        {isSubmitting ? "Processando..." : submitLabel}
      </button>
    </div>
  );
}

type FormInputProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  min?: string;
  step?: string;
  className?: string;
};

function FormInput({
  label,
  value,
  onChange,
  type = "text",
  min,
  step,
  className = "",
}: FormInputProps) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-2 block text-sm font-extrabold text-[#111827]">{label}</span>
      <input
        type={type}
        min={min}
        step={step}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-12 w-full rounded-2xl border border-[#E5E7EB] bg-white px-4 text-sm font-bold text-[#111827] outline-none transition focus:border-[#22C55E] focus:ring-4 focus:ring-[#86EFAC]/30"
      />
    </label>
  );
}

function openPaymentModal(
  charge: ChargeResponse,
  setPaymentForm: (value: PaymentFormState) => void,
) {
  setPaymentForm({
    chargeId: charge.id,
    amountPaid: charge.value.toString(),
    paymentMethod: 1,
    paidAt: new Date().toISOString().slice(0, 10),
    notes: "",
  });
}

function sumCharges(charges: ChargeResponse[]) {
  return charges.reduce((total, charge) => total + charge.value, 0);
}

function getChargeStatusLabel(status: ChargeResponse["status"]) {
  if (status === 1) return "Pendente";
  if (status === 2) return "Pago";
  if (status === 3) return "Atrasado";
  if (status === 4) return "Cancelado";
  return "Indefinido";
}

function getChargeStatusVariant(status: ChargeResponse["status"]) {
  if (status === 2) return "success";
  if (status === 1) return "warning";
  if (status === 3) return "danger";
  return "neutral";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR").format(new Date(value));
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}
