import { MasterDashboardPage } from "../../features/masterDashboard/MasterDashboardPage";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

export function AppLayout() {
    return (
        <div className="flex min-h-screen bg-[#F7F6F2] text-[#1F2421]">
            <aside className="relative z-20 w-24 shrink-0">
                <Sidebar />
            </aside>

            <main className="flex min-w-0 flex-1 flex-col px-8 py-6">
                <header className="h-16">
                    <Topbar />
                </header>

                <section className="flex-1 pt-8">
                    <MasterDashboardPage />
                </section>
            </main>
        </div>
    )
}
