import { MetricCard } from '../../shared/components/MetricCard'
import { StatusBadge } from '../../shared/components/StatusBadge'

const metrics = [
    {
        label: 'Usuarios ativos',
        value: '128',
        helper: 'Acessos liberados',
    },
    {
        label: 'Convites pendentes',
        value: '14',
        helper: 'Aguardando aceite',
    },
    {
        label: 'Desativados',
        value: '6',
        helper: 'Sem acesso atual',
    },
    {
        label: 'Ultimos acessos',
        value: '37',
        helper: 'Nas ultimas 24h',
    },
]

const users = [
    {
        name: 'Carlos Silva',
        email: 'carlos@gmail.com',
        condominium: 'Jardim Sul',
        status: 'Ativo',
        access: 'Hoje',
        variant: 'success' as const,
    },
    {
        name: 'Marcos Lima',
        email: 'marcos@gmail.com',
        condominium: 'Central',
        status: 'Pendente',
        access: '-',
        variant: 'warning' as const,
    },
    {
        name: 'Paula Martins',
        email: 'paula@gmail.com',
        condominium: 'Bela Vista',
        status: 'Desativado',
        access: '12/05',
        variant: 'neutral' as const,
    },
]

export function UsersPage() {
    return (
        <section className="rounded-[2rem] border border-[#E5E7EB] bg-white p-6 shadow-sm">
            <div>
                <h1 className="text-3xl font-extrabold tracking-tight text-[#111827]">
                    Usuarios
                </h1>
                <p className="mt-1 text-sm font-semibold text-[#6B7280]">
                    Gerenciador de usuarios da plataforma.
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
                        placeholder="Buscar por nome/e-mail..."
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
                                <th className="px-4 py-3 font-extrabold">Responsavel</th>
                                <th className="px-4 py-3 font-extrabold">E-mail</th>
                                <th className="px-4 py-3 font-extrabold">Condominio</th>
                                <th className="px-4 py-3 font-extrabold">Status</th>
                                <th className="px-4 py-3 font-extrabold">Acesso</th>
                                <th className="px-4 py-3 font-extrabold">Acoes</th>
                            </tr>
                        </thead>

                        <tbody className="divide-y divide-[#E5E7EB]">
                            {users.map((user) => (
                                <tr key={user.email} className="transition hover:bg-[#F3F4F6]">
                                    <td className="px-4 py-4 font-extrabold text-[#111827]">
                                        {user.name}
                                    </td>
                                    <td className="px-4 py-4 font-semibold text-[#6B7280]">
                                        {user.email}
                                    </td>
                                    <td className="px-4 py-4 font-semibold text-[#6B7280]">
                                        {user.condominium}
                                    </td>
                                    <td className="px-4 py-4">
                                        <StatusBadge label={user.status} variant={user.variant} />
                                    </td>
                                    <td className="px-4 py-4 font-semibold text-[#6B7280]">
                                        {user.access}
                                    </td>
                                    <td className="px-4 py-4">
                                        <div className="flex flex-wrap gap-2">
                                            <button className="rounded-xl border border-[#E5E7EB] bg-white px-3 py-1.5 text-xs font-bold text-[#6B7280] transition hover:bg-[#DCFCE7] hover:text-[#0B3D2E]">
                                                Ver
                                            </button>
                                            <button className="rounded-xl border border-[#E5E7EB] bg-white px-3 py-1.5 text-xs font-bold text-[#6B7280] transition hover:bg-[#DCFCE7] hover:text-[#0B3D2E]">
                                                Ver condominio
                                            </button>
                                            <button className="rounded-xl border border-[#E5E7EB] bg-white px-3 py-1.5 text-xs font-bold text-[#6B7280] transition hover:bg-[#DCFCE7] hover:text-[#0B3D2E]">
                                                Reenviar acesso
                                            </button>
                                            <button className="rounded-xl border border-[#E5E7EB] bg-white px-3 py-1.5 text-xs font-bold text-[#B42318] transition hover:bg-[#FDECEC]">
                                                Bloquear/Reativar
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <p className="mt-4 text-sm font-semibold text-[#6B7280]">
                    Acoes planejadas: ver detalhes, abrir condominio, reenviar acesso e bloquear ou reativar usuario.
                </p>
            </div>
        </section>
    )
}
