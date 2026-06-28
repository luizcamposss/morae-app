import { useState } from 'react'
import type { ReactNode } from 'react'

type ModalType = 'data' | 'finance' | 'permissions' | 'invites' | 'notifications' | null

const settings = [
    {
        label: 'Dados',
        description: 'Informacoes gerais do condominio',
        modal: 'data' as const,
    },
    {
        label: 'Financeiro',
        description: 'Cobranca, vencimento e mensagem padrao',
        modal: 'finance' as const,
    },
    {
        label: 'Permissoes',
        description: 'Ajuste acessos de sindicos e moradores',
        modal: 'permissions' as const,
    },
    {
        label: 'Convites',
        description: 'Expiracao e mensagem de convite',
        modal: 'invites' as const,
    },
    {
        label: 'Notificacoes',
        description: 'Avisos automaticos do condominio',
        modal: 'notifications' as const,
    },
]

export function AdminSettingsPage() {
    const [modal, setModal] = useState<ModalType>(null)

    return (
        <>
            <section className="rounded-[2rem] border border-[#E5E7EB] bg-white p-6 shadow-sm">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-[#111827]">
                        Configuracoes
                    </h1>
                    <p className="mt-1 text-sm font-semibold text-[#6B7280]">
                        Ajustes gerais do condominio.
                    </p>
                </div>

                <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                    {settings.slice(0, 3).map((setting) => (
                        <SettingCard
                            key={setting.label}
                            label={setting.label}
                            description={setting.description}
                            onClick={() => setModal(setting.modal)}
                        />
                    ))}
                </div>

                <div className="mx-auto mt-5 grid max-w-3xl grid-cols-1 gap-5 md:grid-cols-2">
                    {settings.slice(3).map((setting) => (
                        <SettingCard
                            key={setting.label}
                            label={setting.label}
                            description={setting.description}
                            onClick={() => setModal(setting.modal)}
                        />
                    ))}
                </div>
            </section>

            {modal === 'data' && <CondominiumDataModal onClose={() => setModal(null)} />}
            {modal === 'finance' && <FinanceModal onClose={() => setModal(null)} />}
            {modal === 'permissions' && <PermissionsModal onClose={() => setModal(null)} />}
            {modal === 'invites' && <InvitesModal onClose={() => setModal(null)} />}
            {modal === 'notifications' && <NotificationsModal onClose={() => setModal(null)} />}
        </>
    )
}

type SettingCardProps = {
    label: string
    description: string
    onClick: () => void
}

function SettingCard({ label, description, onClick }: SettingCardProps) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="min-h-40 rounded-[1.5rem] border border-[#E5E7EB] bg-[#F3F4F6] p-6 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-[#86EFAC] hover:bg-[#DCFCE7] hover:shadow-md"
        >
            <span className="block text-2xl font-extrabold text-[#111827]">
                {label}
            </span>
            <span className="mt-3 block text-sm font-semibold text-[#6B7280]">
                {description}
            </span>
        </button>
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

function CondominiumDataModal({ onClose }: ModalProps) {
    return (
        <ModalShell title="Dados do Condominio" onClose={onClose}>
            <div className="space-y-6">
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                    <Field label="Nome do condominio" value="Residencial Jardim Sul" />
                    <Field label="CNPJ" value="00.000.000/001-00" />
                    <Field label="Endereco" value="Rua das Flores, 120" />
                    <Field label="Cidade" value="Caxias do Sul" />
                    <Field label="E-mail de contato" value="contato@jardimsul.com" />
                    <Field label="Telefone" value="(54) 99999-9999" />
                </div>

                <button className="h-12 w-full rounded-2xl bg-[#16A34A] text-sm font-extrabold text-white shadow-sm shadow-[#16A34A]/30 transition hover:bg-[#0B3D2E]">
                    Salvar alteracoes
                </button>
            </div>
        </ModalShell>
    )
}

function FinanceModal({ onClose }: ModalProps) {
    return (
        <ModalShell title="Dados Financeiros" onClose={onClose}>
            <div className="space-y-6">
                <div className="grid grid-cols-1 gap-5 md:grid-cols-[1fr_160px_120px]">
                    <Field label="Chave PIX do condominio" value="financeiro@jardimsul.com" />
                    <Field label="Valor mensal" value="R$ 350,00" />
                    <Field label="Vencimento" value="10" />
                </div>

                <TextArea label="Mensagem padrao" value="Taxa condominial referente ao mes atual." />

                <button className="h-12 w-full rounded-2xl bg-[#16A34A] text-sm font-extrabold text-white shadow-sm shadow-[#16A34A]/30 transition hover:bg-[#0B3D2E]">
                    Salvar alteracoes
                </button>
            </div>
        </ModalShell>
    )
}

function PermissionsModal({ onClose }: ModalProps) {
    return (
        <ModalShell title="Permissoes" onClose={onClose}>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <PermissionGroup
                    title="Sindico"
                    permissions={[
                        ['Ver moradores do predio', true],
                        ['Criar avisos para o predio', true],
                        ['Registrar manutencoes', true],
                        ['Executar vistorias', true],
                        ['Marcar pagamentos como pagos', false],
                    ]}
                />

                <PermissionGroup
                    title="Morador"
                    permissions={[
                        ['Ver proprios boletos', true],
                        ['Enviar comprovante', true],
                        ['Abrir solicitacao de manutencao', true],
                        ['Ver avisos do predio', true],
                        ['Enviar mensagem direta ao Admin', false],
                    ]}
                />

                <button className="h-12 rounded-2xl bg-[#16A34A] text-sm font-extrabold text-white shadow-sm shadow-[#16A34A]/30 transition hover:bg-[#0B3D2E] md:col-span-2">
                    Salvar alteracoes e continuar
                </button>
            </div>
        </ModalShell>
    )
}

function InvitesModal({ onClose }: ModalProps) {
    return (
        <ModalShell title="Convites" onClose={onClose}>
            <div className="space-y-6">
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                    <Field label="Expiracao do convite" value="7 dias" />
                    <Field label="Permitir reenvio de convite" value="Sim" />
                </div>

                <TextArea label="Mensagem padrao do convite" value="Voce foi convidado para acessar o app do condominio." />

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
                        'Avisar moradores quando novo boleto for gerado',
                        'Avisar moradores antes do vencimento',
                        'Avisar Admin sobre pagamento atrasado',
                        'Avisar sindico sobre nova manutencao no predio',
                        'Avisar moradores sobre novo comunicado',
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

type PermissionGroupProps = {
    title: string
    permissions: [string, boolean][]
}

function PermissionGroup({ title, permissions }: PermissionGroupProps) {
    return (
        <div className="rounded-2xl bg-[#F3F4F6] p-5">
            <h3 className="text-xl font-extrabold text-[#111827]">
                {title}
            </h3>

            <div className="mt-4 space-y-3">
                {permissions.map(([label, checked]) => (
                    <label key={label} className="flex items-center gap-3 text-sm font-bold text-[#111827]">
                        <input
                            type="checkbox"
                            checked={checked}
                            readOnly
                            className="size-4 accent-[#16A34A]"
                        />
                        {label}
                    </label>
                ))}
            </div>
        </div>
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
