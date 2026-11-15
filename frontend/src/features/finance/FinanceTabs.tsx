import { NavLink, useLocation } from "react-router-dom";
import { useFinanceTabs } from "./useFinanceTabs";

const tabClass = (isActive: boolean) =>
  `shrink-0 rounded-field px-4 py-2.5 text-sm font-semibold transition-colors ${isActive ? "bg-superficie text-tinta shadow-whisper" : "text-tinta-suave hover:text-tinta"}`;

// Tabs of "Financeiro" (Admin and syndic): Resumo · Contas · Despesas e relatórios, the last one with
// its own pages under it. Outside /finance (e.g. the resident's balance) it renders nothing.
export function FinanceTabs() {
  const { pathname } = useLocation();
  const tabs = useFinanceTabs();
  const base = pathname.startsWith("/syndic") ? "/syndic/finance" : "/admin/finance";

  if (!pathname.startsWith(base)) return null;

  const current = pathname.slice(base.length).replace(/^\//, "");
  const records = tabs.find((tab) => tab.group?.some((page) => page.path === current))?.group;

  return (
    <div className="-mt-4 mb-8 flex flex-col gap-3">
      <nav aria-label="Financeiro" className="flex gap-1 overflow-x-auto rounded-block bg-menu p-1 sm:self-start">
        {tabs.map((tab) => {
          const isActive = tab.group ? Boolean(records && tab.group === records) : current === tab.path;
          return (
            <NavLink key={tab.label} to={tab.path ? `${base}/${tab.path}` : base} className={tabClass(isActive)} aria-current={isActive ? "page" : undefined}>
              {tab.label}
            </NavLink>
          );
        })}
      </nav>
      {records && records.length > 1 && (
        <nav aria-label="Despesas e relatórios" className="flex gap-1 overflow-x-auto">
          {records.map((page) => (
            <NavLink
              key={page.path}
              to={`${base}/${page.path}`}
              end
              className={({ isActive }) =>
                `shrink-0 rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors ${isActive ? "bg-tinta text-white" : "text-tinta-suave hover:bg-menu hover:text-tinta"}`
              }
            >
              {page.label}
            </NavLink>
          ))}
        </nav>
      )}
    </div>
  );
}
