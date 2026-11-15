import { useModuleEnabled } from "../modules/modules";
import { useSyndicCan } from "../syndicAccess/useSyndicAccess";

export type FinanceTab = { path: string; label: string };

// The three tabs of "Financeiro" (#210) and the pages of the third one, filtered by what the user
// may open. The first tab is where "Financeiro" lands.
export function useFinanceTabs() {
  const canFinance = useSyndicCan("finance");
  const canExpenses = useSyndicCan("expenses.manage");
  const hasExpenses = useModuleEnabled("expenses");

  // Despesas e relatórios: expenses, balance (every member may see it) and the reports.
  const records: FinanceTab[] = [
    ...(hasExpenses && canExpenses ? [{ path: "expenses", label: "Despesas" }] : []),
    ...(hasExpenses ? [{ path: "balance", label: "Balanço" }] : []),
    ...(canFinance || (hasExpenses && canExpenses) ? [{ path: "reports", label: "Relatórios" }] : []),
  ];

  const tabs: Array<FinanceTab & { group?: FinanceTab[] }> = [
    ...(canFinance ? [{ path: "", label: "Resumo" }, { path: "accounts", label: "Contas" }] : []),
    ...(records.length > 0 ? [{ path: records[0].path, label: "Despesas e relatórios", group: records }] : []),
  ];

  return tabs;
}
