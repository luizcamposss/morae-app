import { NavLink, useLocation } from "react-router-dom";
import { useFinanceTabs } from "./useFinanceTabs";

// Tabs of the "Financeiro" area (Admin and syndic). Rendered by each finance screen under its
// header; outside /finance (e.g. the resident's balance) it renders nothing.
export function FinanceTabs() {
  const { pathname } = useLocation();
  const tabs = useFinanceTabs();
  const base = pathname.startsWith("/syndic") ? "/syndic/finance" : "/admin/finance";

  if (!pathname.startsWith(base)) return null;

  return (
    <nav aria-label="Financeiro" className="-mt-4 mb-8 flex gap-1 overflow-x-auto rounded-block bg-menu p-1 sm:inline-flex">
      {tabs.map((tab) => (
        <NavLink
          key={tab.path}
          to={tab.path ? `${base}/${tab.path}` : base}
          end
          className={({ isActive }) =>
            `shrink-0 rounded-field px-4 py-2.5 text-sm font-semibold transition-colors ${
              isActive ? "bg-superficie text-tinta shadow-whisper" : "text-tinta-suave hover:text-tinta"
            }`
          }
        >
          {tab.label}
        </NavLink>
      ))}
    </nav>
  );
}
