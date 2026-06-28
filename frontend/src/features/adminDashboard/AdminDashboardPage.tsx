import { MetricCard } from '../../shared/components/MetricCard'
import { StatusBadge } from '../../shared/components/StatusBadge'

const metrics = [
    {
        label: 'Total de predios',
        value: '3',
        helper: 'Blocos cadastrados',
    },
    {
        label: 'Unidades',
        value: '120',
        helper: '105 ocupadas',
    },
    {
        label: 'Receita mensal',
        value: 'R$ 42.800',
        helper: '+6% vs mes anterior',
    },
    {
        label: 'Pagamentos atrasados',
        value: '9',
        helper: 'Precisam de atencao',
    },
]

const occupancy = [
    { building: 'Predio A', occupied: 38, total: 40 },
    { building: 'Predio B', occupied: 35, total: 40 },
    { building: 'Predio C', occupied: 32, total: 40 },
]

const activities = [
    {
        title: 'Unidade 204 vinculada a novo morador.',
        time: 'Ha 18 minutos',
        badge: 'Pessoa',
        variant: 'success' as const,
    },
    {
        title: 'Pagamento da unidade 301 esta atrasado.',
        time: 'Ha 42 minutos',
        badge: 'Atraso',
        variant: 'danger' as const,
    },
    {
        title: 'Comunicado enviado para todos os predios.',
        time: 'Ha 2 horas',
        badge: 'Comunicado',
        variant: 'neutral' as const,
    },
]

export function AdminDashboardPage() {
    return (
        <div className="space-y-7">
            <div className="flex items-start justify-between gap-6">
                <div>
                    <p className="text-sm font-bold text-[#6B7280]">
                        Bom dia
                    </p>
                    <h1 className="mt-1 text-4xl font-extrabold tracking-tight text-[#111827]">
                        User
                    </h1>
                </div>

                <p className="pt-3 text-sm font-bold text-[#6B7280]">
                    Segunda, 18, 11 graus
                </p>
            </div>

            <section className="rounded-[2rem] border border-[#E5E7EB] bg-white p-6 shadow-sm">
                <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                        <h2 className="text-xl font-extrabold text-[#111827]">
                            Dashboard admin
                        </h2>
                        <p className="mt-1 text-sm font-semibold text-[#6B7280]">
                            Visao geral do condominio
                        </p>
                    </div>

                    <button className="h-11 rounded-2xl border border-[#E5E7EB] bg-white px-5 text-sm font-bold text-[#6B7280] transition hover:bg-[#DCFCE7] hover:text-[#0B3D2E]">
                        Todos os predios
                    </button>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                    {metrics.map((metric) => (
                        <MetricCard
                            key={metric.label}
                            label={metric.label}
                            value={metric.value}
                            helper={metric.helper}
                        />
                    ))}
                </div>

                <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-2">
                    <div className="min-h-48 rounded-[1.5rem] border border-[#E5E7EB] bg-[#F3F4F6] p-6">
                        <p className="text-sm font-extrabold text-[#111827]">
                            Ocupacao por predio
                        </p>
                        <p className="mt-2 text-sm font-semibold text-[#6B7280]">
                            Unidades ocupadas em relacao ao total disponivel.
                        </p>

                        <div className="mt-6 space-y-4">
                            {occupancy.map((item) => {
                                const percentage = Math.round((item.occupied / item.total) * 100)

                                return (
                                    <div key={item.building}>
                                        <div className="mb-2 flex items-center justify-between text-sm font-bold text-[#111827]">
                                            <span>{item.building}</span>
                                            <span>{item.occupied}/{item.total}</span>
                                        </div>
                                        <div className="h-3 overflow-hidden rounded-full bg-white">
                                            <div
                                                className="h-full rounded-full bg-[#16A34A]"
                                                style={{ width: `${percentage}%` }}
                                            />
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    <div className="min-h-48 rounded-[1.5rem] border border-[#E5E7EB] bg-[#F3F4F6] p-6">
                        <p className="text-sm font-extrabold text-[#111827]">
                            Grafico de receita
                        </p>
                        <p className="mt-2 text-sm font-semibold text-[#6B7280]">
                            Receita prevista, recebida e atrasada no mes atual.
                        </p>

                        <div className="mt-8 h-20 rounded-3xl bg-white p-3">
                            <div className="h-full rounded-2xl bg-gradient-to-r from-[#0B3D2E] via-[#16A34A] to-[#86EFAC]" />
                        </div>
                    </div>
                </div>

                <section className="mt-5 rounded-[1.5rem] border border-[#E5E7EB] bg-white p-6">
                    <h3 className="text-lg font-extrabold uppercase tracking-wide text-[#111827]">
                        Atividades recentes
                    </h3>
                    <p className="mt-1 text-sm font-semibold text-[#6B7280]">
                        Ultimas movimentacoes do condominio.
                    </p>

                    <div className="mt-6 space-y-3">
                        {activities.map((activity) => (
                            <div
                                key={activity.title}
                                className="flex items-center justify-between rounded-2xl bg-[#F3F4F6] px-4 py-3"
                            >
                                <div>
                                    <p className="text-sm font-bold text-[#111827]">
                                        {activity.title}
                                    </p>
                                    <p className="mt-1 text-xs font-semibold text-[#6B7280]">
                                        {activity.time}
                                    </p>
                                </div>

                                <StatusBadge label={activity.badge} variant={activity.variant} />
                            </div>
                        ))}
                    </div>
                </section>
            </section>
        </div>
    )
}
