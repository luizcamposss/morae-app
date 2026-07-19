import { useEffect, useMemo, useState } from "react";
import { MetricCard } from "../../shared/components/MetricCard";
import { StatusBadge } from "../../shared/components/StatusBadge";
import { getMyCharges } from "../charges/chargeService";
import type { ChargeResponse } from "../charges/types";

export function ResidentBillsPage() {
  const [charges, setCharges] = useState<ChargeResponse[]>([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function loadCharges() {
      try {
        setIsLoading(true);
        setErrorMessage("");
        setCharges(await getMyCharges());
      } catch (error) {
        setCharges([]);
        setErrorMessage(
          error instanceof Error ? error.message : "Não foi possível carregar seus boletos.",
        );
      } finally {
        setIsLoading(false);
      }
    }

    void loadCharges();
  }, []);

  const filteredCharges = useMemo(
    () =>
      charges.filter(
        (charge) => statusFilter === "all" || charge.status.toString() === statusFilter,
      ),
    [charges, statusFilter],
  );

  const pendingCharges = charges.filter((charge) => charge.status === 1);
  const paidCharges = charges.filter((charge) => charge.status === 2);
  const overdueCharges = charges.filter((charge) => charge.status === 3);

  return (
    <section className="rounded-[2rem] border border-[#E5E7EB] bg-white p-6 shadow-sm">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-[#111827]">
          Meus boletos
        </h1>
        <p className="mt-1 text-sm font-semibold text-[#6B7280]">
          Cobranças reais vinculadas às suas unidades.
        </p>
      </div>

      {errorMessage && (
        <div className="mt-5 rounded-2xl border border-[#FECACA] bg-[#FDECEC] px-4 py-3 text-sm font-bold text-[#B42318]">
          {errorMessage}
        </div>
      )}

      <div className="mx-auto mt-6 grid max-w-4xl grid-cols-1 gap-4 md:grid-cols-4">
        <MetricCard
          label="Total"
          value={charges.length.toString()}
          helper="Cobranças encontradas"
        />
        <MetricCard
          label="Em aberto"
          value={pendingCharges.length.toString()}
          helper={formatCurrency(sumCharges(pendingCharges))}
        />
        <MetricCard
          label="Pagos"
          value={paidCharges.length.toString()}
          helper={formatCurrency(sumCharges(paidCharges))}
        />
        <MetricCard
          label="Atrasados"
          value={overdueCharges.length.toString()}
          helper={formatCurrency(sumCharges(overdueCharges))}
        />
      </div>

      <div className="mt-6 rounded-[1.5rem] border border-[#E5E7EB] bg-[#F3F4F6] p-4">
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:justify-end">
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
                  <th className="px-4 py-3 font-extrabold">Valor</th>
                  <th className="px-4 py-3 font-extrabold">Vencimento</th>
                  <th className="px-4 py-3 font-extrabold">Status</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-[#E5E7EB]">
                {isLoading ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-10 text-center font-bold text-[#6B7280]">
                      Carregando boletos...
                    </td>
                  </tr>
                ) : filteredCharges.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-10 text-center font-bold text-[#6B7280]">
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
