import { useState } from 'react'
import type { ReactNode } from 'react'
import { MetricCard } from '../../shared/components/MetricCard'
import { StatusBadge } from '../../shared/components/StatusBadge'

const metrics = [
    {
        label: 'Agendadas',
        value: '8',
        helper: 'Proximas vistorias',
    },
    {
        label: 'Em andamento',
        value: '3',
        helper: 'Checklists abertos',
    },
    {
        label: 'Concluidas',
        value: '21',
        helper: 'No mes atual',
    },
    {
        label: 'Pendentes',
        value: '5',
        helper: 'Aguardando revisao',
    },
]

const inspections = [
    {
        location: 'Apto 101',
        type: 'Entrada',
        responsible: 'Joao Silva',
        date: '20/05/2026',
        status: 'Em andamento',
        variant: 'warning' as const,
    },
    {
        location: 'Predio B',
        type: 'Comum',
        responsible: 'Ana Souza',
        date: '21/05/2026',
        status: 'Aberta',
        variant: 'danger' as const,
    },
    {
        location: 'Apto 204',
        type: 'Saida',
        responsible: 'Carlos Dias',
        date: '18/05/2026',
        status: 'Agendada',
        variant: 'neutral' as const,
    },
]

export function InspectionsPage() {
    const [isCreateOpen, setIsCreateOpen] = useState(false)

    return (
        <>
            <section className="rounded-[2rem] border border-[#E5E7EB] bg-white p-6 shadow-sm">
                <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                        <h1 className="text-3xl font-extrabold tracking-tight text-[#111827]">
                            Vistorias
                        </h1>
                        <p className="mt-1 text-sm font-semibold text-[#6B7280]">
                            Controle inspecoes, checklists, fotos e relatorios.
                        </p>
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
                        <button
                            type="button"
                            onClick={() => setIsCreateOpen(true)}
                            className="h-11 rounded-2xl bg-[#16A34A] px-5 text-sm font-extrabold text-white shadow-sm shadow-[#16A34A]/30 transition hover:bg-[#0B3D2E]"
                        >
                            + Nova Vistoria
                        </button>

                        <button className="h-11 rounded-2xl border border-[#E5E7EB] bg-white px-5 text-sm font-bold text-[#6B7280] transition hover:bg-[#DCFCE7] hover:text-[#0B3D2E]">
                            Todos
                        </button>
                    </div>
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

                <div className="mt-6 overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white">
                    <table className="w-full border-collapse text-left text-sm">
                        <thead className="bg-[#DCFCE7] text-xs uppercase tracking-wide text-[#0B3D2E]">
                            <tr>
                                <th className="px-4 py-3 font-extrabold">Local</th>
                                <th className="px-4 py-3 font-extrabold">Tipo</th>
                                <th className="px-4 py-3 font-extrabold">Responsavel</th>
                                <th className="px-4 py-3 font-extrabold">Data</th>
                                <th className="px-4 py-3 font-extrabold">Status</th>
                                <th className="px-4 py-3 font-extrabold">Acoes</th>
                            </tr>
                        </thead>

                        <tbody className="divide-y divide-[#E5E7EB]">
                            {inspections.map((inspection) => (
                                <tr key={`${inspection.location}-${inspection.type}`} className="transition hover:bg-[#F3F4F6]">
                                    <td className="px-4 py-4 font-extrabold text-[#111827]">
                                        {inspection.location}
                                    </td>
                                    <td className="px-4 py-4 font-semibold text-[#6B7280]">
                                        {inspection.type}
                                    </td>
                                    <td className="px-4 py-4 font-semibold text-[#6B7280]">
                                        {inspection.responsible}
                                    </td>
                                    <td className="px-4 py-4 font-semibold text-[#6B7280]">
                                        {inspection.date}
                                    </td>
                                    <td className="px-4 py-4">
                                        <StatusBadge label={inspection.status} variant={inspection.variant} />
                                    </td>
                                    <td className="px-4 py-4">
                                        <div className="flex flex-wrap gap-2">
                                            <button className="rounded-xl border border-[#E5E7EB] bg-white px-3 py-1.5 text-xs font-bold text-[#6B7280] transition hover:bg-[#DCFCE7] hover:text-[#0B3D2E]">
                                                Ver
                                            </button>
                                            <button className="rounded-xl border border-[#E5E7EB] bg-white px-3 py-1.5 text-xs font-bold text-[#6B7280] transition hover:bg-[#DCFCE7] hover:text-[#0B3D2E]">
                                                Checklist
                                            </button>
                                            <button className="rounded-xl border border-[#E5E7EB] bg-white px-3 py-1.5 text-xs font-bold text-[#6B7280] transition hover:bg-[#DCFCE7] hover:text-[#0B3D2E]">
                                                Fotos
                                            </button>
                                            <button className="rounded-xl border border-[#E5E7EB] bg-white px-3 py-1.5 text-xs font-bold text-[#6B7280] transition hover:bg-[#DCFCE7] hover:text-[#0B3D2E]">
                                                PDF
                                            </button>
                                            <button className="rounded-xl border border-[#E5E7EB] bg-white px-3 py-1.5 text-xs font-bold text-[#6B7280] transition hover:bg-[#DCFCE7] hover:text-[#0B3D2E]">
                                                Concluir
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>

            {isCreateOpen && <CreateInspectionModal onClose={() => setIsCreateOpen(false)} />}
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

function CreateInspectionModal({ onClose }: ModalProps) {
    return (
        <ModalShell title="Nova Vistoria" onClose={onClose}>
            <div className="space-y-6">
                <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
                    <Field label="Tipo de vistoria" value="Entrada" />
                    <Field label="Local" value="Predio/unidade" />
                    <Field label="Uni ou predio" value="Apto 101" />
                    <Field label="Data" value="Vinculada automaticamente" />
                    <Field label="Responsavel" value="" />
                </div>

                <TextArea label="Observacao" value="Opcional..." />

                <button className="h-12 w-full rounded-2xl bg-[#16A34A] text-sm font-extrabold text-white shadow-sm shadow-[#16A34A]/30 transition hover:bg-[#0B3D2E]">
                    Avancar
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
