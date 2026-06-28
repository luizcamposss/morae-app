import { useState } from 'react'
import type { ReactNode } from 'react'
import { MetricCard } from '../../shared/components/MetricCard'
import { StatusBadge } from '../../shared/components/StatusBadge'

type ModalType = 'register' | 'history' | 'block' | null

const metrics = [
    {
        label: 'Receita prevista',
        value: 'R$ 18.400',
        helper: 'Mensalidade total',
    },
    {
        label: 'Recebido',
        value: 'R$ 12.000',
        helper: 'Confirmado no mes',
    },
    {
        label: 'Em aberto',
        value: 'R$ 4.200',
        helper: 'Aguardando pagamento',
    },
    {
        label: 'Atrasados',
        value: 'R$ 2.200',
        helper: 'Exige acompanhamento',
    },
]

const payments = [
    {
        condominium: 'Jardim Sul',
        monthlyFee: 'R$ 400,00',
        dueDate: 'Dia 15',
        lastPayment: '10/05/2026',
        status: 'Pago',
        variant: 'success' as const,
    },
    {
        condominium: 'Solar Norte',
        monthlyFee: 'R$ 350,00',
        dueDate: 'Dia 10',
        lastPayment: '-',
        status: 'Pendente',
        variant: 'warning' as const,
    },
    {
        condominium: 'Central',
        monthlyFee: 'R$ 200,00',
        dueDate: 'Dia 08',
        lastPayment: '05/05/2026',
        status: 'Atrasado',
        variant: 'danger' as const,
    },
]

const history = [
    {
        reference: 'Maio/2026',
        value: 'R$ 400,00',
        paidAt: '10/05/2026',
        status: 'Pago',
    },
    {
        reference: 'Abril/2026',
        value: 'R$ 400,00',
        paidAt: '09/03/2026',
        status: 'Pago',
    },
    {
        reference: 'Marco/2026',
        value: 'R$ 400,00',
        paidAt: '12/03/2026',
        status: 'Pago',
    },
]

