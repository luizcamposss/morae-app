import { useState } from 'react'
import type { ReactNode } from 'react'
import { StatusBadge } from '../../shared/components/StatusBadge'

const categories = [
    {
        label: 'Avisos',
        value: '12',
        helper: 'Comunicados enviados',
    },
    {
        label: 'Assembleias',
        value: '3',
        helper: 'Agendadas no mes',
    },
    {
        label: 'Mensagens',
        value: '48',
        helper: 'Envios recentes',
    },
]

const activities = [
    {
        title: 'Manutencao da caixa dagua',
        target: 'Todos os predios',
        time: 'Hoje, 09:30',
        badge: 'Aviso',
        variant: 'success' as const,
    },
    {
        title: 'Assembleia ordinaria confirmada',
        target: 'Moradores e proprietarios',
        time: 'Ontem, 17:10',
        badge: 'Assembleia',
        variant: 'warning' as const,
    },
    {
        title: 'Entrega de encomendas na portaria',
        target: 'Predio A',
        time: 'Ontem, 11:45',
        badge: 'Mensagem',
        variant: 'neutral' as const,
    },
]

export function CommunicationPage() {
    const [isCreateOpen, setIsCreateOpen] = useState(false)

    return (
        <>
            <section className="rounded-[2rem] border border-[#E5E7EB] bg-white p-6 shadow-sm">
                <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                        <h1 className="text-3xl font-extrabold tracking-tight text-[#111827]">
                            Comunicacao
                        </h1>
                        <p className="mt-1 text-sm font-semibold text-[#6B7280]">
                            Envie avisos para todos, por predio ou unidade.
                        </p>
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
                        <button
                            type="button"
                            onClick={() => setIsCreateOpen(true)}
                            className="h-11 rounded-2xl bg-[#16A34A] px-5 text-sm font-extrabold text-white shadow-sm shadow-[#16A34A]/30 transition hover:bg-[#0B3D2E]"
                        >
                            + Novo alerta
                        </button>

                        <button className="h-11 rounded-2xl border border-[#E5E7EB] bg-white px-5 text-sm font-bold text-[#6B7280] transition hover:bg-[#DCFCE7] hover:text-[#0B3D2E]">
                            Todos
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    {categories.map((category) => (
                        <div
                            key={category.label}
                            className="rounded-[1.5rem] border border-[#E5E7EB] bg-[#F3F4F6] p-5 shadow-sm transition hover:-translate-y-0.5 hover:bg-[#DCFCE7]"
                        >
                            <p className="text-sm font-bold text-[#6B7280]">
                                {category.label}
                            </p>
                            <strong className="mt-3 block text-3xl font-extrabold text-[#111827]">
                                {category.value}
                            </strong>
                            <p className="mt-2 text-sm font-semibold text-[#16A34A]">
                                {category.helper}
                            </p>
                        </div>
                    ))}
                </div>

                <section className="mt-6 rounded-[1.5rem] border border-[#E5E7EB] bg-[#F3F4F6] p-5">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h2 className="text-lg font-extrabold uppercase tracking-wide text-[#111827]">
                                Atividades recentes
                            </h2>
                            <p className="mt-1 text-sm font-semibold text-[#6B7280]">
                                Comunicados, assembleias e mensagens enviados.
                            </p>
                        </div>

                        <StatusBadge label="Categoria info" variant="neutral" />
                    </div>

                    <div className="mt-5 space-y-3">
                        {activities.map((activity) => (
                            <div
                                key={activity.title}
                                className="flex flex-col gap-3 rounded-2xl bg-white px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
                            >
                                <div>
                                    <p className="text-sm font-extrabold text-[#111827]">
                                        {activity.title}
                                    </p>
                                    <p className="mt-1 text-xs font-semibold text-[#6B7280]">
                                        {activity.target} - {activity.time}
                                    </p>
                                </div>

                                <StatusBadge label={activity.badge} variant={activity.variant} />
                            </div>
                        ))}
                    </div>
                </section>
            </section>

            {isCreateOpen && <CreateNoticeModal onClose={() => setIsCreateOpen(false)} />}
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

function CreateNoticeModal({ onClose }: ModalProps) {
    return (
        <ModalShell title="Novo Aviso" onClose={onClose}>
            <div className="space-y-6">
                <div className="grid grid-cols-1 gap-5 md:grid-cols-[1fr_180px_140px]">
                    <Field label="Titulo" value="Manutencao da caixa dagua" />
                    <Field label="Enviar para" value="Todos os predios" />
                    <Field label="Prioridade" value="Normal" />
                </div>

                <TextArea label="Mensagem" value="Texto do comunicado..." />

                <button className="h-12 w-full rounded-2xl bg-[#16A34A] text-sm font-extrabold text-white shadow-sm shadow-[#16A34A]/30 transition hover:bg-[#0B3D2E]">
                    Enviar
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
                className="min-h-36 w-full resize-none rounded-2xl border border-[#E5E7EB] bg-white px-4 py-3 text-sm font-bold text-[#111827] outline-none"
            />
        </label>
    )
}
