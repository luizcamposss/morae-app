import { StatusBadge } from '../../shared/components/StatusBadge'

const filters = [
    {
        label: 'Todos',
        value: '12',
        helper: 'Comunicados recebidos',
    },
    {
        label: 'Importantes',
        value: '3',
        helper: 'Prioridade alta',
    },
    {
        label: 'Nao lidos',
        value: '2',
        helper: 'Aguardando leitura',
    },
]

const notices = [
    {
        title: 'Manutencao da caixa dagua',
        audience: 'Predio A',
        date: 'Hoje',
        priority: 'Importante',
        message: 'A agua sera desligada das 08h as 12h.',
        variant: 'warning' as const,
    },
    {
        title: 'Limpeza da garagem',
        audience: 'Predio A',
        date: 'Ontem',
        priority: 'Publicado',
        message: 'A limpeza da garagem acontecera na sexta-feira pela manha.',
        variant: 'success' as const,
    },
    {
        title: 'Assembleia geral',
        audience: 'Condominio',
        date: '18/05',
        priority: 'Informativo',
        message: 'A assembleia geral sera realizada no salao principal.',
        variant: 'neutral' as const,
    },
]

export function ResidentNoticesPage() {
    return (
        <section className="rounded-[2rem] border border-[#E5E7EB] bg-white p-6 shadow-sm">
            <div>
                <h1 className="text-3xl font-extrabold tracking-tight text-[#111827]">
                    Avisos
                </h1>
                <p className="mt-1 text-sm font-semibold text-[#6B7280]">
                    Comunicados do condominio e do Predio A.
                </p>
            </div>

            <div className="mx-auto mt-6 grid max-w-3xl grid-cols-1 gap-4 md:grid-cols-3">
                {filters.map((filter) => (
                    <button
                        key={filter.label}
                        type="button"
                        className="rounded-[1.5rem] border border-[#E5E7EB] bg-[#F3F4F6] p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:bg-[#DCFCE7]"
                    >
                        <span className="block text-sm font-bold text-[#6B7280]">
                            {filter.label}
                        </span>
                        <strong className="mt-3 block text-3xl font-extrabold text-[#111827]">
                            {filter.value}
                        </strong>
                        <span className="mt-2 block text-sm font-semibold text-[#16A34A]">
                            {filter.helper}
                        </span>
                    </button>
                ))}
            </div>

            <div className="mt-6 rounded-[1.5rem] border border-[#E5E7EB] bg-[#F3F4F6] p-5">
                <div className="space-y-4">
                    {notices.map((notice) => (
                        <article
                            key={`${notice.title}-${notice.date}`}
                            className="rounded-2xl bg-white p-5 shadow-sm"
                        >
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                <div>
                                    <h2 className="text-lg font-extrabold text-[#111827]">
                                        {notice.title}
                                    </h2>
                                    <p className="mt-1 text-sm font-semibold text-[#6B7280]">
                                        Publico: {notice.audience} | {notice.date}
                                    </p>
                                </div>

                                <StatusBadge label={notice.priority} variant={notice.variant} />
                            </div>

                            <p className="mt-4 text-sm font-semibold leading-6 text-[#111827]">
                                {notice.message}
                            </p>
                        </article>
                    ))}
                </div>
            </div>
        </section>
    )
}