export function PlatformPaymentsPage() {
    const [modal, setModal] = useState<ModalType>(null)

    return (
        <>
            <section className="rounded-[2rem] border border-[#E5E7EB] bg-white p-6 shadow-sm">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-[#111827]">
                        Pagamentos
                    </h1>
                    <p className="mt-1 text-sm font-semibold text-[#6B7280]">
                        Gerenciador de pagamentos da plataforma.
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
                    <div className="mb-4 flex flex-col gap-3 md:flex-row">
                        <input
                            type="search"
                            placeholder="Buscar condominio..."
                            className="h-11 flex-1 rounded-2xl border border-[#E5E7EB] bg-white px-4 text-sm font-semibold text-[#111827] outline-none transition placeholder:text-[#9CA3AF] focus:border-[#22C55E] focus:ring-4 focus:ring-[#86EFAC]/30"
                        />

                        <button
                            type="button"
                            className="h-11 rounded-2xl border border-[#E5E7EB] bg-white px-5 text-sm font-bold text-[#6B7280] transition hover:bg-[#DCFCE7] hover:text-[#0B3D2E]"
                        >
                            Maio/2026
                        </button>
                    </div>

                    <div className="overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white">
                        <table className="w-full border-collapse text-left text-sm">
                            <thead className="bg-[#DCFCE7] text-xs uppercase tracking-wide text-[#0B3D2E]">
                                <tr>
                                    <th className="px-4 py-3 font-extrabold">Condominio</th>
                                    <th className="px-4 py-3 font-extrabold">Mensalidade</th>
                                    <th className="px-4 py-3 font-extrabold">Vencimento</th>
                                    <th className="px-4 py-3 font-extrabold">Ultimo pagamento</th>
                                    <th className="px-4 py-3 font-extrabold">Status</th>
                                    <th className="px-4 py-3 font-extrabold">Acoes</th>
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-[#E5E7EB]">
                                {payments.map((payment) => (
                                    <tr key={payment.condominium} className="transition hover:bg-[#F3F4F6]">
                                        <td className="px-4 py-4 font-extrabold text-[#111827]">
                                            {payment.condominium}
                                        </td>
                                        <td className="px-4 py-4 font-semibold text-[#6B7280]">
                                            {payment.monthlyFee}
                                        </td>
                                        <td className="px-4 py-4 font-semibold text-[#6B7280]">
                                            {payment.dueDate}
                                        </td>
                                        <td className="px-4 py-4 font-semibold text-[#6B7280]">
                                            {payment.lastPayment}
                                        </td>
                                        <td className="px-4 py-4">
                                            <StatusBadge label={payment.status} variant={payment.variant} />
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className="flex flex-wrap gap-2">
                                                <button
                                                    onClick={() => setModal('register')}
                                                    className="rounded-xl border border-[#E5E7EB] bg-white px-3 py-1.5 text-xs font-bold text-[#6B7280] transition hover:bg-[#DCFCE7] hover:text-[#0B3D2E]"
                                                >
                                                    Registrar
                                                </button>
                                                <button
                                                    onClick={() => setModal('history')}
                                                    className="rounded-xl border border-[#E5E7EB] bg-white px-3 py-1.5 text-xs font-bold text-[#6B7280] transition hover:bg-[#DCFCE7] hover:text-[#0B3D2E]"
                                                >
                                                    Historico
                                                </button>
                                                <button
                                                    onClick={() => setModal('block')}
                                                    className="rounded-xl border border-[#E5E7EB] bg-white px-3 py-1.5 text-xs font-bold text-[#B42318] transition hover:bg-[#FDECEC]"
                                                >
                                                    Bloquear
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <p className="mt-4 text-sm font-semibold text-[#6B7280]">
                        Acoes planejadas: registrar pagamento manual, abrir historico e bloquear condominio em atraso.
                    </p>
                </div>
            </section>

            {modal === 'register' && <RegisterPaymentModal onClose={() => setModal(null)} />}
            {modal === 'history' && <PaymentHistoryModal onClose={() => setModal(null)} />}
            {modal === 'block' && <BlockCondominiumModal onClose={() => setModal(null)} />}
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

function RegisterPaymentModal({ onClose }: ModalProps) {
    return (
        <ModalShell title="Registrar pagamento" onClose={onClose}>
            <div className="space-y-6">
                <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
                    <Field label="Condominio" value="Central" />
                    <Field label="Referencia" value="Maio/2026" />
                    <Field label="Data do Pagamento" value="18/05/2026" />
                    <Field label="Valor Pago" value="R$ 200,00" />
                    <Field label="Forma de pagamento" value="Pix" />
                </div>

                <TextArea
                    label="Observacoes"
                    value="Pago pelo responsavel financeiro..."
                />

                <button className="h-12 w-full rounded-2xl bg-[#16A34A] text-sm font-extrabold text-white shadow-sm shadow-[#16A34A]/30 transition hover:bg-[#0B3D2E]">
                    Confirmar pagamento
                </button>
            </div>
        </ModalShell>
    )
}

function PaymentHistoryModal({ onClose }: ModalProps) {
    return (
        <ModalShell title="Historico de Pagamentos" onClose={onClose}>
            <div className="space-y-6">
                <div className="rounded-2xl border border-[#E5E7EB] bg-[#F3F4F6] p-5">
                    <p className="text-sm font-extrabold text-[#111827]">
                        Condominio: Jardim Sul
                    </p>
                    <p className="mt-1 text-sm font-bold text-[#6B7280]">
                        Mensalidade atual: R$ 400,00
                    </p>
                    <p className="mt-1 text-sm font-bold text-[#6B7280]">
                        Vencimento: todo dia 10
                    </p>
                </div>

                <div className="overflow-hidden rounded-2xl border border-[#E5E7EB]">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-[#DCFCE7] text-xs uppercase tracking-wide text-[#0B3D2E]">
                            <tr>
                                <th className="px-4 py-3 font-extrabold">Referencia</th>
                                <th className="px-4 py-3 font-extrabold">Valor</th>
                                <th className="px-4 py-3 font-extrabold">Data pagamento</th>
                                <th className="px-4 py-3 font-extrabold">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E5E7EB]">
                            {history.map((item) => (
                                <tr key={item.reference}>
                                    <td className="px-4 py-3 font-bold text-[#111827]">{item.reference}</td>
                                    <td className="px-4 py-3 font-semibold text-[#6B7280]">{item.value}</td>
                                    <td className="px-4 py-3 font-semibold text-[#6B7280]">{item.paidAt}</td>
                                    <td className="px-4 py-3">
                                        <StatusBadge label={item.status} variant="success" />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </ModalShell>
    )
}

function BlockCondominiumModal({ onClose }: ModalProps) {
    return (
        <ModalShell title="Bloquear Condominio" onClose={onClose}>
            <div className="space-y-6">
                <div className="grid grid-cols-1 gap-5 md:grid-cols-[180px_1fr]">
                    <Field label="Condominio" value="Central" />
                    <Field label="Pagamento" value="Maio/2026 - R$ 400,00 - Atrasado" />
                </div>

                <Field label="Motivo" value="Pagamento em atraso" />

                <TextArea
                    label="Mensagem interna"
                    value="Cliente avisado pelo WhatsApp em 18/05"
                />

                <button className="h-12 w-full rounded-2xl bg-[#B42318] text-sm font-extrabold text-white shadow-sm shadow-[#B42318]/20 transition hover:bg-[#8F1D14]">
                    Confirmar bloqueio
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
