import { useState } from 'react'
import type { ReactNode } from 'react'
import { MetricCard } from '../../shared/components/MetricCard'
import { StatusBadge } from '../../shared/components/StatusBadge'

const metrics = [
    {
        label: 'Ativos',
        value: '86',
        helper: 'Acessos liberados',
    },
    {
        label: 'Pendentes',
        value: '9',
        helper: 'Convites enviados',
    },
    {
        label: 'Expirados',
        value: '4',
        helper: 'Aguardando reenvio',
    },
    {
        label: 'Bloqueados',
        value: '2',
        helper: 'Sem acesso ao app',
    },
]

const users = [
    {
        name: 'Joao Silva',
        profile: 'Sindico',
        building: 'Predio A',
        unit: '-',
        status: 'Ativo',
        variant: 'success' as const,
    },
    {
        name: 'Maria Souza',
        profile: 'Moradora',
        building: 'Predio B',
        unit: 'Apto 101',
        status: 'Pendente',
        variant: 'warning' as const,
    },
    {
        name: 'Carlos Dias',
        profile: 'Morador',
        building: 'Predio C',
        unit: 'Apto 204',
        status: 'Ativo',
        variant: 'success' as const,
    },
]

export function AdminUsersPage() {
    const [isInviteOpen, setIsInviteOpen] = useState(false)

    return (
        <>
            <section className="rounded-[2rem] border border-[#E5E7EB] bg-white p-6 shadow-sm">
                <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                        <h1 className="text-3xl font-extrabold tracking-tight text-[#111827]">
                            Usuarios
                        </h1>
                        <p className="mt-1 text-sm font-semibold text-[#6B7280]">
                            Controle quem acessa o app do condominio.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={() => setIsInviteOpen(true)}
                        className="h-11 rounded-2xl bg-[#16A34A] px-5 text-sm font-extrabold text-white shadow-sm shadow-[#16A34A]/30 transition hover:bg-[#0B3D2E]"
                    >
                        Enviar convite
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
                            placeholder="Buscar nome, e-mail, predio ou unidade..."
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
                                    <th className="px-4 py-3 font-extrabold">Nome</th>
                                    <th className="px-4 py-3 font-extrabold">Perfil</th>
                                    <th className="px-4 py-3 font-extrabold">Predio</th>
                                    <th className="px-4 py-3 font-extrabold">Unidade</th>
                                    <th className="px-4 py-3 font-extrabold">Status</th>
                                    <th className="px-4 py-3 font-extrabold">Acoes</th>
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-[#E5E7EB]">
                                {users.map((user) => (
                                    <tr key={user.name} className="transition hover:bg-[#F3F4F6]">
                                        <td className="px-4 py-4 font-extrabold text-[#111827]">
                                            {user.name}
                                        </td>
                                        <td className="px-4 py-4 font-semibold text-[#6B7280]">
                                            {user.profile}
                                        </td>
                                        <td className="px-4 py-4 font-semibold text-[#6B7280]">
                                            {user.building}
                                        </td>
                                        <td className="px-4 py-4 font-semibold text-[#6B7280]">
                                            {user.unit}
                                        </td>
                                        <td className="px-4 py-4">
                                            <StatusBadge label={user.status} variant={user.variant} />
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className="flex flex-wrap gap-2">
                                                <button className="rounded-xl border border-[#E5E7EB] bg-white px-3 py-1.5 text-xs font-bold text-[#6B7280] transition hover:bg-[#DCFCE7] hover:text-[#0B3D2E]">
                                                    Ver
                                                </button>
                                                <button
                                                    onClick={() => setIsInviteOpen(true)}
                                                    className="rounded-xl border border-[#E5E7EB] bg-white px-3 py-1.5 text-xs font-bold text-[#6B7280] transition hover:bg-[#DCFCE7] hover:text-[#0B3D2E]"
                                                >
                                                    Reenviar convite
                                                </button>
                                                <button className="rounded-xl border border-[#E5E7EB] bg-white px-3 py-1.5 text-xs font-bold text-[#B42318] transition hover:bg-[#FDECEC]">
                                                    Bloquear
                                                </button>
                                                <button className="rounded-xl border border-[#E5E7EB] bg-white px-3 py-1.5 text-xs font-bold text-[#6B7280] transition hover:bg-[#DCFCE7] hover:text-[#0B3D2E]">
                                                    Trocar perfil
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <p className="mt-4 text-sm font-semibold text-[#6B7280]">
                        Acoes planejadas: ver detalhes, reenviar convite, bloquear acesso e trocar perfil.
                    </p>
                </div>
            </section>

            {isInviteOpen && <InviteUserModal onClose={() => setIsInviteOpen(false)} />}
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

function InviteUserModal({ onClose }: ModalProps) {
    return (
        <ModalShell title="Enviar Convite" onClose={onClose}>
            <div className="space-y-6">
                <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
                    <Field label="Pessoa" value="Selecionar" />
                    <Field label="Perfil de acesso" value="Morador" />
                    <Field label="Predio" value="Predio A" />
                    <Field label="Unidade" value="Apto 101" />
                    <Field label="E-mail" value="maria@gmail.com" />
                </div>

                <div className="rounded-2xl bg-[#F3F4F6] p-5 text-sm font-semibold text-[#6B7280]">
                    <p>Convite dura 7 dias.</p>
                    <p>Se aceitar, usuario fica ativo. Se nao aceitar, fica expirado.</p>
                    <p>O admin pode reenviar o convite.</p>
                </div>

                <button className="h-12 w-full rounded-2xl bg-[#16A34A] text-sm font-extrabold text-white shadow-sm shadow-[#16A34A]/30 transition hover:bg-[#0B3D2E]">
                    Enviar convite
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
