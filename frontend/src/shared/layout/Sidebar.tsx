const menuItems = [
    'Dashboard',
    'Condominios',
    'Convites',
    'Pagamentos',
    'Usuarios',
    'Configuracoes',
]

export function Sidebar() {
    return (
        <div className="group fixed left-6 top-1/2 flex -translate-y-1/2 items-center">
            <div className="flex h-[560px] w-14 flex-col items-center justify-between rounded-3xl border border-[#E5E5EA] bg-white py-5 shadow-sm">
                <div className="flex flex-col items-center gap-4">
                    {menuItems.map((item, index) => (
                        <button
                            key={item}
                            className={`flex size-9 items-center justify-center rounded-full text-xs font-semibold transition ${
                                index === 0
                                    ? 'bg-[#178A63] text-white'
                                    : 'bg-[#F7F6F2] text-[#6E756F] hover:bg-[#E7F6EF] hover:text-[#178A63]'
                            }`}
                            title={item}
                        >
                            {item.slice(0, 1)}
                        </button>
                    ))}
                </div>

                <div className="flex flex-col items-center gap-4">
                    <button
                        className="flex size-9 items-center justify-center rounded-full bg-[#F7F6F2] text-xs font-semibold text-[#6E756F] hover:bg-[#E7F6EF] hover:text-[#178A63]"
                        title="Configuracoes"
                    >
                        C
                    </button>

                    <button
                        className="flex size-9 items-center justify-center rounded-full bg-[#F7F6F2] text-xs font-semibold text-[#6E756F] hover:bg-[#FDECEC] hover:text-[#B42318]"
                        title="Sair"
                    >
                        S
                    </button>
                </div>
            </div>

            <div className="pointer-events-none absolute left-20 top-1/2 flex h-[560px] w-64 -translate-y-1/2 flex-col rounded-3xl border border-[#E5E5EA] bg-white p-5 opacity-0 shadow-xl transition duration-200 group-hover:pointer-events-auto group-hover:opacity-100">
                <div className="mb-8">
                    <p className="text-xl font-semibold text-[#178A63]">
                        morae
                    </p>
                    <p className="mt-1 text-sm text-[#6E756F]">
                        Painel Master
                    </p>
                </div>

                <nav className="flex flex-1 flex-col gap-2">
                    {menuItems.map((item) => (
                        <button
                            key={item}
                            className="rounded-2xl px-4 py-3 text-left text-sm font-medium text-[#1F2421] transition hover:bg-[#F7F6F2] hover:text-[#178A63]"
                        >
                            {item}
                        </button>
                    ))}
                </nav>

                <div className="space-y-3">
                    <div className="flex items-center justify-between px-4 text-sm text-[#6E756F]">
                        <span>master</span>
                        <span className="size-4 rounded-full border border-[#6E756F]" />
                    </div>

                    <button className="w-full rounded-2xl border border-[#E5E5EA] px-4 py-3 text-sm font-medium text-[#1F2421] transition hover:bg-[#F7F6F2]">
                        Sair
                    </button>
                </div>
            </div>
        </div>
    )
}
