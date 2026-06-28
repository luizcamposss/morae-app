import { MetricCard } from '../../shared/components/MetricCard'
import { StatusBadge } from '../../shared/components/StatusBadge'

const metrics = [
    {
        label: 'Aceitos recentemente',
        value: '12',
        helper: 'Nos ultimos 7 dias',
    },
    {
        label: 'Pendentes',
        value: '8',
        helper: 'Aguardando resposta',
    },
    {
        label: 'Expirados',
        value: '3',
        helper: 'Precisam de reenvio',
    },
]

const invitations = [
    {
        name: 'Carlos',
        email: 'carlos@gmail.com',
        condominium: 'Jardim Sul',
        status: 'Pendente',
        variant: 'warning' as const,
    },
    {
        name: 'Ana',
        email: 'ana@gmail.com',
        condominium: 'Solar Norte',
        status: 'Aceito',
        variant: 'success' as const,
    },
    {
        name: 'Marcos',
        email: 'marcos@gmail.com',
        condominium: 'Central',
        status: 'Expirado',
        variant: 'danger' as const,
    },
]

const actions = ['Ver', 'Copiar Link', 'Reenviar', 'Cancelar', 'Arquivar']

export function InvitationsPage() {
    return (
        <section className="rounded-[2rem] border border-[#E5E7EB] bg-white p-6 shadow-sm">
            <div>
                <h1 className="text-3xl font-extrabold tracking-tight text-[#111827]">
                    Convites
                </h1>
                <p className="mt-1 text-sm font-semibold text-[#6B7280]">
                    Gerenciador de convites da plataforma.
                </p>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
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
                        placeholder="Buscar..."
                        className="h-11 flex-1 rounded-2xl border border-[#E5E7EB] bg-white px-4 text-sm font-semibold text-[#111827] outline-none transition placeholder:text-[#9CA3AF] focus:border-[#22C55E] focus:ring-4 focus:ring-[#86EFAC]/30"
                    />

                    <button
                        type="button"
                        className="h-11 rounded-2xl border border-[#E5E7EB] bg-white px-5 text-sm font-bold text-[#6B7280] transition hover:bg-[#DCFCE7] hover:text-[#0B3D2E]"
                    >
                        Historico
                    </button>
                </div>

                <div className="overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white">
                    <table className="w-full border-collapse text-left text-sm">
                        <thead className="bg-[#DCFCE7] text-xs uppercase tracking-wide text-[#0B3D2E]">
                            <tr>
                                <th className="px-4 py-3 font-extrabold">Nome</th>
                                <th className="px-4 py-3 font-extrabold">E-mail</th>
                                <th className="px-4 py-3 font-extrabold">Condominio</th>
                                <th className="px-4 py-3 font-extrabold">Status</th>
                                <th className="px-4 py-3 font-extrabold">Acoes</th>
                            </tr>
                        </thead>

                        <tbody className="divide-y divide-[#E5E7EB]">
                            {invitations.map((invitation) => (
                                <tr key={invitation.email} className="transition hover:bg-[#F3F4F6]">
                                    <td className="px-4 py-4 font-extrabold text-[#111827]">
                                        {invitation.name}
                                    </td>
                                    <td className="px-4 py-4 font-semibold text-[#6B7280]">
                                        {invitation.email}
                                    </td>
                                    <td className="px-4 py-4 font-semibold text-[#6B7280]">
                                        {invitation.condominium}
                                    </td>
                                    <td className="px-4 py-4">
                                        <StatusBadge label={invitation.status} variant={invitation.variant} />
                                    </td>
                                    <td className="px-4 py-4">
                                        <div className="flex flex-wrap gap-2">
                                            {actions.map((action) => (
                                                <button
                                                    key={action}
                                                    className="rounded-xl border border-[#E5E7EB] bg-white px-3 py-1.5 text-xs font-bold text-[#6B7280] transition hover:bg-[#DCFCE7] hover:text-[#0B3D2E]"
                                                >
                                                    {action}
                                                </button>
                                            ))}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <p className="mt-4 text-sm font-semibold text-[#6B7280]">
                    Acoes planejadas: ver detalhes, copiar link, reenviar, cancelar e arquivar convite.
                </p>
            </div>
        </section>
    )
}
