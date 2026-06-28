import { StatusBadge } from '../../shared/components/StatusBadge'

const inspections = [
    {
        type: 'Entrada',
        date: '20/05/2026',
        status: 'Concluida',
        action: 'Ver relatorio',
        variant: 'success' as const,
    },
    {
        type: 'Manutencao',
        date: '15/05/2026',
        status: 'Concluida',
        action: 'Ver relatorio',
        variant: 'success' as const,
    },
    {
        type: 'Saida',
        date: '-',
        status: 'Agendada',
        action: 'Ver detalhes',
        variant: 'neutral' as const,
    },
]

export function ResidentInspectionsPage() {
    return (
        <section className="min-h-[620px] rounded-[2rem] border border-[#E5E7EB] bg-white p-6 shadow-sm">
            <div className="mb-16">
                <h1 className="text-3xl font-extrabold tracking-tight text-[#111827]">
                    Minhas vistorias
                </h1>
                <p className="mt-1 text-sm font-semibold text-[#6B7280]">
                    Predio A - Apto 101
                </p>
            </div>

            <div className="mx-auto max-w-3xl rounded-[1.5rem] border border-[#E5E7EB] bg-[#F3F4F6] p-4">
                <div className="mb-4 flex justify-end">
                    <button
                        type="button"
                        className="h-10 rounded-2xl border border-[#E5E7EB] bg-white px-5 text-sm font-bold text-[#6B7280] transition hover:bg-[#DCFCE7] hover:text-[#0B3D2E]"
                    >
                        Todos
                    </button>
                </div>

                <div className="overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white">
                    <table className="w-full border-collapse text-left text-sm">
                        <thead className="bg-[#DCFCE7] text-xs uppercase tracking-wide text-[#0B3D2E]">
                            <tr>
                                <th className="px-4 py-3 font-extrabold">Tipo</th>
                                <th className="px-4 py-3 font-extrabold">Data</th>
                                <th className="px-4 py-3 font-extrabold">Status</th>
                                <th className="px-4 py-3 font-extrabold">Acao</th>
                            </tr>
                        </thead>

                        <tbody className="divide-y divide-[#E5E7EB]">
                            {inspections.map((inspection) => (
                                <tr key={`${inspection.type}-${inspection.date}`} className="transition hover:bg-[#F3F4F6]">
                                    <td className="px-4 py-4 font-extrabold text-[#111827]">
                                        {inspection.type}
                                    </td>
                                    <td className="px-4 py-4 font-semibold text-[#6B7280]">
                                        {inspection.date}
                                    </td>
                                    <td className="px-4 py-4">
                                        <StatusBadge label={inspection.status} variant={inspection.variant} />
                                    </td>
                                    <td className="px-4 py-4">
                                        <button className="rounded-xl border border-[#E5E7EB] bg-white px-3 py-1.5 text-xs font-bold text-[#6B7280] transition hover:bg-[#DCFCE7] hover:text-[#0B3D2E]">
                                            {inspection.action}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </section>
    )
}
