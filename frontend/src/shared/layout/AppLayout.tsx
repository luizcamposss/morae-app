import { Topbar } from "./Topbar";
import { Sidebar } from "./Sidebar";
import { Outlet } from "react-router-dom";

export function AppLayout() {
    return (
        <div className="flex min-h-screen bg-[#F3F4F6] text-[#111827]">
            <aside className="relative z-30 w-24 shrink-0">
                <Sidebar />
            </aside>

            <main className="flex min-w-0 flex-1 flex-col px-7 py-6">
                <header className="h-16">
                    <Topbar />
                </header>

                <section className="flex-1 pt-8">
                    <Outlet />
                </section>
            </main>
        </div>
    )
}
