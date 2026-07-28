import { useEffect, useMemo, useState } from "react";
import { useCondominium } from "../../app/providers/useCondominium";
import { MetricCard } from "../../shared/components/MetricCard";
import { StatusBadge } from "../../shared/components/StatusBadge";
import { getChargesByCondominium } from "../charges/chargeService";
import type { ChargeResponse, ChargeStatus } from "../charges/types";

type StatusFilter = "all" | ChargeStatus;

export function SyndicFinancePage() {
  const { activeCondominium, activeCondominiumId } = useCondominium();
  const [charges, setCharges] = useState<ChargeResponse[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function loadCharges() {
      if (!activeCondominiumId) {
        setCharges([]);
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setErrorMessage("");
        setCharges(await getChargesByCondominium(activeCondominiumId));
      } catch (error) {
        setCharges([]);
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Não foi possível carregar as cobranças.",
        );
      } finally {
        setIsLoading(false);
      }
    }

    void loadCharges();
  }, [activeCondominiumId]);

  const filteredCharges = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return charges.filter((charge) => {
      const matchesStatus = statusFilter === "all" || charge.status === statusFilter;
      const matchesSearch =
        !normalizedSearch ||
        [
          charge.description,
          charge.condominiumName,
          charge.buildingName ?? "",
          charge.unitNumber ?? "",
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalizedSearch);

      return matchesStatus && matchesSearch;
    });
  }, [charges, searchTerm, statusFilter]);

  const pendingCharges = charges.filter((charge) => charge.status === 1);
  const paidCharges = charges.filter((charge) => charge.status === 2);
  const overdueCharges = charges.filter((charge) => charge.status === 3);
  const openAmount = charges
    .filter((charge) => charge.status === 1 || charge.status === 3)
    .reduce((total, charge) => total + charge.value, 0);

  return (
    <section className="rounded-[2rem] border border-[#E5E7EB] bg-white p-5 shadow-sm sm:p-6 lg:p-7">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.38em] text-[#16A34A]">
          Financeiro
        </p>
        <h1 className="mt-3 text-3xl font-black tracking-tight text-[#111827] sm:text-4xl">
          Cobranças do condomínio
        </h1>
        <p className="mt-2 text-sm font-semibold text-[#6B7280]">
          Consulta financeira de {activeCondominium?.condominiumName ?? "seu condomínio"}.
        </p>
      </div>

      {errorMessage && (
        <div className="mt-5 rounded-2xl border border-[#FECACA] bg-[#FDECEC] px-4 py-3 text-sm font-bold text-[#B42318]">
          {errorMessage}
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Total"
          value={charges.length.toString()}
          helper="Cobranças encontradas"
        />
        <MetricCard
          label="Pendentes"
          value={pendingCharges.length.toString()}
          helper={formatCurrency(pendingCharges.reduce((total, charge) => total + charge.value, 0))}
        />
        <MetricCard
          label="Pagas"
          value={paidCharges.length.toString()}
          helper={formatCurrency(paidCharges.reduce((total, charge) => total + charge.value, 0))}
        />
        <MetricCard
          label="Em aberto"
          value={formatCurrency(openAmount)}
          helper={`${overdueCharges.length} atrasadas`}
        />
      </div>

      <div className="mt-6 rounded-[1.5rem] border border-[#E5E7EB] bg-[#F3F4F6] p-4">
        <div className="mb-4 flex flex-col gap-3 md:flex-row">
          <input
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Buscar descrição, prédio ou unidade..."
            className="h-11 flex-1 rounded-2xl border border-[#E5E7EB] bg-white px-4 text-sm font-semibold text-[#111827] outline-none transition placeholder:text-[#9CA3AF] focus:border-[#22C55E] focus:ring-4 focus:ring-[#86EFAC]/30"
          />

          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(
                event.target.value === "all" ? "all" : Number(event.target.value) as ChargeStatus,
              )
            }
            className="h-11 cursor-pointer rounded-2xl border border-[#E5E7EB] bg-white px-4 text-sm font-bold text-[#6B7280] outline-none transition focus:border-[#22C55E] focus:ring-4 focus:ring-[#86EFAC]/30"
          >
            <option value="all">Todos</option>
            <option value={1}>Pendentes</option>
            <option value={2}>Pagas</option>
            <option value={3}>Atrasadas</option>
            <option value={4}>Canceladas</option>
          </select>
        </div>

        <div className="overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-[#DCFCE7] text-xs uppercase tracking-wide text-[#0B3D2E]">
                <tr>
                  <th className="px-4 py-3 font-extrabold">Descrição</th>
                  <th className="px-4 py-3 font-extrabold">Unidade</th>
                  <th className="px-4 py-3 font-extrabold">Valor</th>
                  <th className="px-4 py-3 font-extrabold">Vencimento</th>
                  <th className="px-4 py-3 font-extrabold">Status</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-[#E5E7EB]">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center font-bold text-[#6B7280]">
                      Carregando cobranças...
                    </td>
                  </tr>
                ) : filteredCharges.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center font-bold text-[#6B7280]">
                      Nenhuma cobrança encontrada.
                    </td>
                  </tr>
                ) : (
                  filteredCharges.map((charge) => (
                    <tr key={charge.id} className="transition hover:bg-[#F3F4F6]">
                      <td className="px-4 py-4 font-extrabold text-[#111827]">
                        {charge.description}
                      </td>
                      <td className="px-4 py-4 font-semibold text-[#6B7280]">
                        {formatUnit(charge)}
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
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}

function formatUnit(charge: ChargeResponse) {
  if (!charge.unitNumber) return "Condomínio";

  return `${charge.buildingName ?? "Prédio"} - Unidade ${charge.unitNumber}`;
}

function getChargeStatusLabel(status: ChargeStatus) {
  if (status === 1) return "Pendente";
  if (status === 2) return "Paga";
  if (status === 3) return "Atrasada";
  if (status === 4) return "Cancelada";
  return "Indefinida";
}

function getChargeStatusVariant(status: ChargeStatus) {
  if (status === 1) return "warning";
  if (status === 2) return "success";
  if (status === 3) return "danger";
  return "neutral";
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR").format(new Date(value));
}
