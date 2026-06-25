import { MetricCard } from "../../shared/components/MetricCard"
import { StatusBadge } from "../../shared/components/StatusBadge"

const metrics = [
    {
        label: 'Total de condominios ativos',
        value: '24',
        helper: 'Em operacao',
    },
    {
        label: 'Convites pendentes',
        value: '8',
        helper: 'Aguardando aceite',
    },
    {
        label: 'Receita mensal',
        value: 'R$ 12.400',
        helper: 'Previsao do mes',
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
        <div className="space-y-8">
            <div className="flex items-start justify-between gap-6">
                <div>
                    <p className="text-sm font-medium text-[#6E756F]">
                        Bom dia
                    </p>
                    <h1 className="mt-1 text-3xl font-semibold text-[#1F2421]">
                        Luiz
                    </h1>
                </div>

                <p className="pt-3 text-sm font-medium text-[#6E756F]">
                    Segunda, 18, 11 graus
                </p>
            </div>

            <section className="rounded-[2rem] border border-[#E5E5EA] bg-white p-6 shadow-sm">
                <div className="mb-5">
                    <h2 className="text-xl font-semibold text-[#1F2421]">
                        Dashboard Master
                    </h2>
                    <p className="mt-1 text-sm text-[#6E756F]">
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
                    <div className="min-h-44 rounded-3xl border border-[#E5E5EA] bg-[#F7F6F2] p-6">
                        <p className="text-sm font-semibold text-[#1F2421]">
                            Grafico de condominios
                        </p>
                        <p className="mt-2 text-sm text-[#6E756F]">
                            Aqui entra um resumo visual de ativos, pendentes e inativos.
                        </p>

                        <div className="mt-8 flex items-end gap-3">
                            <div className="h-16 flex-1 rounded-t-2xl bg-[#178A63]" />
                            <div className="h-24 flex-1 rounded-t-2xl bg-[#0F5A43]" />
                            <div className="h-12 flex-1 rounded-t-2xl bg-[#D9C9A3]" />
                            <div className="h-20 flex-1 rounded-t-2xl bg-[#178A63]" />
                        </div>
                    </div>

                    <div className="min-h-44 rounded-3xl border border-[#E5E5EA] bg-[#F7F6F2] p-6">
                        <p className="text-sm font-semibold text-[#1F2421]">
                            Grafico de receita
                        </p>
                        <p className="mt-2 text-sm text-[#6E756F]">
                            Receita prevista, recebida e atrasada no mes atual.
                        </p>

                        <div className="mt-8 h-20 rounded-3xl bg-white p-3">
                            <div className="h-full rounded-2xl bg-gradient-to-r from-[#178A63] via-[#0F5A43] to-[#D9C9A3]" />
                        </div>
                    </div>
                </div>

                <section className="mt-5 rounded-3xl border border-[#E5E5EA] bg-white p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-lg font-semibold text-[#1F2421]">
                                Atividades recentes
                            </h3>
                            <p className="mt-1 text-sm text-[#6E756F]">
                                Ultimas acoes importantes da plataforma.
                            </p>
                        </div>
                    </div>

                    <div className="mt-6 space-y-3">
                        {activities.map((activity) => (
                            <div
                                key={activity.title}
                                className="flex items-center justify-between rounded-2xl bg-[#F7F6F2] px-4 py-3"
                            >
                                <div>
                                    <p className="text-sm font-medium text-[#1F2421]">
                                        {activity.title}
                                    </p>
                                    <p className="mt-1 text-xs text-[#6E756F]">
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
