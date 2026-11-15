import { useModuleEnabled } from "../modules/modules";
import { useSyndicCan } from "../syndicAccess/useSyndicAccess";

// Tabs the user may open, in order. The first one is where "Financeiro" lands.
export function useFinanceTabs() {
  const canFinance = useSyndicCan("finance");
  const canExpenses = useSyndicCan("expenses.manage");
  const hasExpenses = useModuleEnabled("expenses");

  return [
    { path: "", label: "Contas do mês", show: canFinance },
    { path: "receivables", label: "A receber", show: canFinance },
    { path: "expenses", label: "Despesas", show: hasExpenses && canExpenses },
    // Every member may see the balance (residents too), so the syndic needs no permission for it.
    { path: "balance", label: "Balanço", show: hasExpenses },
    // Each report checks its own permission; the tab shows when at least one is allowed.
    { path: "reports", label: "Relatórios", show: canFinance || (hasExpenses && canExpenses) },
  ].filter((tab) => tab.show);
}
