import { useState } from 'react'
import type { ReactNode } from 'react'
import { MetricCard } from '../../shared/components/MetricCard'
import { StatusBadge } from '../../shared/components/StatusBadge'

type ModalType = 'manual' | 'reminder' | 'receipt' | null

const metrics = [
    {
        label: 'Receita prevista',
        value: 'R$ 42.800',
        helper: 'Cobrancas do mes',
    },
    {
        label: 'Recebido',
        value: 'R$ 36.050',
        helper: 'Pagamentos confirmados',
    },
    {
        label: 'Em aberto',
        value: 'R$ 4.550',
        helper: 'Aguardando baixa',
    },
    {
        label: 'Atrasados',
        value: 'R$ 2.200',
        helper: 'Exige acompanhamento',
    },
]

const payments = [
    {
        building: 'Predio A',
        unit: 'Apto 101',
        resident: 'Maria Souza',
        value: 'R$ 350,00',
        status: 'Pago',
        variant: 'success' as const,
    },
    {
        building: 'Predio B',
        unit: 'Apto 102',
        resident: 'Joao Lima',
        value: 'R$ 350,00',
        status: 'Pendente',
        variant: 'warning' as const,
    },
    {
        building: 'Predio C',
        unit: 'Apto 204',
        resident: 'Carlos Dias',
        value: 'R$ 350,00',
        status: 'Atrasado',
        variant: 'danger' as const,
    },
]

export function AdminPaymentsPage() {
    const [modal, setModal] = useState<ModalType>(null)

    return (
        <>
            <section className="rounded-[2rem] border border-[#E5E7EB] bg-white p-6 shadow-sm">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-[#111827]">
                        Pagamentos
                    </h1>
                    <p className="mt-1 text-sm font-semibold text-[#6B7280]">
                        Gerenciador de pagamentos do condominio.
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
                            placeholder="Buscar unidade/morador..."
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
                                    <th className="px-4 py-3 font-extrabold">Predio</th>
                                    <th className="px-4 py-3 font-extrabold">Unidade</th>
                                    <th className="px-4 py-3 font-extrabold">Morador</th>
                                    <th className="px-4 py-3 font-extrabold">Valor</th>
                                    <th className="px-4 py-3 font-extrabold">Status</th>
                                    <th className="px-4 py-3 font-extrabold">Acoes</th>
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-[#E5E7EB]">
                                {payments.map((payment) => (
                                    <tr key={`${payment.building}-${payment.unit}`} className="transition hover:bg-[#F3F4F6]">
                                        <td className="px-4 py-4 font-semibold text-[#6B7280]">
                                            {payment.building}
                                        </td>
                                        <td className="px-4 py-4 font-extrabold text-[#111827]">
                                            {payment.unit}
                                        </td>
                                        <td className="px-4 py-4 font-semibold text-[#6B7280]">
                                            {payment.resident}
                                        </td>
                                        <td className="px-4 py-4 font-semibold text-[#6B7280]">
                                            {payment.value}
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
                                                    onClick={() => setModal('manual')}
                                                    className="rounded-xl border border-[#E5E7EB] bg-white px-3 py-1.5 text-xs font-bold text-[#6B7280] transition hover:bg-[#DCFCE7] hover:text-[#0B3D2E]"
                                                >
                                                    Marcar pago
                                                </button>
                                                <button
                                                    onClick={() => setModal('reminder')}
                                                    className="rounded-xl border border-[#E5E7EB] bg-white px-3 py-1.5 text-xs font-bold text-[#6B7280] transition hover:bg-[#DCFCE7] hover:text-[#0B3D2E]"
                                                >
                                                    Enviar lembrete
                                                </button>
                                                <button
                                                    onClick={() => setModal('receipt')}
                                                    className="rounded-xl border border-[#E5E7EB] bg-white px-3 py-1.5 text-xs font-bold text-[#6B7280] transition hover:bg-[#DCFCE7] hover:text-[#0B3D2E]"
                                                >
                                                    Anexar comprovante
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <p className="mt-4 text-sm font-semibold text-[#6B7280]">
                        Acoes planejadas: ver detalhes, marcar pagamento manual, enviar lembrete e anexar comprovante.
                    </p>
                </div>
            </section>

            {modal === 'manual' && <ManualPaymentModal onClose={() => setModal(null)} />}
            {modal === 'reminder' && <ReminderModal onClose={() => setModal(null)} />}
            {modal === 'receipt' && <ReceiptModal onClose={() => setModal(null)} />}
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

function ManualPaymentModal({ onClose }: ModalProps) {
    return (
        <ModalShell title="Registrar pagamento manual" onClose={onClose}>
            <div className="space-y-6">
                <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
                    <Field label="Unidade" value="Apto 204" />
                    <Field label="Referencia" value="Maio/2026" />
                    <Field label="Data do pagamento" value="18/05/2026" />
                    <Field label="Valor pago" value="R$ 350,00" />
                    <Field label="Forma de pagamento" value="Pix" />
                </div>

                <TextArea label="Observacoes" value="Pagamento confirmado pelo responsavel financeiro." />

                <button className="h-12 w-full rounded-2xl bg-[#16A34A] text-sm font-extrabold text-white shadow-sm shadow-[#16A34A]/30 transition hover:bg-[#0B3D2E]">
                    Confirmar pagamento
                </button>
            </div>
        </ModalShell>
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

function ReceiptModal({ onClose }: ModalProps) {
    return (
        <ModalShell title="Anexar comprovante" onClose={onClose}>
            <div className="space-y-6">
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                    <Field label="Unidade" value="Apto 101" />
                    <Field label="Referencia" value="Maio/2026" />
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
                    Salvar comprovante
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
