import { MetricCard } from '../../shared/components/MetricCard'
import { StatusBadge } from '../../shared/components/StatusBadge'

const metrics = [
    {
        label: 'Unidades',
        value: '40',
        helper: 'Predio A',
    },
    {
        label: 'Moradores',
        value: '78',
        helper: 'Vinculados ao predio',
    },
    {
        label: 'Pendentes',
        value: '5',
        helper: 'Aguardando acesso',
    },
    {
        label: 'Sem acesso',
        value: '9',
        helper: 'Somente cadastro',
    },
]

const residents = [
    {
        name: 'Maria Souza',
        unit: 'Apto 101',
        phone: '(54) 99999-9999',
        access: 'Ativo',
        profile: 'Moradora',
        variant: 'success' as const,
    },
    {
        name: 'Joao Lima',
        unit: 'Apto 102',
        phone: '(54) 99999-9999',
        access: 'Pendente',
        profile: 'Morador',
        variant: 'warning' as const,
    },
    {
        name: 'Carlos Dias',
        unit: 'Apto 204',
        phone: '(54) 99999-9999',
        access: 'Sem acesso',
        profile: 'Proprietario',
        variant: 'neutral' as const,
    },
]

export function SyndicResidentsPage() {
    return (
        <section className="rounded-[2rem] border border-[#E5E7EB] bg-white p-6 shadow-sm">
            <div>
                <h1 className="text-3xl font-extrabold tracking-tight text-[#111827]">
                    Moradores
                </h1>
                <p className="mt-1 text-sm font-semibold text-[#6B7280]">
                    Consulte moradores e unidades do predio.
                </p>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                {metrics.map((metric) => (
                    <MetricCard
                        key={metric.label}
                        label={metric.label}
                        value={metric.value}
                        helper={metric.helper}
                    />
                ))}
            </div>

            <div className="mt-6 rounded-[1.5rem] border border-[#E5E7EB] bg-[#F3F4F6] p-4">
                <div className="mb-4 flex flex-col gap-3 md:flex-row">
                    <input
                        type="search"
                        placeholder="Buscar morador ou unidade..."
                        className="h-11 flex-1 rounded-2xl border border-[#E5E7EB] bg-white px-4 text-sm font-semibold text-[#111827] outline-none transition placeholder:text-[#9CA3AF] focus:border-[#22C55E] focus:ring-4 focus:ring-[#86EFAC]/30"
                    />

                    <button
                        type="button"
                        className="h-11 rounded-2xl border border-[#E5E7EB] bg-white px-5 text-sm font-bold text-[#6B7280] transition hover:bg-[#DCFCE7] hover:text-[#0B3D2E]"
                    >
                        Todos
                    </button>
                </div>

                <div className="overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white">
                    <table className="w-full border-collapse text-left text-sm">
                        <thead className="bg-[#DCFCE7] text-xs uppercase tracking-wide text-[#0B3D2E]">
                            <tr>
                                <th className="px-4 py-3 font-extrabold">Nome</th>
                                <th className="px-4 py-3 font-extrabold">Unidade</th>
                                <th className="px-4 py-3 font-extrabold">Telefone</th>
                                <th className="px-4 py-3 font-extrabold">Acesso</th>
                                <th className="px-4 py-3 font-extrabold">Perfil</th>
                                <th className="px-4 py-3 font-extrabold">Acoes</th>
                            </tr>
                        </thead>

                        <tbody className="divide-y divide-[#E5E7EB]">
                            {residents.map((resident) => (
                                <tr key={`${resident.name}-${resident.unit}`} className="transition hover:bg-[#F3F4F6]">
                                    <td className="px-4 py-4 font-extrabold text-[#111827]">
                                        {resident.name}
                                    </td>
                                    <td className="px-4 py-4 font-semibold text-[#6B7280]">
                                        {resident.unit}
                                    </td>
                                    <td className="px-4 py-4 font-semibold text-[#6B7280]">
                                        {resident.phone}
                                    </td>
                                    <td className="px-4 py-4">
                                        <StatusBadge label={resident.access} variant={resident.variant} />
                                    </td>
                                    <td className="px-4 py-4 font-semibold text-[#6B7280]">
                                        {resident.profile}
                                    </td>
                                    <td className="px-4 py-4">
                                        <div className="flex flex-wrap gap-2">
                                            <button className="rounded-xl border border-[#E5E7EB] bg-white px-3 py-1.5 text-xs font-bold text-[#6B7280] transition hover:bg-[#DCFCE7] hover:text-[#0B3D2E]">
                                                Ver
                                            </button>
                                            <button className="rounded-xl border border-[#E5E7EB] bg-white px-3 py-1.5 text-xs font-bold text-[#6B7280] transition hover:bg-[#DCFCE7] hover:text-[#0B3D2E]">
                                                Mensagem
                                            </button>
                                            <button className="rounded-xl border border-[#E5E7EB] bg-white px-3 py-1.5 text-xs font-bold text-[#6B7280] transition hover:bg-[#DCFCE7] hover:text-[#0B3D2E]">
                                                Solicitar atualizacao
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <p className="mt-4 text-sm font-semibold text-[#6B7280]">
                    Acoes planejadas: ver detalhes, enviar mensagem e solicitar atualizacao cadastral.
                </p>
            </div>
        </section>
    )
}
