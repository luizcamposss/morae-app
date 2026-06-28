import { useState } from 'react'
import type { ReactNode } from 'react'
import { MetricCard } from '../../shared/components/MetricCard'
import { StatusBadge } from '../../shared/components/StatusBadge'

const metrics = [
    {
        label: 'Total',
        value: '3',
        helper: 'Predios cadastrados',
    },
    {
        label: 'Com sindico',
        value: '2',
        helper: 'Responsavel definido',
    },
    {
        label: 'Sem sindico',
        value: '1',
        helper: 'Pendente de definicao',
    },
    {
        label: 'Unidades',
        value: '120',
        helper: 'Distribuidas nos predios',
    },
]

const buildings = [
    {
        name: 'Predio A',
        syndic: 'Joao Silva',
        units: 40,
        residents: 78,
        status: 'Ativo',
        variant: 'success' as const,
    },
    {
        name: 'Predio B',
        syndic: 'Ana Souza',
        units: 40,
        residents: 70,
        status: 'Ativo',
        variant: 'success' as const,
    },
    {
        name: 'Predio C',
        syndic: 'Sem sindico',
        units: 40,
        residents: 64,
        status: 'Atencao',
        variant: 'warning' as const,
    },
]

export function BuildingsPage() {
    const [isCreateOpen, setIsCreateOpen] = useState(false)

    return (
        <>
            <section className="rounded-[2rem] border border-[#E5E7EB] bg-white p-6 shadow-sm">
                <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                        <h1 className="text-3xl font-extrabold tracking-tight text-[#111827]">
                            Predios
                        </h1>
                        <p className="mt-1 text-sm font-semibold text-[#6B7280]">
                            Controle os predios e blocos do condominio.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={() => setIsCreateOpen(true)}
                        className="h-11 rounded-2xl bg-[#16A34A] px-5 text-sm font-extrabold text-white shadow-sm shadow-[#16A34A]/30 transition hover:bg-[#0B3D2E]"
                    >
                        + Novo Predio
                    </button>
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

                <div className="mt-6 rounded-[1.5rem] border border-[#E5E7EB] bg-[#F3F4F6] p-4">
                    <div className="mb-4 flex flex-col gap-3 md:flex-row">
                        <input
                            type="search"
                            placeholder="Buscar predio..."
                            className="h-11 flex-1 rounded-2xl border border-[#E5E7EB] bg-white px-4 text-sm font-semibold text-[#111827] outline-none transition placeholder:text-[#9CA3AF] focus:border-[#22C55E] focus:ring-4 focus:ring-[#86EFAC]/30"
                        />

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
                                    <th className="px-4 py-3 font-extrabold">Sindico</th>
                                    <th className="px-4 py-3 font-extrabold">Unidades</th>
                                    <th className="px-4 py-3 font-extrabold">Moradores</th>
                                    <th className="px-4 py-3 font-extrabold">Status</th>
                                    <th className="px-4 py-3 font-extrabold">Acoes</th>
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-[#E5E7EB]">
                                {buildings.map((building) => (
                                    <tr key={building.name} className="transition hover:bg-[#F3F4F6]">
                                        <td className="px-4 py-4 font-extrabold text-[#111827]">
                                            {building.name}
                                        </td>
                                        <td className="px-4 py-4 font-semibold text-[#6B7280]">
                                            {building.syndic}
                                        </td>
                                        <td className="px-4 py-4 font-semibold text-[#6B7280]">
                                            {building.units}
                                        </td>
                                        <td className="px-4 py-4 font-semibold text-[#6B7280]">
                                            {building.residents}
                                        </td>
                                        <td className="px-4 py-4">
                                            <StatusBadge label={building.status} variant={building.variant} />
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className="flex flex-wrap gap-2">
                                                <button className="rounded-xl border border-[#E5E7EB] bg-white px-3 py-1.5 text-xs font-bold text-[#6B7280] transition hover:bg-[#DCFCE7] hover:text-[#0B3D2E]">
                                                    Ver
                                                </button>
                                                <button className="rounded-xl border border-[#E5E7EB] bg-white px-3 py-1.5 text-xs font-bold text-[#6B7280] transition hover:bg-[#DCFCE7] hover:text-[#0B3D2E]">
                                                    Editar
                                                </button>
                                                <button className="rounded-xl border border-[#E5E7EB] bg-white px-3 py-1.5 text-xs font-bold text-[#6B7280] transition hover:bg-[#DCFCE7] hover:text-[#0B3D2E]">
                                                    Definir sindico
                                                </button>
                                                <button className="rounded-xl border border-[#E5E7EB] bg-white px-3 py-1.5 text-xs font-bold text-[#6B7280] transition hover:bg-[#DCFCE7] hover:text-[#0B3D2E]">
                                                    Unidades
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <p className="mt-4 text-sm font-semibold text-[#6B7280]">
                        Acoes planejadas: ver detalhes, editar, definir sindico e abrir unidades do predio.
                    </p>
                </div>
            </section>

            {isCreateOpen && <CreateBuildingModal onClose={() => setIsCreateOpen(false)} />}
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

function CreateBuildingModal({ onClose }: ModalProps) {
    return (
        <ModalShell title="Cadastrar Novo Predio" onClose={onClose}>
            <div className="space-y-6">
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                    <Field label="Nome do predio" value="Predio A" />
                    <Field label="Codigo/identificacao" value="BLOCO-A" />
                </div>

                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                    <Field label="Sindico responsavel" value="Selecionar sindico" />
                    <Field label="Quantidade estimada de unidades" value="40 unidades" />
                </div>

                <button className="h-12 w-full rounded-2xl bg-[#16A34A] text-sm font-extrabold text-white shadow-sm shadow-[#16A34A]/30 transition hover:bg-[#0B3D2E]">
                    Cadastrar
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
