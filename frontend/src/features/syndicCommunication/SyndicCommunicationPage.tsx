import { useState } from 'react'
import type { ReactNode } from 'react'
import { StatusBadge } from '../../shared/components/StatusBadge'

const categories = [
    {
        label: 'Avisos',
        value: '8',
        helper: 'Publicados no predio',
    },
    {
        label: 'Assembleias',
        value: '2',
        helper: 'Comunicados aos moradores',
    },
    {
        label: 'Mensagens',
        value: '19',
        helper: 'Envios recentes',
    },
]

const notices = [
    {
        title: 'Limpeza da garagem',
        audience: 'Predio A',
        date: 'Hoje',
        status: 'Publicado',
        variant: 'success' as const,
    },
    {
        title: 'Elevador em revisao',
        audience: 'Predio A',
        date: '20/05',
        status: 'Urgente',
        variant: 'danger' as const,
    },
    {
        title: 'Assembleia geral',
        audience: 'Todos',
        date: '18/05',
        status: 'Publicado',
        variant: 'success' as const,
    },
]

export function SyndicCommunicationPage() {
    const [isCreateOpen, setIsCreateOpen] = useState(false)

    return (
        <>
            <section className="rounded-[2rem] border border-[#E5E7EB] bg-white p-6 shadow-sm">
                <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                        <h1 className="text-3xl font-extrabold tracking-tight text-[#111827]">
                            Comunicacao - predio A
                        </h1>
                        <p className="mt-1 text-sm font-semibold text-[#6B7280]">
                            Envie avisos para moradores do predio.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={() => setIsCreateOpen(true)}
                        className="h-11 rounded-2xl bg-[#16A34A] px-5 text-sm font-extrabold text-white shadow-sm shadow-[#16A34A]/30 transition hover:bg-[#0B3D2E]"
                    >
                        + Novo alerta
                    </button>
                </div>

                <div className="mx-auto grid max-w-3xl grid-cols-1 gap-4 md:grid-cols-3">
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

                <div className="mt-6 rounded-[1.5rem] border border-[#E5E7EB] bg-[#F3F4F6] p-4">
                    <div className="mb-4 flex flex-col gap-3 md:flex-row">
                        <input
                            type="search"
                            placeholder="Buscar aviso..."
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
                                    <th className="px-4 py-3 font-extrabold">Titulo</th>
                                    <th className="px-4 py-3 font-extrabold">Publico</th>
                                    <th className="px-4 py-3 font-extrabold">Data</th>
                                    <th className="px-4 py-3 font-extrabold">Status</th>
                                    <th className="px-4 py-3 font-extrabold">Acoes</th>
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-[#E5E7EB]">
                                {notices.map((notice) => (
                                    <tr key={`${notice.title}-${notice.date}`} className="transition hover:bg-[#F3F4F6]">
                                        <td className="px-4 py-4 font-extrabold text-[#111827]">
                                            {notice.title}
                                        </td>
                                        <td className="px-4 py-4 font-semibold text-[#6B7280]">
                                            {notice.audience}
                                        </td>
                                        <td className="px-4 py-4 font-semibold text-[#6B7280]">
                                            {notice.date}
                                        </td>
                                        <td className="px-4 py-4">
                                            <StatusBadge label={notice.status} variant={notice.variant} />
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className="flex flex-wrap gap-2">
                                                <button className="rounded-xl border border-[#E5E7EB] bg-white px-3 py-1.5 text-xs font-bold text-[#6B7280] transition hover:bg-[#DCFCE7] hover:text-[#0B3D2E]">
                                                    Ver
                                                </button>
                                                <button className="rounded-xl border border-[#E5E7EB] bg-white px-3 py-1.5 text-xs font-bold text-[#6B7280] transition hover:bg-[#DCFCE7] hover:text-[#0B3D2E]">
                                                    Editar
                                                </button>
                                                <button className="rounded-xl border border-[#E5E7EB] bg-white px-3 py-1.5 text-xs font-bold text-[#6B7280] transition hover:bg-[#F3F4F6]">
                                                    Arquivar
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <p className="mt-4 text-sm font-semibold text-[#6B7280]">
                        Acoes planejadas: ver, editar e arquivar comunicados do predio.
                    </p>
                </div>
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
                    <Field label="Enviar para" value="Predio A" />
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
