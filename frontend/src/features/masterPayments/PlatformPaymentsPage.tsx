import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { DatePickerField } from "../../shared/components/DatePickerField";
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

type StatusFilter = "all" | "1" | "2" | "3" | "4";

const initialCreateForm: CreateFormState = {
  condominiumId: "",
  description: "",
  value: "",
  dueDate: "",
};

const statusFilterOptions: SelectOption<StatusFilter>[] = [
  { value: "all", label: "Todos" },
  { value: "1", label: "Pendentes" },
  { value: "2", label: "Pagos" },
  { value: "3", label: "Atrasados" },
  { value: "4", label: "Cancelados" },
];

const paymentMethodOptions: SelectOption<PaymentMethod>[] = [
  { value: 0, label: "Selecione" },
  { value: 1, label: "Pix" },
  { value: 2, label: "Cartão de crédito" },
  { value: 3, label: "Cartão de débito" },
  { value: 4, label: "Boleto" },
];

export function PlatformPaymentsPage() {
  const [charges, setCharges] = useState<ChargeResponse[]>([]);
  const [condominiums, setCondominiums] = useState<CondominiumResponse[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CreateFormState>(initialCreateForm);
  const [paymentForm, setPaymentForm] = useState<PaymentFormState | null>(null);
  const [cancelForm, setCancelForm] = useState<CancelFormState | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [modalError, setModalError] = useState("");

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

  function openCreateModal() {
    setModalError("");
    setErrorMessage("");
    setSuccessMessage("");
    setIsCreateOpen(true);
  }

  function closeCreateModal() {
    setIsCreateOpen(false);
    setModalError("");
  }

  async function handleCreateCharge(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const validationMessage = validateCreateForm(createForm, condominiums);

    if (validationMessage) {
      setModalError(validationMessage);
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const value = parseCurrencyInput(createForm.value);

      await createCharge({
        scope: 1,
        condominiumId: Number(createForm.condominiumId),
        targetUserId: null,
        unitId: null,
        value,
        dueDate: createForm.dueDate,
        description: createForm.description.trim(),
      });

      setCreateForm(initialCreateForm);
      setIsCreateOpen(false);
      setModalError("");
      setSuccessMessage("Cobrança da plataforma criada com sucesso.");
      await loadPage();
    } catch (error) {
      setModalError(
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

    const charge = charges.find((item) => item.id === paymentForm.chargeId);
    const validationMessage = validatePaymentForm(paymentForm, charge);

    if (validationMessage) {
      setModalError(validationMessage);
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
      setModalError("");
      setSuccessMessage("Pagamento registrado com sucesso.");
      await loadPage();
    } catch (error) {
      setModalError(
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

    const validationMessage = validateCancelForm(cancelForm);

    if (validationMessage) {
      setModalError(validationMessage);
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      await cancelCharge(cancelForm.chargeId, cancelForm.reason.trim());
      setCancelForm(null);
      setModalError("");
      setSuccessMessage("Cobrança cancelada com sucesso.");
      await loadPage();
    } catch (error) {
      setModalError(
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
              onClick={openCreateModal}
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
              placeholder="Buscar por descrição, condomínio ou nº da cobrança..."
              className="h-11 flex-1 rounded-2xl border border-[#E5E7EB] bg-white px-4 text-sm font-semibold text-[#111827] outline-none transition placeholder:text-[#9CA3AF] focus:border-[#22C55E] focus:ring-4 focus:ring-[#86EFAC]/30"
            />

            <SelectField
              value={statusFilter}
              onChange={setStatusFilter}
              options={statusFilterOptions}
              className="md:w-44"
            />
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
                              onClick={() => openPaymentModal(charge, setPaymentForm, setModalError)}
                              disabled={charge.status === 2 || charge.status === 4}
                              className="h-9 cursor-pointer rounded-xl bg-[#16A34A] px-3 text-xs font-extrabold text-white transition hover:bg-[#0B3D2E] disabled:cursor-not-allowed disabled:bg-[#D1D5DB]"
                            >
                              Baixar
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setModalError("");
                                setCancelForm({ chargeId: charge.id, reason: "" });
                              }}
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
        <Modal
          title="Nova cobrança"
          subtitle="Crie uma cobrança institucional para um condomínio."
          onClose={closeCreateModal}
        >
          <form onSubmit={handleCreateCharge} noValidate>
            {modalError && <FeedbackMessage variant="error" message={modalError} />}

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <SelectField
                label="Condomínio"
                value={createForm.condominiumId}
                onChange={(value) =>
                  setCreateForm((current) => ({ ...current, condominiumId: value }))
                }
                options={[
                  { value: "", label: "Selecione" },
                  ...condominiums.map((condominium) => ({
                    value: condominium.id.toString(),
                    label: condominium.name,
                  })),
                ]}
                className="md:col-span-2"
              />

              <FormInput
                label="Valor"
                inputMode="decimal"
                placeholder="Ex.: 120,00"
                value={createForm.value}
                onChange={(value) => setCreateForm((current) => ({ ...current, value }))}
              />
              <FormInput
                label="Vencimento"
                type="date"
                min={getTodayInputDate()}
                placeholder="dd/mm/aaaa"
                value={createForm.dueDate}
                onChange={(value) => setCreateForm((current) => ({ ...current, dueDate: value }))}
              />
              <FormInput
                label="Descrição"
                placeholder="Ex.: Taxa da plataforma - agosto"
                value={createForm.description}
                onChange={(value) =>
                  setCreateForm((current) => ({ ...current, description: value }))
                }
                className="md:col-span-2"
              />
            </div>

            <ModalActions
              isSubmitting={isSubmitting}
              submitLabel="Criar cobrança"
            />
          </form>
        </Modal>
      )}

      {paymentForm && (
        <Modal
          title="Registrar pagamento"
          subtitle="Baixa manual confirmada pelo Master."
          onClose={() => {
            setPaymentForm(null);
            setModalError("");
          }}
        >
          <form onSubmit={handleManualPayment} noValidate>
            {modalError && <FeedbackMessage variant="error" message={modalError} />}

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <FormInput
                label="Valor pago"
                inputMode="decimal"
                placeholder="Ex.: 120,00"
                value={paymentForm.amountPaid}
                onChange={(value) =>
                  setPaymentForm((current) =>
                    current ? { ...current, amountPaid: value } : current,
                  )
                }
              />
              <SelectField
                label="Método"
                value={paymentForm.paymentMethod}
                onChange={(value) =>
                  setPaymentForm((current) =>
                    current ? { ...current, paymentMethod: value } : current,
                  )
                }
                options={paymentMethodOptions}
              />
              <FormInput
                label="Data do pagamento"
                type="date"
                max={getTodayInputDate()}
                placeholder="dd/mm/aaaa"
                value={paymentForm.paidAt}
                onChange={(value) =>
                  setPaymentForm((current) => (current ? { ...current, paidAt: value } : current))
                }
              />
              <FormInput
                label="Observação"
                placeholder="Ex.: Pagamento conferido via extrato"
                value={paymentForm.notes}
                onChange={(value) =>
                  setPaymentForm((current) => (current ? { ...current, notes: value } : current))
                }
              />
            </div>

            <ModalActions
              isSubmitting={isSubmitting}
              submitLabel="Registrar baixa"
            />
          </form>
        </Modal>
      )}

      {cancelForm && (
        <Modal
          title="Cancelar cobrança"
          subtitle="Informe o motivo para manter auditoria do processo."
          onClose={() => {
            setCancelForm(null);
            setModalError("");
          }}
        >
          <form onSubmit={handleCancelCharge} noValidate>
            {modalError && <FeedbackMessage variant="error" message={modalError} />}

            <label className="block">
              <span className="mb-2 block text-sm font-extrabold text-[#111827]">
                Motivo
              </span>
              <textarea
                value={cancelForm.reason}
                placeholder="Ex.: Cobrança duplicada ou lançada com valor incorreto"
                onChange={(event) =>
                  setCancelForm((current) =>
                    current ? { ...current, reason: event.target.value } : current,
                  )
                }
                className="min-h-28 w-full resize-none rounded-2xl border border-[#E5E7EB] bg-white px-4 py-3 text-sm font-bold text-[#111827] outline-none transition focus:border-[#22C55E] focus:ring-4 focus:ring-[#86EFAC]/30"
              />
            </label>

            <ModalActions
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
  onClose: () => void;
  children: ReactNode;
};

function Modal({ title, subtitle, onClose, children }: ModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0B3D2E]/30 px-6 py-8 backdrop-blur-sm">
      <div className="w-full max-w-3xl overflow-hidden rounded-[2rem] border border-[#E5E7EB] bg-white shadow-2xl shadow-[#0B3D2E]/20">
        <div className="flex items-start justify-between gap-5 border-b border-[#E5E7EB] px-6 py-5">
          <div>
            <h2 className="text-2xl font-extrabold text-[#111827]">{title}</h2>
            <p className="mt-1 text-sm font-semibold text-[#6B7280]">{subtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full bg-[#F3F4F6] text-xl font-light text-[#6B7280] transition hover:bg-[#FDECEC] hover:text-[#B42318]"
          >
            x
          </button>
        </div>
        <div className="px-8 py-7">{children}</div>
      </div>
    </div>
  );
}

type ModalActionsProps = {
  isSubmitting: boolean;
  submitLabel: string;
};

function ModalActions({ isSubmitting, submitLabel }: ModalActionsProps) {
  return (
    <div className="mt-7 flex justify-end">
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

type SelectOption<T extends string | number> = {
  value: T;
  label: string;
};

type SelectFieldProps<T extends string | number> = {
  label?: string;
  value: T;
  onChange: (value: T) => void;
  options: SelectOption<T>[];
  className?: string;
};

function SelectField<T extends string | number>({
  label,
  value,
  onChange,
  options,
  className = "",
}: SelectFieldProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = options.find((option) => option.value === value);

  function handleSelect(nextValue: T) {
    onChange(nextValue);
    setIsOpen(false);
  }

  return (
    <div
      className={`relative ${className}`}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setIsOpen(false);
        }
      }}
    >
      {label && (
        <span className="mb-2 block text-sm font-extrabold text-[#111827]">
          {label}
        </span>
      )}

      <button
        type="button"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((current) => !current)}
        className={`flex h-11 w-full cursor-pointer items-center justify-between rounded-2xl border bg-white px-4 text-left text-sm font-bold outline-none transition ${
          isOpen
            ? "border-[#22C55E] text-[#111827] ring-4 ring-[#86EFAC]/30"
            : "border-[#E5E7EB] text-[#6B7280] hover:border-[#BBF7D0] hover:text-[#0B3D2E]"
        }`}
      >
        <span className="truncate">{selectedOption?.label ?? "Selecione"}</span>
        <span
          aria-hidden="true"
          className={`ml-3 block size-2 shrink-0 border-r-2 border-b-2 border-current text-[#6B7280] transition-transform ${
            isOpen ? "rotate-[225deg] translate-y-0.5" : "rotate-45 -translate-y-0.5"
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 top-full z-[70] mt-2 max-h-60 overflow-y-auto rounded-2xl border border-[#E5E7EB] bg-white p-1 shadow-xl shadow-[#111827]/10">
          {options.map((option) => {
            const isSelected = option.value === value;

            return (
              <button
                key={option.value}
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => handleSelect(option.value)}
                className={`flex min-h-10 w-full cursor-pointer items-center rounded-xl px-3 py-2 text-left text-sm font-extrabold transition ${
                  isSelected
                    ? "bg-[#DCFCE7] text-[#0B3D2E]"
                    : "text-[#6B7280] hover:bg-[#F0FDF4] hover:text-[#0B3D2E]"
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

type FormInputProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  min?: string;
  max?: string;
  step?: string;
  placeholder?: string;
  inputMode?: "decimal" | "numeric" | "text";
  className?: string;
};

function FormInput({
  label,
  value,
  onChange,
  type = "text",
  min,
  max,
  step,
  placeholder,
  inputMode,
  className = "",
}: FormInputProps) {
  const isDate = type === "date";

  if (isDate) {
    return (
      <DatePickerField
        label={label}
        value={value}
        onChange={onChange}
        min={min}
        max={max}
        placeholder={placeholder}
        className={className}
      />
    );
  }

  return (
    <label className={`block ${className}`}>
      <span className="mb-2 block text-sm font-extrabold text-[#111827]">{label}</span>
      <input
        type={type}
        lang="pt-BR"
        min={min}
        max={max}
        step={step}
        inputMode={inputMode}
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-12 w-full rounded-2xl border border-[#E5E7EB] bg-white px-4 text-sm font-bold text-[#111827] outline-none transition placeholder:text-[#9CA3AF] focus:border-[#22C55E] focus:ring-4 focus:ring-[#86EFAC]/30"
      />
    </label>
  );
}

function validateCreateForm(
  form: CreateFormState,
  condominiums: CondominiumResponse[],
) {
  const condominiumId = Number(form.condominiumId);
  const description = form.description.trim();
  const value = parseCurrencyInput(form.value);

  if (!form.condominiumId || Number.isNaN(condominiumId)) {
    return "Selecione um condomínio.";
  }

  if (!condominiums.some((condominium) => condominium.id === condominiumId)) {
    return "O condomínio selecionado não está disponível.";
  }

  if (!description) {
    return "Informe a descrição da cobrança.";
  }

  if (description.length < 3) {
    return "A descrição precisa ter pelo menos 3 caracteres.";
  }

  if (description.length > 255) {
    return "A descrição deve ter no máximo 255 caracteres.";
  }

  if (!form.value || !Number.isFinite(value) || value <= 0) {
    return "Informe um valor maior que zero.";
  }

  if (!Number.isInteger(value * 100)) {
    return "Informe o valor com no máximo duas casas decimais.";
  }

  if (!form.dueDate) {
    return "Informe a data de vencimento.";
  }

  if (!isValidInputDate(form.dueDate)) {
    return "Informe uma data de vencimento válida.";
  }

  if (form.dueDate < getTodayInputDate()) {
    return "O vencimento não pode ser anterior a hoje.";
  }

  return "";
}

function validatePaymentForm(form: PaymentFormState, charge?: ChargeResponse) {
  const amountPaid = parseCurrencyInput(form.amountPaid);

  if (!charge) {
    return "Cobrança não encontrada para registrar a baixa.";
  }

  if (!form.amountPaid || !Number.isFinite(amountPaid) || amountPaid <= 0) {
    return "Informe um valor pago maior que zero.";
  }

  if (!Number.isInteger(amountPaid * 100)) {
    return "Informe o valor pago com no máximo duas casas decimais.";
  }

  if (toCents(amountPaid) !== toCents(charge.value)) {
    return `O valor pago precisa ser igual ao valor da cobrança (${formatCurrency(charge.value)}).`;
  }

  if (form.paymentMethod === 0) {
    return "Selecione o método de pagamento.";
  }

  if (!form.paidAt) {
    return "Informe a data do pagamento.";
  }

  if (!isValidInputDate(form.paidAt)) {
    return "Informe uma data de pagamento válida.";
  }

  if (form.paidAt > getTodayInputDate()) {
    return "A data do pagamento não pode ser futura.";
  }

  if (form.notes.trim().length > 255) {
    return "A observação deve ter no máximo 255 caracteres.";
  }

  return "";
}

function validateCancelForm(form: CancelFormState) {
  const reason = form.reason.trim();

  if (!reason) {
    return "Informe o motivo do cancelamento.";
  }

  if (reason.length < 5) {
    return "O motivo precisa ter pelo menos 5 caracteres.";
  }

  if (reason.length > 255) {
    return "O motivo deve ter no máximo 255 caracteres.";
  }

  return "";
}

function openPaymentModal(
  charge: ChargeResponse,
  setPaymentForm: (value: PaymentFormState) => void,
  setModalError: (value: string) => void,
) {
  setModalError("");
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

function toCents(value: number) {
  return Math.round(value * 100);
}

function parseCurrencyInput(value: string) {
  return Number(value.trim().replace(/\./g, "").replace(",", "."));
}

function getTodayInputDate() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function isValidInputDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00`);

  return !Number.isNaN(date.getTime());
}
