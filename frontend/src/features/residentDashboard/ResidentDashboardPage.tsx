import { MetricCard } from '../../shared/components/MetricCard'
import { StatusBadge } from '../../shared/components/StatusBadge'

const metrics = [
    {
        label: 'Boleto atual',
        value: 'Pendente',
        helper: 'Vence em 10/05',
    },
    {
        label: 'Avisos',
        value: '6',
        helper: '2 novos',
    },
    {
        label: 'Solicitacoes',
        value: '3',
        helper: '1 em andamento',
    },
    {
        label: 'Status da unidade',
        value: 'Ativa',
        helper: 'Apto 101',
    },
]

const activities = [
    {
        title: 'Novo aviso publicado para o Predio A.',
        time: 'Ha 20 minutos',
        badge: 'Aviso',
        variant: 'success' as const,
    },
    {
        title: 'Boleto de Maio/2026 aguardando pagamento.',
        time: 'Ha 2 horas',
        badge: 'Pendente',
        variant: 'warning' as const,
    },
    {
        title: 'Solicitacao de manutencao recebeu atualizacao.',
        time: 'Ontem',
        badge: 'Manutencao',
        variant: 'neutral' as const,
    },
]

export function ResidentDashboardPage() {
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
                        Dashboard Morador
                    </h2>
                    <p className="mt-1 text-sm font-semibold text-[#6B7280]">
                        Predio A - Apto 101
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
                            Proximo pagamento
                        </p>
                        <p className="mt-2 text-sm font-semibold text-[#6B7280]">
                            Taxa condominial referente ao mes atual.
                        </p>

                        <div className="mt-6 rounded-2xl bg-white p-5">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-bold text-[#6B7280]">
                                    Maio/2026
                                </span>
                                <StatusBadge label="Pendente" variant="warning" />
                            </div>
                            <strong className="mt-4 block text-3xl font-extrabold text-[#111827]">
                                R$ 350,00
                            </strong>
                            <p className="mt-2 text-sm font-semibold text-[#16A34A]">
                                Vencimento em 10/05
                            </p>
                        </div>
                    </div>

                    <div className="min-h-48 rounded-[1.5rem] border border-[#E5E7EB] bg-[#F3F4F6] p-6">
                        <p className="text-sm font-extrabold text-[#111827]">
                            Avisos recentes
                        </p>
                        <p className="mt-2 text-sm font-semibold text-[#6B7280]">
                            Comunicados importantes para sua unidade e predio.
                        </p>

                        <div className="mt-6 space-y-3">
                            <div className="rounded-2xl bg-white p-4">
                                <p className="text-sm font-bold text-[#111827]">
                                    Elevador em revisao
                                </p>
                                <p className="mt-1 text-xs font-semibold text-[#6B7280]">
                                    Predio A - Hoje
                                </p>
                            </div>
                            <div className="rounded-2xl bg-white p-4">
                                <p className="text-sm font-bold text-[#111827]">
                                    Limpeza da garagem
                                </p>
                                <p className="mt-1 text-xs font-semibold text-[#6B7280]">
                                    Predio A - Ontem
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <section className="mt-5 rounded-[1.5rem] border border-[#E5E7EB] bg-white p-6">
                    <h3 className="text-lg font-extrabold uppercase tracking-wide text-[#111827]">
                        Atividades recentes
                    </h3>
                    <p className="mt-1 text-sm font-semibold text-[#6B7280]">
                        Ultimas movimentacoes da sua unidade.
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
