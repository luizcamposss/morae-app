import { useState } from 'react'
import type { ReactNode } from 'react'
import { MetricCard } from '../../shared/components/MetricCard'
import { StatusBadge } from '../../shared/components/StatusBadge'

const metrics = [
    {
        label: 'Em aberto',
        value: '1',
        helper: 'Aguardando pagamento',
    },
    {
        label: 'Pagos',
        value: '8',
        helper: 'Historico recente',
    },
    {
        label: 'Atrasados',
        value: '1',
        helper: 'Regularize o quanto antes',
    },
]

const bills = [
    {
        reference: 'Junho/2026',
        value: 'R$ 350,00',
        dueDate: '10/05',
        status: 'Pago',
        variant: 'success' as const,
    },
    {
        reference: 'Maio/2026',
        value: 'R$ 350,00',
        dueDate: '10/05',
        status: 'Pendente',
        variant: 'warning' as const,
    },
    {
        reference: 'Abril/2026',
        value: 'R$ 350,00',
        dueDate: '10/05',
        status: 'Atrasado',
        variant: 'danger' as const,
    },
]

export function ResidentBillsPage() {
    const [isReceiptOpen, setIsReceiptOpen] = useState(false)

    return (
        <>
            <section className="rounded-[2rem] border border-[#E5E7EB] bg-white p-6 shadow-sm">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-[#111827]">
                        Meus boletos
                    </h1>
                    <p className="mt-1 text-sm font-semibold text-[#6B7280]">
                        Apto 101 - Predio A
                    </p>
                </div>

                <div className="mx-auto mt-6 grid max-w-3xl grid-cols-1 gap-4 md:grid-cols-3">
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
                    <div className="mb-4 flex flex-col gap-3 md:flex-row md:justify-end">
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
                                    <th className="px-4 py-3 font-extrabold">Referencia</th>
                                    <th className="px-4 py-3 font-extrabold">Valor</th>
                                    <th className="px-4 py-3 font-extrabold">Vencimento</th>
                                    <th className="px-4 py-3 font-extrabold">Status</th>
                                    <th className="px-4 py-3 font-extrabold">Acoes</th>
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-[#E5E7EB]">
                                {bills.map((bill) => (
                                    <tr key={bill.reference} className="transition hover:bg-[#F3F4F6]">
                                        <td className="px-4 py-4 font-extrabold text-[#111827]">
                                            {bill.reference}
                                        </td>
                                        <td className="px-4 py-4 font-semibold text-[#6B7280]">
                                            {bill.value}
                                        </td>
                                        <td className="px-4 py-4 font-semibold text-[#6B7280]">
                                            {bill.dueDate}
                                        </td>
                                        <td className="px-4 py-4">
                                            <StatusBadge label={bill.status} variant={bill.variant} />
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className="flex flex-wrap gap-2">
                                                <button className="rounded-xl border border-[#E5E7EB] bg-white px-3 py-1.5 text-xs font-bold text-[#6B7280] transition hover:bg-[#DCFCE7] hover:text-[#0B3D2E]">
                                                    Ver
                                                </button>
                                                <button
                                                    onClick={() => setIsReceiptOpen(true)}
                                                    className="rounded-xl border border-[#E5E7EB] bg-white px-3 py-1.5 text-xs font-bold text-[#6B7280] transition hover:bg-[#DCFCE7] hover:text-[#0B3D2E]"
                                                >
                                                    Enviar comprovante
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <p className="mt-4 text-sm font-semibold text-[#6B7280]">
                        Acoes planejadas: ver boleto e enviar comprovante de pagamento.
                    </p>
                </div>
            </section>

            {isReceiptOpen && <ReceiptModal onClose={() => setIsReceiptOpen(false)} />}
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

function ReceiptModal({ onClose }: ModalProps) {
    return (
        <ModalShell title="Enviar comprovante" onClose={onClose}>
            <div className="space-y-6">
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                    <Field label="Referencia" value="Maio/2026" />
                    <Field label="Valor" value="R$ 350,00" />
                </div>

                <div className="rounded-2xl border border-dashed border-[#86EFAC] bg-[#DCFCE7] px-5 py-8 text-center">
                    <p className="text-sm font-extrabold text-[#0B3D2E]">
                        Comprovante de pagamento
                    </p>
                    <p className="mt-2 text-sm font-semibold text-[#16A34A]">
                        Area reservada para upload quando conectarmos o fluxo real.
                    </p>
                </div>

                <button className="h-12 w-full rounded-2xl bg-[#16A34A] text-sm font-extrabold text-white shadow-sm shadow-[#16A34A]/30 transition hover:bg-[#0B3D2E]">
                    Enviar comprovante
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
