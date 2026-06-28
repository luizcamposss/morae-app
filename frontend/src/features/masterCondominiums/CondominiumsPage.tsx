import { useState } from 'react'
import { MetricCard } from '../../shared/components/MetricCard'
import { StatusBadge } from '../../shared/components/StatusBadge'

const metrics = [
    {
        label: 'Total de condominios',
        value: '32',
        helper: 'Base cadastrada',
    },
    {
        label: 'Aguardando resposta ADM',
        value: '5',
        helper: 'Convites pendentes',
    },
    {
        label: 'Ativos',
        value: '24',
        helper: 'Em operacao',
    },
    {
        label: 'Inativos',
        value: '3',
        helper: 'Bloqueados ou pausados',
    },
]

const condominiums = [
    {
        name: 'Jardim Sul',
        responsible: 'Carlos',
        location: 'Caxias do Sul',
        payment: 'Pago',
        paymentVariant: 'success' as const,
        status: 'Ativo',
        statusVariant: 'success' as const,
    },
    {
        name: 'Solar Norte',
        responsible: 'Ana',
        location: 'Torres',
        payment: 'Pendente',
        paymentVariant: 'warning' as const,
        status: 'Aguardando ADM',
        statusVariant: 'warning' as const,
    },
    {
        name: 'Central',
        responsible: 'Marcos',
        location: 'Vacaria',
        payment: 'Atrasado',
        paymentVariant: 'danger' as const,
        status: 'Inativo',
        statusVariant: 'neutral' as const,
    },
]

const steps = ['Condominio', 'Pagamento', 'Administrador', 'Revisar']

