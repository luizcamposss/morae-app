import { useState } from 'react'
import type { ReactNode } from 'react'

type ModalType = 'data' | 'notifications' | null

const settings = [
    {
        label: 'Dados pessoais',
        description: 'Nome, contato e documento',
        modal: 'data' as const,
    },
    {
        label: 'Notificacoes',
        description: 'Preferencias de avisos do app',
        modal: 'notifications' as const,
    },
]

export function ResidentSettingsPage() {
    const [modal, setModal] = useState<ModalType>(null)

    return (
        <>
            <section className="min-h-[620px] rounded-[2rem] border border-[#E5E7EB] bg-white p-6 shadow-sm">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-[#111827]">
                        Configuracoes
                    </h1>
                    <p className="mt-1 text-sm font-semibold text-[#6B7280]">
                        Ajustes pessoais do perfil de morador.
                    </p>
                </div>

                <div className="mx-auto mt-28 grid max-w-2xl grid-cols-1 gap-8 md:grid-cols-2">
                    {settings.map((setting) => (
                        <button
                            key={setting.label}
                            type="button"
                            onClick={() => setModal(setting.modal)}
                            className="min-h-40 rounded-[1.5rem] border border-[#E5E7EB] bg-[#F3F4F6] p-6 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-[#86EFAC] hover:bg-[#DCFCE7] hover:shadow-md"
                        >
                            <span className="block text-2xl font-extrabold text-[#111827]">
                                {setting.label}
                            </span>
                            <span className="mt-3 block text-sm font-semibold text-[#6B7280]">
                                {setting.description}
                            </span>
                        </button>
                    ))}
                </div>
            </section>

            {modal === 'data' && <DataModal onClose={() => setModal(null)} />}
            {modal === 'notifications' && <NotificationsModal onClose={() => setModal(null)} />}
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

function DataModal({ onClose }: ModalProps) {
    return (
        <ModalShell title="Dados" onClose={onClose}>
            <div className="space-y-6">
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                    <Field label="Nome" value="Joao Silva" />
                    <Field label="E-mail" value="joao@gmail.com" />
                    <Field label="Telefone" value="(54) 99999-9999" />
                    <Field label="CPF" value="***.***.***-**" />
                </div>

                <button className="h-12 w-full rounded-2xl bg-[#16A34A] text-sm font-extrabold text-white shadow-sm shadow-[#16A34A]/30 transition hover:bg-[#0B3D2E]">
                    Salvar alteracoes
                </button>
            </div>
        </ModalShell>
    )
}

function NotificationsModal({ onClose }: ModalProps) {
    return (
        <ModalShell title="Notificacoes" onClose={onClose}>
            <div className="space-y-6">
                <div className="space-y-3 rounded-2xl bg-[#F3F4F6] p-5">
                    {[
                        'Avisar quando novo boleto for gerado',
                        'Avisar antes do vencimento',
                        'Avisar sobre novos comunicados',
                        'Avisar quando solicitacoes forem respondidas',
                    ].map((item) => (
                        <label key={item} className="flex items-center gap-3 text-sm font-bold text-[#111827]">
                            <input
                                type="checkbox"
                                checked
                                readOnly
                                className="size-4 accent-[#16A34A]"
                            />
                            {item}
                        </label>
                    ))}
                </div>

                <button className="h-12 w-full rounded-2xl bg-[#16A34A] text-sm font-extrabold text-white shadow-sm shadow-[#16A34A]/30 transition hover:bg-[#0B3D2E]">
                    Salvar alteracoes
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
