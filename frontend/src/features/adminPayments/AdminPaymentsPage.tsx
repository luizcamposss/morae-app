import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useCondominium } from "../../app/providers/useCondominium";
import { MetricCard } from "../../shared/components/MetricCard";
import { StatusBadge } from "../../shared/components/StatusBadge";
import { getBuildingsByCondominium } from "../buildings/buildingService";
import { createCharge, getChargesByCondominium } from "../charges/chargeService";
import type { ChargeResponse } from "../charges/types";
import { getUnitsByBuilding } from "../units/unitService";
import type { UnitResponse } from "../units/types";

type FormState = {
  unitId: string;
  value: string;
  dueDate: string;
  description: string;
};

const initialFormState: FormState = {
  unitId: "",
  value: "",
  dueDate: "",
  description: "",
};

export function AdminPaymentsPage() {
  const { activeCondominium, activeCondominiumId } = useCondominium();
  const [charges, setCharges] = useState<ChargeResponse[]>([]);
  const [units, setUnits] = useState<UnitResponse[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [form, setForm] = useState<FormState>(initialFormState);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  async function loadPage() {
    if (!activeCondominiumId) {
      setCharges([]);
      setUnits([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setErrorMessage("");

      const [buildings, condominiumCharges] = await Promise.all([
        getBuildingsByCondominium(activeCondominiumId),
        getChargesByCondominium(activeCondominiumId),
      ]);

      const unitsByBuilding = await Promise.all(
        buildings.map((building) => getUnitsByBuilding(building.id)),
      );

      setUnits(unitsByBuilding.flat());
      setCharges(condominiumCharges);
    } catch (error) {
      setCharges([]);
      setUnits([]);
      setErrorMessage(
        error instanceof Error ? error.message : "Não foi possível carregar cobranças.",
      );
    } finally {
      setIsLoading(false);
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

    if (!form.unitId || !form.value || !form.dueDate || !form.description.trim()) {
      setErrorMessage("Preencha unidade, valor, vencimento e descrição.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      await createCharge({
        scope: 2,
        condominiumId: activeCondominiumId,
        unitId: Number(form.unitId),
        targetUserId: null,
        value: Number(form.value),
        dueDate: form.dueDate,
        description: form.description.trim(),
      });

      setForm(initialFormState);
      setIsCreateOpen(false);
      setSuccessMessage("Cobrança cadastrada com sucesso.");
      await loadPage();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Não foi possível cadastrar cobrança.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const filteredCharges = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return charges.filter((charge) => {
      const unit = units.find((item) => item.id === charge.unitId);
      const searchableText = [
        charge.description,
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
  }, [charges, searchTerm, statusFilter, units]);

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
              Cobranças do condomínio ativo.
            </p>
            <p className="mt-2 text-sm font-bold text-[#16A34A]">
              {activeCondominium?.condominiumName ?? "Nenhum condomínio selecionado"}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            disabled={!activeCondominiumId || units.length === 0}
            className="h-11 cursor-pointer rounded-2xl bg-[#16A34A] px-5 text-sm font-extrabold text-white shadow-sm shadow-[#16A34A]/30 transition hover:bg-[#0B3D2E] disabled:cursor-not-allowed disabled:bg-[#9CA3AF]"
          >
            + Nova cobrança
          </button>
        </div>

        {errorMessage && (
          <div className="mt-5 rounded-2xl border border-[#FECACA] bg-[#FDECEC] px-4 py-3 text-sm font-bold text-[#B42318]">
            {errorMessage}
          </div>
        )}

        {successMessage && (
          <div className="mt-5 rounded-2xl border border-[#BBF7D0] bg-[#DCFCE7] px-4 py-3 text-sm font-bold text-[#0B3D2E]">
            {successMessage}
          </div>
        )}

        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Total lançado"
            value={formatCurrency(sumCharges(charges))}
            helper={`${charges.length} cobranças`}
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
              placeholder="Buscar por unidade, morador ou descrição..."
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
                    <th className="px-4 py-3 font-extrabold">Descrição</th>
                    <th className="px-4 py-3 font-extrabold">Unidade</th>
                    <th className="px-4 py-3 font-extrabold">Responsável</th>
                    <th className="px-4 py-3 font-extrabold">Valor</th>
                    <th className="px-4 py-3 font-extrabold">Vencimento</th>
                    <th className="px-4 py-3 font-extrabold">Status</th>
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
                            {unit ? `${unit.buildingName} - ${unit.number}` : "-"}
                          </td>
                          <td className="px-4 py-4 font-semibold text-[#6B7280]">
                            {unit?.responsiblePersonName || "Sem responsável"}
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
            className="w-full max-w-3xl overflow-hidden rounded-[2rem] border border-[#E5E7EB] bg-white shadow-2xl shadow-[#0B3D2E]/20"
          >
            <div className="flex items-center justify-between border-b border-[#E5E7EB] px-6 py-5">
              <div>
                <h2 className="text-2xl font-extrabold text-[#111827]">Nova cobrança</h2>
                <p className="mt-1 text-sm font-semibold text-[#6B7280]">
                  Cadastre uma cobrança para uma unidade real.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="flex size-10 cursor-pointer items-center justify-center rounded-full bg-[#F3F4F6] text-xl font-light text-[#6B7280] transition hover:bg-[#FDECEC] hover:text-[#B42318]"
              >
                x
              </button>
            </div>

            <div className="grid grid-cols-1 gap-5 px-8 py-7 md:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-sm font-extrabold text-[#111827]">
                  Unidade
                </span>
                <select
                  value={form.unitId}
                  onChange={(event) => setForm((current) => ({ ...current, unitId: event.target.value }))}
                  className="h-12 w-full rounded-2xl border border-[#E5E7EB] bg-white px-4 text-sm font-bold text-[#111827] outline-none transition focus:border-[#22C55E] focus:ring-4 focus:ring-[#86EFAC]/30"
                >
                  <option value="">Selecione</option>
                  {units.map((unit) => (
                    <option key={unit.id} value={unit.id}>
                      {unit.buildingName} - {unit.number}
                    </option>
                  ))}
                </select>
              </label>

              <FormInput
                label="Valor"
                type="number"
                min="0.01"
                step="0.01"
                value={form.value}
                onChange={(value) => setForm((current) => ({ ...current, value }))}
              />
              <FormInput
                label="Vencimento"
                type="date"
                value={form.dueDate}
                onChange={(value) => setForm((current) => ({ ...current, dueDate: value }))}
              />
              <FormInput
                label="Descrição"
                value={form.description}
                onChange={(value) => setForm((current) => ({ ...current, description: value }))}
              />
            </div>

            <div className="border-t border-[#E5E7EB] px-8 py-5">
              <button
                type="submit"
                disabled={isSubmitting}
                className="h-12 w-full cursor-pointer rounded-2xl bg-[#16A34A] text-sm font-extrabold text-white shadow-sm shadow-[#16A34A]/30 transition hover:bg-[#0B3D2E] disabled:cursor-not-allowed disabled:bg-[#9CA3AF]"
              >
                {isSubmitting ? "Cadastrando..." : "Cadastrar cobrança"}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}

type FormInputProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  min?: string;
  step?: string;
};

function FormInput({ label, value, onChange, type = "text", min, step }: FormInputProps) {
  return (
    <label className="block">
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
