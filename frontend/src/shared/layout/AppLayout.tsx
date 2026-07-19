import { Topbar } from "./Topbar";
import { Sidebar } from "./Sidebar";
import { Outlet } from "react-router-dom";

export function AppLayout() {
    return (
        <div className="min-h-screen bg-[#F3F4F6] text-[#111827]">
            <Sidebar />

            <main className="flex min-w-0 flex-1 flex-col px-4 pb-28 pt-4 sm:px-6 lg:ml-24 lg:px-7 lg:py-6">
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
