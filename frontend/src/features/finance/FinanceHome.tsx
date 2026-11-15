import { Navigate, useLocation } from "react-router-dom";
import { PageHeader } from "../../shared/layout/PageHeader";
import { FinanceSummaryPage } from "./FinanceSummaryPage";
import { useFinanceTabs } from "./useFinanceTabs";

// "Financeiro" opens on the Resumo; a syndic without finance access lands on the first tab he has.
export function FinanceHome() {
  const tabs = useFinanceTabs();
  const { pathname } = useLocation();

  if (tabs[0]?.path === "") return <FinanceSummaryPage />;

  if (tabs.length > 0) return <Navigate to={`${pathname.replace(/\/$/, "")}/${tabs[0].path}`} replace />;

  return (
    <>
      <PageHeader title="Financeiro" />
      <p className="rounded-field bg-campo px-4 py-5 text-sm text-tinta-suave">
        Você ainda não tem acesso ao financeiro. A administração do condomínio escolhe as áreas liberadas para o síndico.
      </p>
    </>
  );
}
