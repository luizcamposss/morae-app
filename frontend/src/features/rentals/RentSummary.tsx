import { SummaryCard } from "../../shared/components/SummaryCard";
import { formatCurrency } from "../../shared/lib/currency";
import { todayInputDate } from "../../shared/lib/date";
import { amountDue } from "../adminPayments/chargeForm";
import { CHARGE_STATUS } from "../charges/platformRevenue";
import type { ChargeResponse } from "../charges/types";
import { rentOf } from "./rentalService";

// Same numbers for whoever rents units out (#212): the building owner (Admin) and a unit owner.
export function RentSummary({ bills, activeContracts, isLoading }: { bills: ChargeResponse[]; activeContracts: number; isLoading: boolean }) {
  const month = todayInputDate().slice(0, 7);
  const withRent = bills.filter((bill) => rentOf(bill) > 0);
  const received = withRent.filter((bill) => bill.status === CHARGE_STATUS.paid && bill.dueDate.startsWith(month)).reduce((total, bill) => total + rentOf(bill), 0);
  const toReceive = withRent.filter((bill) => bill.status === CHARGE_STATUS.pending).reduce((total, bill) => total + rentOf(bill), 0);
  const late = withRent.filter((bill) => bill.status === CHARGE_STATUS.overdue);
  // Late rent with its share of fine and interest (owner's rent has none).
  const lateTotal = late.reduce((total, bill) => total + rentOf(bill) * (bill.value > 0 ? amountDue(bill) / bill.value : 1), 0);

  return (
    <SummaryCard
      items={[
        { label: "Recebido no mês", value: isLoading ? "–" : formatCurrency(received), detail: "aluguéis que venceram este mês", tone: "good" },
        { label: "A receber", value: isLoading ? "–" : formatCurrency(toReceive), detail: "contas já enviadas" },
        {
          label: "Em atraso",
          value: isLoading ? "–" : formatCurrency(lateTotal),
          detail: late.length ? `${late.length} ${late.length === 1 ? "conta" : "contas"}` : "nenhum atraso",
          tone: late.length ? "danger" : "neutral",
        },
        { label: "Contratos ativos", value: isLoading ? "–" : String(activeContracts), detail: activeContracts === 1 ? "unidade alugada" : "unidades alugadas" },
      ]}
    />
  );
}
