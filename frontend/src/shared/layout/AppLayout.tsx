import { Link, Outlet } from "react-router-dom";
import { MoraeMark } from "../components/MoraeMark";
import { HeaderActions } from "./HeaderActions";
import { Sidebar } from "./Sidebar";

// No top bar (DESIGN.md → Navigation): the bell and the avatar sit at the top right of the content.
// Redesigned screens use <PageHeader>, which puts the title on that same line; on desktop the
// separate actions row then hides itself. Old screens keep the row until they are redesigned.
export function AppLayout() {
  return (
    <div className="min-h-screen bg-fundo text-tinta">
      <Sidebar />

      <div className="min-w-0 px-4 pb-28 pt-4 sm:px-6 lg:ml-62 lg:px-14 lg:pb-14 lg:pt-8 lg:[&:has([data-page-header])_[data-legacy-actions]]:hidden">
        <div data-legacy-actions className="mb-6 flex items-center justify-between lg:justify-end">
          <Link to="dashboard" aria-label="Moraê, ir para o início" className="rounded-field lg:hidden">
            <MoraeMark withName size={24} />
          </Link>
          <HeaderActions />
        </div>

        <main>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
