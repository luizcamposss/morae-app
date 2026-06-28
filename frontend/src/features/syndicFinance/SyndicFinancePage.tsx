import { useState } from 'react'
import type { ReactNode } from 'react'
import { MetricCard } from '../../shared/components/MetricCard'
import { StatusBadge } from '../../shared/components/StatusBadge'

const metrics = [
    {
        label: 'Pagos',
        value: '31',
        helper: 'Unidades em dia',
    },
    {
        label: 'Pendentes',
        value: '6',
        helper: 'Aguardando pagamento',
    },
    {
        label: 'Atrasados',
        value: '3',
        helper: 'Exigem acompanhamento',
    },
    {
        label: 'Em aberto',
        value: '9',
        helper: 'Total nao baixado',
    },
]

const payments = [
    {
        unit: 'Apto 101',
        resident: 'Maria Souza',
        value: 'R$ 350,00',
        dueDate: '10/05',
        status: 'Pago',
        variant: 'success' as const,
    },
    {
        unit: 'Apto 102',
        resident: 'Joao Lima',
        value: 'R$ 350,00',
        dueDate: '10/05',
        status: 'Pendente',
        variant: 'warning' as const,
    },
    {
        unit: 'Apto 204',
        resident: 'Carlos Dias',
        value: 'R$ 350,00',
        dueDate: '10/05',
        status: 'Atrasado',
        variant: 'danger' as const,
    },
]

export function SyndicFinancePage() {
    const [isReminderOpen, setIsReminderOpen] = useState(false)

    return (
        <>
            <section className="rounded-[2rem] border border-[#E5E7EB] bg-white p-6 shadow-sm">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-[#111827]">
                        Pagamentos - predio A
                    </h1>
                    <p className="mt-1 text-sm font-semibold text-[#6B7280]">
                        Consulta financeira do predio.
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
                    <div className="mb-4 flex flex-col gap-3 xl:flex-row">
                        <input
                            type="search"
                            placeholder="Buscar unidade..."
                            className="h-11 flex-1 rounded-2xl border border-[#E5E7EB] bg-white px-4 text-sm font-semibold text-[#111827] outline-none transition placeholder:text-[#9CA3AF] focus:border-[#22C55E] focus:ring-4 focus:ring-[#86EFAC]/30"
                        />

                        <button
                            type="button"
                            className="h-11 rounded-2xl border border-[#E5E7EB] bg-white px-5 text-sm font-bold text-[#6B7280] transition hover:bg-[#DCFCE7] hover:text-[#0B3D2E]"
                        >
                            Maio/2026
                        </button>

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
                                    <th className="px-4 py-3 font-extrabold">Unidade</th>
                                    <th className="px-4 py-3 font-extrabold">Morador</th>
                                    <th className="px-4 py-3 font-extrabold">Valor</th>
                                    <th className="px-4 py-3 font-extrabold">Vencimento</th>
                                    <th className="px-4 py-3 font-extrabold">Status</th>
                                    <th className="px-4 py-3 font-extrabold">Acoes</th>
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-[#E5E7EB]">
                                {payments.map((payment) => (
                                    <tr key={`${payment.unit}-${payment.resident}`} className="transition hover:bg-[#F3F4F6]">
                                        <td className="px-4 py-4 font-extrabold text-[#111827]">
                                            {payment.unit}
                                        </td>
                                        <td className="px-4 py-4 font-semibold text-[#6B7280]">
                                            {payment.resident}
                                        </td>
                                        <td className="px-4 py-4 font-semibold text-[#6B7280]">
                                            {payment.value}
                                        </td>
                                        <td className="px-4 py-4 font-semibold text-[#6B7280]">
                                            {payment.dueDate}
                                        </td>
                                        <td className="px-4 py-4">
                                            <StatusBadge label={payment.status} variant={payment.variant} />
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className="flex flex-wrap gap-2">
                                                <button className="rounded-xl border border-[#E5E7EB] bg-white px-3 py-1.5 text-xs font-bold text-[#6B7280] transition hover:bg-[#DCFCE7] hover:text-[#0B3D2E]">
                                                    Ver
                                                </button>
                                                <button
                                                    onClick={() => setIsReminderOpen(true)}
                                                    className="rounded-xl border border-[#E5E7EB] bg-white px-3 py-1.5 text-xs font-bold text-[#6B7280] transition hover:bg-[#DCFCE7] hover:text-[#0B3D2E]"
                                                >
                                                    Enviar lembrete
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <p className="mt-4 text-sm font-semibold text-[#6B7280]">
                        Acoes planejadas: ver detalhes e enviar lembrete quando permitido.
                    </p>
                </div>
            </section>

            {isReminderOpen && <ReminderModal onClose={() => setIsReminderOpen(false)} />}
        </>
    )
}

type ModalProps = {
    onClose: () => void
}

function ModalShell({ title, children, onClose }: ModalProps & { title: string; children: ReactNode }) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0B3D2E]/30 px-6 py-8 backdrop-blur-sm">
            <div className="w-full max-w-3xl overflow-hidden rounded-[2rem] border border-[#E5E7EB] bg-white shadow-2xl shadow-[#0B3D2E]/20">
                <div className="flex items-center justify-between border-b border-[#E5E7EB] px-6 py-5">
                    <h2 className="text-2xl font-extrabold text-[#111827]">
                        {title}
                    </h2>

                    <button
                        type="button"
                        onClick={onClose}
                        className="flex size-10 items-center justify-center rounded-full bg-[#F3F4F6] text-xl font-light text-[#6B7280] transition hover:bg-[#FDECEC] hover:text-[#B42318]"
                    >
                        x
                    </button>
                </div>

                <div className="px-8 py-7">
                    {children}
                </div>
            </div>
        </div>
    )
}

function ReminderModal({ onClose }: ModalProps) {
    return (
        <ModalShell title="Enviar lembrete" onClose={onClose}>
            <div className="space-y-6">
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                    <Field label="Morador" value="Carlos Dias" />
                    <Field label="Cobranca" value="Maio/2026 - R$ 350,00" />
                </div>

                <TextArea label="Mensagem" value="Lembrete de pagamento pendente da mensalidade do condominio." />

                <button className="h-12 w-full rounded-2xl bg-[#16A34A] text-sm font-extrabold text-white shadow-sm shadow-[#16A34A]/30 transition hover:bg-[#0B3D2E]">
                    Enviar lembrete
                </button>
            </div>
        </ModalShell>
    )
}

type FieldProps = {
    label: string
    value: string
}

function Field({ label, value }: FieldProps) {
    return (
        <label className="block">
            <span className="mb-2 block text-sm font-extrabold text-[#111827]">
                {label}
            </span>
            <input
                value={value}
                readOnly
                className="h-11 w-full rounded-2xl border border-[#E5E7EB] bg-white px-4 text-sm font-bold text-[#111827] outline-none"
            />
        </label>
    )
}

function TextArea({ label, value }: FieldProps) {
    return (
        <label className="block">
            <span className="mb-2 block text-sm font-extrabold text-[#111827]">
                {label}
            </span>
            <textarea
                value={value}
                readOnly
                className="min-h-28 w-full resize-none rounded-2xl border border-[#E5E7EB] bg-white px-4 py-3 text-sm font-bold text-[#111827] outline-none"
            />
        </label>
    )
}