export function CondominiumsPage() {
    const [isModalOpen, setIsModalOpen] = useState(false)

    return (
        <>
            <div className="space-y-7">
                <section className="rounded-[2rem] border border-[#E5E7EB] bg-white p-6 shadow-sm">
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                            <h1 className="text-3xl font-extrabold tracking-tight text-[#111827]">
                                Condominios
                            </h1>
                            <p className="mt-1 text-sm font-semibold text-[#6B7280]">
                                Gerenciador de condominios da plataforma.
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={() => setIsModalOpen(true)}
                            className="inline-flex h-11 items-center justify-center rounded-2xl bg-[#16A34A] px-5 text-sm font-extrabold text-white shadow-sm shadow-[#16A34A]/30 transition hover:bg-[#0B3D2E]"
                        >
                            + Novo Condominio
                        </button>
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
                                Filtrar
                            </button>
                        </div>

                        <div className="overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white">
                            <table className="w-full border-collapse text-left text-sm">
                                <thead className="bg-[#DCFCE7] text-xs uppercase tracking-wide text-[#0B3D2E]">
                                    <tr>
                                        <th className="px-4 py-3 font-extrabold">Condominio</th>
                                        <th className="px-4 py-3 font-extrabold">Responsavel</th>
                                        <th className="px-4 py-3 font-extrabold">Localizacao</th>
                                        <th className="px-4 py-3 font-extrabold">Pagamento</th>
                                        <th className="px-4 py-3 font-extrabold">Status</th>
                                        <th className="px-4 py-3 font-extrabold">Acoes</th>
                                    </tr>
                                </thead>

                                <tbody className="divide-y divide-[#E5E7EB]">
                                    {condominiums.map((condominium) => (
                                        <tr key={condominium.name} className="transition hover:bg-[#F3F4F6]">
                                            <td className="px-4 py-4 font-extrabold text-[#111827]">
                                                {condominium.name}
                                            </td>
                                            <td className="px-4 py-4 font-semibold text-[#6B7280]">
                                                {condominium.responsible}
                                            </td>
                                            <td className="px-4 py-4 font-semibold text-[#6B7280]">
                                                {condominium.location}
                                            </td>
                                            <td className="px-4 py-4">
                                                <StatusBadge label={condominium.payment} variant={condominium.paymentVariant} />
                                            </td>
                                            <td className="px-4 py-4">
                                                <StatusBadge label={condominium.status} variant={condominium.statusVariant} />
                                            </td>
                                            <td className="px-4 py-4">
                                                <div className="flex flex-wrap gap-2">
                                                    {['Ver', 'Editar', 'ADM', 'Pagamento', 'Bloquear'].map((action) => (
                                                        <button
                                                            key={action}
                                                            className="rounded-xl border border-[#E5E7EB] bg-white px-3 py-1.5 text-xs font-bold text-[#6B7280] transition hover:bg-[#DCFCE7] hover:text-[#0B3D2E]"
                                                        >
                                                            {action}
                                                        </button>
                                                    ))}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </section>
            </div>

            {isModalOpen && (
                <NewCondominiumModal onClose={() => setIsModalOpen(false)} />
            )}
        </>
    )
}

type NewCondominiumModalProps = {
    onClose: () => void
}

function NewCondominiumModal({ onClose }: NewCondominiumModalProps) {
    const [step, setStep] = useState(0)

    function nextStep() {
        setStep((currentStep) => Math.min(currentStep + 1, steps.length - 1))
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0B3D2E]/30 px-6 py-8 backdrop-blur-sm">
            <div className="w-full max-w-3xl overflow-hidden rounded-[2rem] border border-[#E5E7EB] bg-white shadow-2xl shadow-[#0B3D2E]/20">
                <div className="flex items-center justify-between border-b border-[#E5E7EB] px-6 py-5">
                    <div>
                        <h2 className="text-2xl font-extrabold text-[#111827]">
                            Cadastrar novo condominio
                        </h2>
                        <p className="mt-1 text-sm font-semibold text-[#6B7280]">
                            Preencha as etapas para preparar o onboarding.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className="flex size-10 items-center justify-center rounded-full bg-[#F3F4F6] text-xl font-light text-[#6B7280] transition hover:bg-[#FDECEC] hover:text-[#B42318]"
                    >
                        x
                    </button>
                </div>

                <div className="border-b border-[#E5E7EB] px-6 py-4">
                    <div className="flex flex-wrap items-center gap-3">
                        {steps.map((stepLabel, index) => {
                            const isDone = index < step
                            const isActive = index === step

                            return (
                                <div key={stepLabel} className="flex items-center gap-3">
                                    <span
                                        className={`size-3 rounded-full border ${
                                            isDone || isActive
                                                ? 'border-[#16A34A] bg-[#86EFAC]'
                                                : 'border-[#EF4444] bg-[#FDECEC]'
                                        }`}
                                    />
                                    <span
                                        className={`text-sm font-extrabold ${
                                            isActive ? 'text-[#0B3D2E]' : 'text-[#6B7280]'
                                        }`}
                                    >
                                        {stepLabel}
                                    </span>
                                    {index < steps.length - 1 && (
                                        <span className="h-px w-8 bg-[#E5E7EB]" />
                                    )}
                                </div>
                            )
                        })}
                    </div>
                </div>

                <div className="max-h-[520px] overflow-y-auto px-8 py-7">
                    {step === 0 && <CondominiumStep />}
                    {step === 1 && <PaymentStep />}
                    {step === 2 && <AdminStep />}
                    {step === 3 && <ReviewStep />}
                </div>

                <div className="border-t border-[#E5E7EB] px-8 py-5">
                    <button
                        type="button"
                        onClick={nextStep}
                        className="h-12 w-full rounded-2xl bg-[#16A34A] text-sm font-extrabold text-white shadow-sm shadow-[#16A34A]/30 transition hover:bg-[#0B3D2E]"
                    >
                        {step === steps.length - 1
                            ? 'Criar e enviar convite para Administrador'
                            : 'Confirmar e continuar'}
                    </button>
                </div>
            </div>
        </div>
    )
}

function CondominiumStep() {
    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 gap-5 md:grid-cols-[1fr_1fr_120px]">
                <Field label="Nome do Condominio" value="Central" />
                <Field label="Cidade" value="Caxias do Sul" />
                <Field label="Estado" value="RS" />
            </div>

            <TextArea
                label="Observacoes"
                value="Cliente veio por indicacao / inicio em junho..."
            />
        </div>
    )
}

function PaymentStep() {
    return (
        <div className="space-y-6">
            <p className="rounded-2xl bg-[#DCFCE7] px-4 py-3 text-sm font-bold text-[#0B3D2E]">
                Ajuste sobre o pagamento: mensalidade, valor variavel e inicio da cobranca.
            </p>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
                <Field label="Valor Mensalidade" value="R$ 400,00" />
                <Field label="Inicio da Cobranca" value="08/05/2026" />
                <Field label="Vencimento" value="Dia 10" />
            </div>

            <TextArea
                label="Observacoes"
                value="Primeira mensalidade com vencimento em junho..."
            />
        </div>
    )
}

function AdminStep() {
    return (
        <div className="space-y-6">
            <p className="rounded-2xl bg-[#DCFCE7] px-4 py-3 text-sm font-bold text-[#0B3D2E]">
                O administrador recebera o convite para acessar o condominio.
            </p>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <Field label="Nome Completo" value="Claudio Silva" />
                <Field label="E-mail" value="claudio.silva@gmail.com" />
                <Field label="Telefone" value="+55 (54) 99999-9999" />
                <Field label="Funcao no Condominio" value="Administrador" />
            </div>

            <div className="rounded-2xl border border-[#E5E7EB] bg-[#F3F4F6] p-4">
                <p className="text-sm font-extrabold text-[#111827]">
                    Opcoes planejadas
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                    {['Proprietario', 'Administrador', 'Sindico Profissional'].map((item) => (
                        <span
                            key={item}
                            className="rounded-full bg-white px-3 py-1 text-xs font-bold text-[#6B7280]"
                        >
                            {item}
                        </span>
                    ))}
                </div>
            </div>
        </div>
    )
}

function ReviewStep() {
    return (
        <div className="space-y-5">
            <p className="text-3xl font-extrabold leading-tight text-[#111827]">
                Aqui vai aparecer todas as infos para revisar antes de enviar.
            </p>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {[
                    ['Condominio', 'Central'],
                    ['Cidade', 'Caxias do Sul - RS'],
                    ['Mensalidade', 'R$ 400,00 / Dia 10'],
                    ['Administrador', 'Claudio Silva'],
                    ['E-mail', 'claudio.silva@gmail.com'],
                    ['Status inicial', 'Aguardando ADM'],
                ].map(([label, value]) => (
                    <div key={label} className="rounded-2xl bg-[#F3F4F6] p-4">
                        <p className="text-xs font-extrabold uppercase tracking-wide text-[#6B7280]">
                            {label}
                        </p>
                        <p className="mt-1 text-sm font-extrabold text-[#111827]">
                            {value}
                        </p>
                    </div>
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
