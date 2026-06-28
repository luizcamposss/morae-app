const menuItems = [
    { label: 'Dashboard', icon: 'D' },
    { label: 'Meus Boletos', icon: 'B' },
    { label: 'Avisos', icon: 'A' },
    { label: 'Solicitacoes', icon: 'S' },
    { label: 'Manutencoes', icon: 'M' },
    { label: 'Minha Unidade', icon: 'U' },
    { label: 'Vistorias', icon: 'V' },
    { label: 'Configuracoes', icon: 'G' },
]

export function Sidebar() {
    const activeItem = 'Configuracoes'

    return (
        <div className="group fixed left-6 top-1/2 flex -translate-y-1/2 items-center">
            <div className="flex h-[560px] w-14 flex-col items-center justify-between rounded-[1.75rem] border border-[#E5E7EB] bg-white py-5 shadow-sm">
                <div className="flex flex-col items-center gap-4">
                    {menuItems.map((item) => (
                        <button
                            key={item.label}
                            className={`flex size-9 items-center justify-center rounded-full text-xs font-extrabold transition ${
                                item.label === activeItem
                                    ? 'bg-[#16A34A] text-white shadow-sm shadow-[#16A34A]/30'
                                    : 'bg-[#F3F4F6] text-[#6B7280] hover:bg-[#DCFCE7] hover:text-[#16A34A]'
                            }`}
                            title={item.label}
                        >
                            {item.icon}
                        </button>
                    ))}
                </div>

                <div className="flex flex-col items-center gap-4">
                    <button
                        className="flex size-9 items-center justify-center rounded-full bg-[#F3F4F6] text-xs font-extrabold text-[#6B7280] hover:bg-[#DCFCE7] hover:text-[#16A34A]"
                        title="Configuracoes"
                    >
                        C
                    </button>

                    <button
                        className="flex size-9 items-center justify-center rounded-full bg-[#F3F4F6] text-xs font-extrabold text-[#6B7280] hover:bg-[#FDECEC] hover:text-[#B42318]"
                        title="Sair"
                    >
                        S
                    </button>
                </div>
            </div>

            <div className="pointer-events-none absolute left-20 top-1/2 flex h-[560px] w-64 -translate-y-1/2 translate-x-2 flex-col rounded-[1.75rem] border border-[#E5E7EB] bg-white p-5 opacity-0 shadow-2xl shadow-[#0B3D2E]/10 transition duration-200 group-hover:pointer-events-auto group-hover:translate-x-0 group-hover:opacity-100">
                <div className="mb-8">
                    <p className="text-xl font-extrabold text-[#0B3D2E]">
                        morae
                    </p>
                    <p className="mt-1 text-sm font-semibold text-[#6B7280]">
                        Painel Morador
                    </p>
                </div>

                <nav className="flex flex-1 flex-col gap-2">
                    {menuItems.map((item) => (
                        <button
                            key={item.label}
                            className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-bold transition ${
                                item.label === activeItem
                                    ? 'bg-[#DCFCE7] text-[#0B3D2E]'
                                    : 'text-[#111827] hover:bg-[#DCFCE7] hover:text-[#0B3D2E]'
                            }`}
                        >
                            <span className="flex size-7 items-center justify-center rounded-full bg-[#F3F4F6] text-xs text-[#16A34A]">
                                {item.icon}
                            </span>
                            {item.label}
                        </button>
                    ))}
                </nav>

                <div className="space-y-3">
                    <div className="flex items-center justify-between px-4 text-sm font-semibold text-[#6B7280]">
                        <span>morador</span>
                        <span className="size-4 rounded-full border border-[#16A34A] bg-[#DCFCE7]" />
                    </div>

                    <button className="w-full rounded-2xl border border-[#E5E7EB] px-4 py-3 text-sm font-bold text-[#111827] transition hover:bg-[#F3F4F6]">
                        Sair
                    </button>
                </div>
            </div>
        </div>
    )
}
