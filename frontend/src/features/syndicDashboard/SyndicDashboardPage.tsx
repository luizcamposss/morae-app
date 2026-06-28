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
        helper: '38 unidades ocupadas',
    },
    {
        label: 'Manutencoes',
        value: '4',
        helper: '2 abertas',
    },
    {
        label: 'Avisos',
        value: '6',
        helper: 'Publicados no mes',
    },
]

const occupancy = [
    { label: 'Ocupadas', value: 38, total: 40 },
    { label: 'Vagas', value: 2, total: 40 },
    { label: 'Em manutencao', value: 0, total: 40 },
]

const maintenance = [
    { label: 'Abertas', value: 2 },
    { label: 'Em andamento', value: 1 },
    { label: 'Agendadas', value: 1 },
]

const activities = [
    {
        title: 'Morador do Apto 101 confirmou recebimento de aviso.',
        time: 'Ha 12 minutos',
        badge: 'Aviso',
        variant: 'success' as const,
    },
    {
        title: 'Manutencao do elevador entrou em andamento.',
        time: 'Ha 40 minutos',
        badge: 'Manutencao',
        variant: 'warning' as const,
    },
    {
        title: 'Vistoria do Apto 204 foi agendada.',
        time: 'Ha 2 horas',
        badge: 'Vistoria',
        variant: 'neutral' as const,
    },
]

export function SyndicDashboardPage() {
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
                <div className="mb-5">
                    <h2 className="text-xl font-extrabold text-[#111827]">
                        Dashboard Sindico
                    </h2>
                    <p className="mt-1 text-sm font-semibold text-[#6B7280]">
                        Predio A - Condominio Jardim Sul
                    </p>
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
                            Ocupacao do predio A
                        </p>
                        <p className="mt-2 text-sm font-semibold text-[#6B7280]">
                            Visao rapida das unidades sob responsabilidade do sindico.
                        </p>

                        <div className="mt-6 space-y-4">
                            {occupancy.map((item) => {
                                const percentage = Math.round((item.value / item.total) * 100)

                                return (
                                    <div key={item.label}>
                                        <div className="mb-2 flex items-center justify-between text-sm font-bold text-[#111827]">
                                            <span>{item.label}</span>
                                            <span>{item.value}</span>
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
                            Manutencoes abertas
                        </p>
                        <p className="mt-2 text-sm font-semibold text-[#6B7280]">
                            Distribuicao dos chamados do predio.
                        </p>

                        <div className="mt-6 grid grid-cols-3 gap-3">
                            {maintenance.map((item) => (
                                <div key={item.label} className="rounded-2xl bg-white p-4 text-center">
                                    <strong className="block text-2xl font-extrabold text-[#111827]">
                                        {item.value}
                                    </strong>
                                    <span className="mt-1 block text-xs font-bold text-[#6B7280]">
                                        {item.label}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <section className="mt-5 rounded-[1.5rem] border border-[#E5E7EB] bg-white p-6">
                    <h3 className="text-lg font-extrabold uppercase tracking-wide text-[#111827]">
                        Atividades recentes
                    </h3>
                    <p className="mt-1 text-sm font-semibold text-[#6B7280]">
                        Ultimas movimentacoes do predio.
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
