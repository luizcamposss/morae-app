import { MetricCard } from "../../shared/components/MetricCard"
import { StatusBadge } from "../../shared/components/StatusBadge"

const metrics = [
    {
        label: 'Total de condominios ativos',
        value: '24',
        helper: '+3 neste mes',
    },
    {
        label: 'Convites pendentes',
        value: '8',
        helper: 'Aguardando aceite',
    },
    {
        label: 'Receita mensal',
        value: 'R$ 12.400',
        helper: '+18% vs mes anterior',
    },
    {
        label: 'Pagamentos atrasados',
        value: '3',
        helper: 'Precisam de atencao',
    },
]

const activities = [
    {
        title: 'Condominio Jardim Sul foi cadastrado.',
        time: 'Ha 12 minutos',
        badge: 'Novo',
        variant: 'success' as const,
    },
    {
        title: 'Pagamento manual registrado para Solar Norte.',
        time: 'Ha 35 minutos',
        badge: 'Pago',
        variant: 'success' as const,
    },
    {
        title: 'Convite de administrador aguardando aceite.',
        time: 'Ha 1 hora',
        badge: 'Pendente',
        variant: 'warning' as const,
    },
]

export function MasterDashboardPage() {
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
                        Dashboard Master
                    </h2>
                    <p className="mt-1 text-sm font-semibold text-[#6B7280]">
                        Visao geral do sistema
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
                            Grafico de condominios
                        </p>
                        <p className="mt-2 text-sm font-semibold text-[#6B7280]">
                            Aqui entra um resumo visual de ativos, pendentes e inativos.
                        </p>

                        <div className="mt-8 flex items-end gap-3">
                            <div className="h-16 flex-1 rounded-t-2xl bg-[#86EFAC]" />
                            <div className="h-24 flex-1 rounded-t-2xl bg-[#16A34A]" />
                            <div className="h-12 flex-1 rounded-t-2xl bg-[#DCFCE7]" />
                            <div className="h-20 flex-1 rounded-t-2xl bg-[#22C55E]" />
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
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-lg font-extrabold uppercase tracking-wide text-[#111827]">
                                Atividades recentes
                            </h3>
                            <p className="mt-1 text-sm font-semibold text-[#6B7280]">
                                Ultimas acoes importantes da plataforma.
                            </p>
                        </div>
                    </div>

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
