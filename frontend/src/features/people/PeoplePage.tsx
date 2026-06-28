import { useState } from 'react'
import type { ReactNode } from 'react'
import { StatusBadge } from '../../shared/components/StatusBadge'

const people = [
    {
        name: 'Maria Souza',
        type: 'Morador',
        building: 'Predio A',
        unit: 'Apto 101',
        access: 'Ativo',
        variant: 'success' as const,
    },
    {
        name: 'Joao Silva',
        type: 'Sindico',
        building: 'Predio B',
        unit: '-',
        access: 'Pendente',
        variant: 'warning' as const,
    },
    {
        name: 'Carlos Dias',
        type: 'Proprietario',
        building: 'Predio C',
        unit: 'Apto 204',
        access: 'Ativo',
        variant: 'success' as const,
    },
]

export function PeoplePage() {
    const [isCreateOpen, setIsCreateOpen] = useState(false)

    return (
        <>
            <section className="rounded-[2rem] border border-[#E5E7EB] bg-white p-6 shadow-sm">
                <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                        <h1 className="text-3xl font-extrabold tracking-tight text-[#111827]">
                            Pessoas
                        </h1>
                        <p className="mt-1 text-sm font-semibold text-[#6B7280]">
                            Cadastre moradores, proprietarios e sindicos.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={() => setIsCreateOpen(true)}
                        className="h-11 rounded-2xl bg-[#16A34A] px-5 text-sm font-extrabold text-white shadow-sm shadow-[#16A34A]/30 transition hover:bg-[#0B3D2E]"
                    >
                        + Nova Pessoa
                    </button>
                </div>

                <div className="rounded-[1.5rem] border border-[#E5E7EB] bg-[#F3F4F6] p-4">
                    <div className="mb-4 flex flex-col gap-3 md:flex-row">
                        <input
                            type="search"
                            placeholder="Buscar pessoa..."
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
                                    <th className="px-4 py-3 font-extrabold">Nome completo</th>
                                    <th className="px-4 py-3 font-extrabold">Tipo</th>
                                    <th className="px-4 py-3 font-extrabold">Predio</th>
                                    <th className="px-4 py-3 font-extrabold">Unidade</th>
                                    <th className="px-4 py-3 font-extrabold">Acesso</th>
                                    <th className="px-4 py-3 font-extrabold">Acoes</th>
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-[#E5E7EB]">
                                {people.map((person) => (
                                    <tr key={person.name} className="transition hover:bg-[#F3F4F6]">
                                        <td className="px-4 py-4 font-extrabold text-[#111827]">
                                            {person.name}
                                        </td>
                                        <td className="px-4 py-4 font-semibold text-[#6B7280]">
                                            {person.type}
                                        </td>
                                        <td className="px-4 py-4 font-semibold text-[#6B7280]">
                                            {person.building}
                                        </td>
                                        <td className="px-4 py-4 font-semibold text-[#6B7280]">
                                            {person.unit}
                                        </td>
                                        <td className="px-4 py-4">
                                            <StatusBadge label={person.access} variant={person.variant} />
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
                                                    Vincular unidade
                                                </button>
                                                <button className="rounded-xl border border-[#E5E7EB] bg-white px-3 py-1.5 text-xs font-bold text-[#6B7280] transition hover:bg-[#DCFCE7] hover:text-[#0B3D2E]">
                                                    Convidar acesso
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <p className="mt-4 text-sm font-semibold text-[#6B7280]">
                        Acoes planejadas: ver detalhes, editar, vincular unidade e convidar acesso.
                    </p>
                </div>
            </section>

            {isCreateOpen && <CreatePersonModal onClose={() => setIsCreateOpen(false)} />}
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

function CreatePersonModal({ onClose }: ModalProps) {
    return (
        <ModalShell title="Cadastrar Pessoa" onClose={onClose}>
            <div className="space-y-6">
                <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
                    <Field label="Nome completo" value="Maria Souza" />
                    <Field label="E-mail" value="maria@gmail.com" />
                    <Field label="Telefone" value="(54) 99999-9999" />
                    <Field label="CPF" value="999.999.999-99" />
                    <Field label="Tipo de pessoa" value="Morador" />
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
