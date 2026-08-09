import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useCondominium } from "../../app/providers/useCondominium";
import { DatePickerField } from "../../shared/components/DatePickerField";
import { MetricCard } from "../../shared/components/MetricCard";
import { StatusBadge } from "../../shared/components/StatusBadge";
import { getBuildingsByCondominium } from "../buildings/buildingService";
import { cancelCharge, createCharge, getChargesByCondominium, getPlatformCharges } from "../charges/chargeService";
import type { ChargeResponse } from "../charges/types";
import { getPlatformFinancialAccount } from "../financialAccounts/financialAccountService";
import type { FinancialAccountResponse } from "../financialAccounts/types";
import { createManualPayment } from "../payments/paymentService";
import type { PaymentMethod } from "../payments/types";
import { getUnitsByBuilding } from "../units/unitService";
import type { UnitResponse } from "../units/types";

type PaymentsTab = "platform" | "condominium";
type StatusFilter = "all" | "1" | "2" | "3" | "4";

type FormState = {
  target: "single" | "all";
  unitId: string;
  value: string;
  dueDate: string;
  description: string;
};

type PaymentFormState = {
  chargeId: number;
  amountPaid: string;
  paymentMethod: PaymentMethod;
  paidAt: string;
  notes: string;
};

const initialFormState: FormState = {
  target: "single",
  unitId: "",
  value: "",
  dueDate: "",
  description: "",
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

export function AdminPaymentsPage() {
  const { activeCondominium, activeCondominiumId } = useCondominium();
  const [platformCharges, setPlatformCharges] = useState<ChargeResponse[]>([]);
  const [condominiumCharges, setCondominiumCharges] = useState<ChargeResponse[]>([]);
  const [units, setUnits] = useState<UnitResponse[]>([]);
  const [platformAccount, setPlatformAccount] = useState<FinancialAccountResponse | null>(null);
  const [activeTab, setActiveTab] = useState<PaymentsTab>("platform");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [paymentInfoCharge, setPaymentInfoCharge] = useState<ChargeResponse | null>(null);
  const [paymentForm, setPaymentForm] = useState<PaymentFormState | null>(null);
  const [cancelTarget, setCancelTarget] = useState<ChargeResponse | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [form, setForm] = useState<FormState>(initialFormState);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  async function loadPage() {
    if (!activeCondominiumId) {
      setPlatformCharges([]);
      setCondominiumCharges([]);
      setUnits([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setErrorMessage("");

      const [buildings, condominiumResult, platformResult, platformFinancialAccount] = await Promise.all([
        getBuildingsByCondominium(activeCondominiumId),
        getChargesByCondominium(activeCondominiumId),
        getPlatformCharges(),
        getPlatformFinancialAccount(),
      ]);

      const unitsByBuilding = await Promise.all(
        buildings.map((building) => getUnitsByBuilding(building.id)),
      );

      setUnits(unitsByBuilding.flat());
      setCondominiumCharges(condominiumResult);
      setPlatformAccount(platformFinancialAccount);
      setPlatformCharges(
        platformResult.filter((charge) => charge.condominiumId === activeCondominiumId),
      );
    } catch (error) {
      setPlatformCharges([]);
      setCondominiumCharges([]);
      setUnits([]);
      setPlatformAccount(null);
      setErrorMessage(
        error instanceof Error ? error.message : "Não foi possível carregar pagamentos.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCancelCharge(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!cancelTarget) {
      return;
    }

    const reason = cancelReason.trim();

    if (reason.length < 5) {
      setErrorMessage("Informe um motivo com pelo menos 5 caracteres.");
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage("");
      setSuccessMessage("");

      await cancelCharge(cancelTarget.id, reason);
      setCancelTarget(null);
      setCancelReason("");
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

  async function handleManualPayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!paymentForm) {
      return;
    }

    const charge = condominiumCharges.find((item) => item.id === paymentForm.chargeId);
    const validationMessage = validatePaymentForm(paymentForm, charge);

    if (validationMessage) {
      setErrorMessage(validationMessage);
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage("");
      setSuccessMessage("");

      await createManualPayment(paymentForm.chargeId, {
        amountPaid: parseCurrencyInput(paymentForm.amountPaid),
        paymentMethod: paymentForm.paymentMethod,
        paidAt: paymentForm.paidAt || null,
        notes: paymentForm.notes.trim() || null,
      });

      setPaymentForm(null);
      setSuccessMessage("Baixa registrada com sucesso.");
      await loadPage();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Não foi possível registrar a baixa.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  useEffect(() => {
    void loadPage();
  }, [activeCondominiumId]);

  async function handleCreateCharge(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!activeCondominiumId) {
      setErrorMessage("Selecione um condomínio antes de cadastrar cobranças.");
      return;
    }

    const validationMessage = validateCreateForm(form, units);

    if (validationMessage) {
      setErrorMessage(validationMessage);
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const targetUnitIds =
        form.target === "all" ? units.map((unit) => unit.id) : [Number(form.unitId)];

      await Promise.all(
        targetUnitIds.map((unitId) =>
          createCharge({
            scope: 2,
            condominiumId: activeCondominiumId,
            unitId,
            targetUserId: null,
            value: parseCurrencyInput(form.value),
            dueDate: form.dueDate,
            description: form.description.trim(),
          }),
        ),
      );

      setForm(initialFormState);
      setIsCreateOpen(false);
      setSuccessMessage(
        form.target === "all"
          ? `Cobranças cadastradas para ${targetUnitIds.length} unidades.`
          : "Cobrança do condomínio cadastrada com sucesso.",
      );
      await loadPage();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Não foi possível cadastrar cobrança.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const activeCharges = activeTab === "platform" ? platformCharges : condominiumCharges;

  const filteredCharges = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return activeCharges.filter((charge) => {
      const unit = units.find((item) => item.id === charge.unitId);
      const searchableText = [
        charge.description,
        charge.condominiumName,
        charge.id.toString(),
        unit?.number,
        unit?.buildingName,
        unit?.responsiblePersonName,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        normalizedSearch.length === 0 || searchableText.includes(normalizedSearch);
      const matchesStatus =
        statusFilter === "all" || charge.status.toString() === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [activeCharges, searchTerm, statusFilter, units]);

  const pendingCharges = activeCharges.filter((charge) => charge.status === 1);
  const paidCharges = activeCharges.filter((charge) => charge.status === 2);
  const overdueCharges = activeCharges.filter((charge) => charge.status === 3);

  return (
    <>
      <section className="rounded-[2rem] border border-[#E5E7EB] bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-[#111827]">
              Pagamentos
            </h1>
            <p className="mt-1 text-sm font-semibold text-[#6B7280]">
              Acompanhe cobranças MORAÊ e cobranças internas do condomínio.
            </p>
            <p className="mt-2 text-sm font-bold text-[#16A34A]">
              {activeCondominium?.condominiumName ?? "Nenhum condomínio selecionado"}
            </p>
          </div>

          {activeTab === "condominium" && (
            <button
              type="button"
              onClick={() => setIsCreateOpen(true)}
              disabled={!activeCondominiumId || units.length === 0}
              className="h-11 cursor-pointer rounded-2xl bg-[#16A34A] px-5 text-sm font-extrabold text-white shadow-sm shadow-[#16A34A]/30 transition hover:bg-[#0B3D2E] disabled:cursor-not-allowed disabled:bg-[#9CA3AF]"
            >
              + Nova cobrança interna
            </button>
          )}
        </div>

        {errorMessage && <FeedbackMessage variant="error" message={errorMessage} />}
        {successMessage && <FeedbackMessage variant="success" message={successMessage} />}

        <div className="mt-6 flex flex-col gap-2 rounded-2xl bg-[#F3F4F6] p-2 sm:flex-row">
          <TabButton
            label="Cobranças MORAÊ"
            isActive={activeTab === "platform"}
            onClick={() => setActiveTab("platform")}
          />
          <TabButton
            label="Cobranças do condomínio"
            isActive={activeTab === "condominium"}
            onClick={() => setActiveTab("condominium")}
          />
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Total lançado"
            value={formatCurrency(sumCharges(activeCharges))}
            helper={`${activeCharges.length} cobranças`}
          />
          <MetricCard
            label="Recebido"
            value={formatCurrency(sumCharges(paidCharges))}
            helper="Pagamentos confirmados"
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
          <div className="mb-4 flex flex-col gap-3 xl:flex-row">
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder={
                activeTab === "platform"
                  ? "Buscar por cobrança, condomínio ou ID..."
                  : "Buscar por unidade, morador ou descrição..."
              }
              className="h-11 flex-1 rounded-2xl border border-[#E5E7EB] bg-white px-4 text-sm font-semibold text-[#111827] outline-none transition placeholder:text-[#9CA3AF] focus:border-[#22C55E] focus:ring-4 focus:ring-[#86EFAC]/30"
            />

            <SelectField
              value={statusFilter}
              onChange={setStatusFilter}
              options={statusFilterOptions}
              className="xl:w-40"
            />
          </div>

          <div className="overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead className="bg-[#DCFCE7] text-xs uppercase tracking-wide text-[#0B3D2E]">
                  <tr>
                    <th className="px-4 py-3 font-extrabold">Descrição</th>
                    <th className="px-4 py-3 font-extrabold">
                      {activeTab === "platform" ? "Condomínio" : "Unidade"}
                    </th>
                    <th className="px-4 py-3 font-extrabold">
                      {activeTab === "platform" ? "Origem" : "Responsável"}
                    </th>
                    <th className="px-4 py-3 font-extrabold">Valor</th>
                    <th className="px-4 py-3 font-extrabold">Vencimento</th>
                    <th className="px-4 py-3 font-extrabold">Status</th>
                    <th className="px-4 py-3 font-extrabold">Ações</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-[#E5E7EB]">
                  {isLoading ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-10 text-center font-bold text-[#6B7280]">
                        Carregando pagamentos...
                      </td>
                    </tr>
                  ) : filteredCharges.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-10 text-center font-bold text-[#6B7280]">
                        Nenhuma cobrança encontrada.
                      </td>
                    </tr>
                  ) : (
                    filteredCharges.map((charge) => {
                      const unit = units.find((item) => item.id === charge.unitId);

                      return (
                        <tr key={charge.id} className="transition hover:bg-[#F3F4F6]">
                          <td className="px-4 py-4 font-extrabold text-[#111827]">
                            {charge.description}
                          </td>
                          <td className="px-4 py-4 font-semibold text-[#6B7280]">
                            {activeTab === "platform"
                              ? charge.condominiumName
                              : unit
                                ? `${unit.buildingName} - ${unit.number}`
                                : "-"}
                          </td>
                          <td className="px-4 py-4 font-semibold text-[#6B7280]">
                            {activeTab === "platform"
                              ? "MORAÊ"
                              : unit?.responsiblePersonName || "Sem responsável"}
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
                            {activeTab === "platform" ? (
                              <button
                                type="button"
                                onClick={() => setPaymentInfoCharge(charge)}
                                className="h-9 cursor-pointer rounded-xl border border-[#BBF7D0] bg-white px-3 text-xs font-extrabold text-[#16A34A] transition hover:bg-[#F0FDF4] hover:text-[#0B3D2E]"
                              >
                                Ver pagamento
                              </button>
                            ) : (
                              <div className="flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setPaymentForm({
                                      chargeId: charge.id,
                                      amountPaid: formatCurrencyInput(charge.value),
                                      paymentMethod: 1,
                                      paidAt: getTodayInputDate(),
                                      notes: "",
                                    });
                                    setErrorMessage("");
                                    setSuccessMessage("");
                                  }}
                                  disabled={charge.status === 2 || charge.status === 4}
                                  className="h-9 cursor-pointer rounded-xl bg-[#16A34A] px-3 text-xs font-extrabold text-white shadow-sm shadow-[#16A34A]/20 transition hover:bg-[#0B3D2E] disabled:cursor-not-allowed disabled:bg-[#9CA3AF]"
                                >
                                  Baixar
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setCancelTarget(charge);
                                    setCancelReason("");
                                    setErrorMessage("");
                                    setSuccessMessage("");
                                  }}
                                  disabled={charge.status === 2 || charge.status === 4}
                                  className="h-9 cursor-pointer rounded-xl border border-[#FECACA] bg-white px-3 text-xs font-extrabold text-[#B42318] transition hover:bg-[#FDECEC] disabled:cursor-not-allowed disabled:border-[#E5E7EB] disabled:text-[#9CA3AF]"
                                >
                                  Cancelar
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0B3D2E]/30 px-6 py-8 backdrop-blur-sm">
          <form
            onSubmit={handleCreateCharge}
            className="w-full max-w-3xl rounded-[2rem] border border-[#E5E7EB] bg-white shadow-2xl shadow-[#0B3D2E]/20"
          >
            <div className="flex items-start justify-between gap-5 rounded-t-[2rem] border-b border-[#E5E7EB] px-6 py-5">
              <div>
                <h2 className="text-2xl font-extrabold text-[#111827]">Nova cobrança interna</h2>
                <p className="mt-1 text-sm font-semibold text-[#6B7280]">
                  Cadastre para uma unidade específica ou envie para todas as unidades.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="flex size-10 cursor-pointer items-center justify-center rounded-full bg-[#F3F4F6] text-xl font-light text-[#6B7280] transition hover:bg-[#FDECEC] hover:text-[#B42318]"
              >
                ×
              </button>
            </div>

            <div className="space-y-6 px-8 pt-7 pb-10">
              <div className="rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] p-2">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <TargetButton
                    title="Uma unidade"
                    description="Criar cobrança para uma unidade selecionada."
                    isActive={form.target === "single"}
                    onClick={() =>
                      setForm((current) => ({ ...current, target: "single" }))
                    }
                  />
                  <TargetButton
                    title="Todas as unidades"
                    description={`Gerar ${units.length} cobranças com os mesmos dados.`}
                    isActive={form.target === "all"}
                    onClick={() =>
                      setForm((current) => ({ ...current, target: "all", unitId: "" }))
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                {form.target === "single" ? (
                  <SelectField
                    label="Unidade"
                    value={form.unitId}
                    onChange={(value) =>
                      setForm((current) => ({ ...current, unitId: value }))
                    }
                    options={[
                      { value: "", label: "Selecione uma unidade" },
                      ...units.map((unit) => ({
                        value: unit.id.toString(),
                        label: `${unit.buildingName} - ${unit.number}`,
                      })),
                    ]}
                    className="md:col-span-2"
                  />
                ) : (
                  <div className="rounded-2xl border border-[#BBF7D0] bg-[#ECFDF5] px-5 py-4 md:col-span-2">
                    <p className="text-sm font-black text-[#0B3D2E]">
                      Todas as unidades serão cobradas
                    </p>
                    <p className="mt-1 text-sm font-semibold leading-6 text-[#047857]">
                      O sistema vai criar uma cobrança separada para cada uma das {units.length} unidades do condomínio.
                    </p>
                  </div>
                )}

                <FormInput
                  label="Valor"
                  inputMode="decimal"
                  placeholder="Ex.: 350,00"
                  value={form.value}
                  onChange={(value) => setForm((current) => ({ ...current, value }))}
                />
                <FormInput
                  label="Vencimento"
                  type="date"
                  min={getTodayInputDate()}
                  placeholder="dd/mm/aaaa"
                  value={form.dueDate}
                  onChange={(value) => setForm((current) => ({ ...current, dueDate: value }))}
                />
                <FormInput
                  label="Descrição"
                  placeholder="Ex.: Taxa de condomínio - agosto"
                  value={form.description}
                  onChange={(value) => setForm((current) => ({ ...current, description: value }))}
                  className="md:col-span-2"
                />
              </div>
            </div>

            <div className="border-t border-[#E5E7EB] px-8 py-5">
              <button
                type="submit"
                disabled={isSubmitting}
                className="h-12 w-full cursor-pointer rounded-2xl bg-[#16A34A] text-sm font-extrabold text-white shadow-sm shadow-[#16A34A]/30 transition hover:bg-[#0B3D2E] disabled:cursor-not-allowed disabled:bg-[#9CA3AF]"
              >
                {isSubmitting
                  ? "Cadastrando..."
                  : form.target === "all"
                    ? `Cadastrar para ${units.length} unidades`
                    : "Cadastrar cobrança"}
              </button>
            </div>
          </form>
        </div>
      )}

      {paymentInfoCharge && (
        <PaymentInfoModal
          charge={paymentInfoCharge}
          account={platformAccount}
          onClose={() => setPaymentInfoCharge(null)}
        />
      )}

      {paymentForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0B3D2E]/30 px-6 py-8 backdrop-blur-sm">
          <form
            onSubmit={handleManualPayment}
            className="w-full max-w-2xl overflow-hidden rounded-[2rem] border border-[#E5E7EB] bg-white shadow-2xl shadow-[#0B3D2E]/20"
          >
            <div className="flex items-start justify-between gap-5 border-b border-[#E5E7EB] px-6 py-5">
              <div>
                <h2 className="text-2xl font-extrabold text-[#111827]">Registrar baixa</h2>
                <p className="mt-1 text-sm font-semibold text-[#6B7280]">
                  Confirme o pagamento recebido para a cobrança interna.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setPaymentForm(null)}
                className="flex size-10 cursor-pointer items-center justify-center rounded-full bg-[#F3F4F6] text-xl font-light text-[#6B7280] transition hover:bg-[#FDECEC] hover:text-[#B42318]"
              >
                ×
              </button>
            </div>

            <div className="grid grid-cols-1 gap-5 px-8 py-7 md:grid-cols-2">
              <FormInput
                label="Valor pago"
                inputMode="decimal"
                placeholder="Ex.: 350,00"
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
                  setPaymentForm((current) =>
                    current ? { ...current, paidAt: value } : current,
                  )
                }
              />
              <FormInput
                label="Observação"
                placeholder="Ex.: Pagamento conferido via Pix"
                value={paymentForm.notes}
                onChange={(value) =>
                  setPaymentForm((current) =>
                    current ? { ...current, notes: value } : current,
                  )
                }
              />
            </div>

            <div className="border-t border-[#E5E7EB] px-8 py-5">
              <button
                type="submit"
                disabled={isSubmitting}
                className="h-12 w-full cursor-pointer rounded-2xl bg-[#16A34A] text-sm font-extrabold text-white shadow-sm shadow-[#16A34A]/30 transition hover:bg-[#0B3D2E] disabled:cursor-not-allowed disabled:bg-[#9CA3AF]"
              >
                {isSubmitting ? "Registrando..." : "Registrar baixa"}
              </button>
            </div>
          </form>
        </div>
      )}

      {cancelTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0B3D2E]/30 px-6 py-8 backdrop-blur-sm">
          <form
            onSubmit={handleCancelCharge}
            className="w-full max-w-xl overflow-hidden rounded-[2rem] border border-[#E5E7EB] bg-white shadow-2xl shadow-[#0B3D2E]/20"
          >
            <div className="flex items-start justify-between gap-5 border-b border-[#E5E7EB] px-6 py-5">
              <div>
                <h2 className="text-2xl font-extrabold text-[#111827]">Cancelar cobrança</h2>
                <p className="mt-1 text-sm font-semibold text-[#6B7280]">
                  Informe o motivo do cancelamento.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setCancelTarget(null);
                  setCancelReason("");
                }}
                className="flex size-10 cursor-pointer items-center justify-center rounded-full bg-[#F3F4F6] text-xl font-light text-[#6B7280] transition hover:bg-[#FDECEC] hover:text-[#B42318]"
              >
                ×
              </button>
            </div>

            <div className="space-y-5 px-8 py-7">
              <div className="rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] px-5 py-4">
                <p className="text-sm font-black text-[#111827]">{cancelTarget.description}</p>
                <p className="mt-1 text-sm font-semibold text-[#6B7280]">
                  {formatCurrency(cancelTarget.value)} • vencimento {formatDate(cancelTarget.dueDate)}
                </p>
              </div>

              <label className="block">
                <span className="mb-2 block text-sm font-extrabold text-[#111827]">
                  Motivo
                </span>
                <textarea
                  value={cancelReason}
                  onChange={(event) => setCancelReason(event.target.value)}
                  placeholder="Ex.: Cobrança lançada em duplicidade"
                  className="min-h-28 w-full resize-none rounded-2xl border border-[#E5E7EB] bg-white px-4 py-3 text-sm font-bold text-[#111827] outline-none transition placeholder:text-[#9CA3AF] focus:border-[#22C55E] focus:ring-4 focus:ring-[#86EFAC]/30"
                />
              </label>
            </div>

            <div className="border-t border-[#E5E7EB] px-8 py-5">
              <button
                type="submit"
                disabled={isSubmitting}
                className="h-12 w-full cursor-pointer rounded-2xl bg-[#B42318] text-sm font-extrabold text-white shadow-sm shadow-[#B42318]/30 transition hover:bg-[#7A271A] disabled:cursor-not-allowed disabled:bg-[#9CA3AF]"
              >
                {isSubmitting ? "Cancelando..." : "Confirmar cancelamento"}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}

type TabButtonProps = {
  label: string;
  isActive: boolean;
  onClick: () => void;
};

function TabButton({ label, isActive, onClick }: TabButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-11 flex-1 cursor-pointer rounded-xl px-4 text-sm font-extrabold transition ${
        isActive
          ? "bg-white text-[#0B3D2E] shadow-sm"
          : "text-[#6B7280] hover:bg-white/70 hover:text-[#0B3D2E]"
      }`}
    >
      {label}
    </button>
  );
}

type TargetButtonProps = {
  title: string;
  description: string;
  isActive: boolean;
  onClick: () => void;
};

function TargetButton({ title, description, isActive, onClick }: TargetButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-24 cursor-pointer rounded-2xl border p-4 text-left transition ${
        isActive
          ? "border-[#16A34A] bg-white shadow-sm text-[#0B3D2E]"
          : "border-transparent bg-transparent text-[#6B7280] hover:bg-white hover:text-[#111827]"
      }`}
    >
      <span className="block text-sm font-black">{title}</span>
      <span className="mt-1 block text-xs font-semibold leading-5">{description}</span>
    </button>
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

type PaymentInfoModalProps = {
  charge: ChargeResponse;
  account: FinancialAccountResponse | null;
  onClose: () => void;
};

function PaymentInfoModal({ charge, account, onClose }: PaymentInfoModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0B3D2E]/30 px-6 py-8 backdrop-blur-sm">
      <div className="w-full max-w-xl overflow-hidden rounded-[2rem] border border-[#E5E7EB] bg-white shadow-2xl shadow-[#0B3D2E]/20">
        <div className="flex items-start justify-between gap-5 border-b border-[#E5E7EB] px-6 py-5">
          <div>
            <h2 className="text-2xl font-extrabold text-[#111827]">Informações de pagamento</h2>
            <p className="mt-1 text-sm font-semibold text-[#6B7280]">
              Dados para pagar a cobrança MORAÊ.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex size-10 cursor-pointer items-center justify-center rounded-full bg-[#F3F4F6] text-xl font-light text-[#6B7280] transition hover:bg-[#FDECEC] hover:text-[#B42318]"
          >
            ×
          </button>
        </div>

        <div className="space-y-5 px-8 py-7">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <InfoItem label="Cobrança" value={charge.description} />
            <InfoItem label="Valor" value={formatCurrency(charge.value)} />
            <InfoItem label="Vencimento" value={formatDate(charge.dueDate)} />
            <InfoItem label="Status" value={getChargeStatusLabel(charge.status)} />
          </div>

          <div className="rounded-2xl border border-[#BBF7D0] bg-[#ECFDF5] px-5 py-4">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#16A34A]">
              Chave Pix MORAÊ
            </p>
            {account?.pixKey ? (
              <p className="mt-2 break-all text-lg font-black text-[#111827]">
                {account.pixKey}
              </p>
            ) : (
              <p className="mt-2 text-sm font-bold text-[#047857]">
                Chave Pix da plataforma ainda não configurada.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] px-4 py-3">
      <p className="text-xs font-black uppercase tracking-[0.14em] text-[#6B7280]">
        {label}
      </p>
      <p className="mt-1 text-sm font-black text-[#111827]">{value}</p>
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
        className={`flex h-12 w-full cursor-pointer items-center justify-between rounded-2xl border bg-white px-4 text-left text-sm font-bold outline-none transition ${
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
        <div className="absolute left-0 right-0 top-full z-[90] mt-2 max-h-60 overflow-y-auto rounded-2xl border border-[#E5E7EB] bg-white p-1 shadow-xl shadow-[#111827]/10">
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

function validateCreateForm(form: FormState, units: UnitResponse[]) {
  const unitId = Number(form.unitId);
  const value = parseCurrencyInput(form.value);
  const description = form.description.trim();

  if (units.length === 0) {
    return "Cadastre uma unidade antes de criar cobranças.";
  }

  if (form.target === "single" && (!form.unitId || Number.isNaN(unitId))) {
    return "Selecione uma unidade.";
  }

  if (form.target === "single" && !units.some((unit) => unit.id === unitId)) {
    return "A unidade selecionada não está disponível.";
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

  if (!description) {
    return "Informe a descrição da cobrança.";
  }

  if (description.length < 3) {
    return "A descrição precisa ter pelo menos 3 caracteres.";
  }

  if (description.length > 255) {
    return "A descrição deve ter no máximo 255 caracteres.";
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

function parseCurrencyInput(value: string) {
  return Number(value.trim().replace(/\./g, "").replace(",", "."));
}

function formatCurrencyInput(value: number) {
  return value.toFixed(2).replace(".", ",");
}

function toCents(value: number) {
  return Math.round(value * 100);
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
