import { useEffect, useMemo, useState, type FormEvent } from "react";
import { MetricCard } from "../../shared/components/MetricCard";
import { StatusBadge } from "../../shared/components/StatusBadge";
import {
    deleteCondominium,
    getCondominiums,
    onboardCondominium,
    updateCondominium,
} from "../condominiums/condominiumService";
import type {
    CreateCondominiumOnboardingRequest,
    CondominiumResponse,
    CreateCondominiumRequest,
    UpdateCondominiumRequest,
} from "../condominiums/types";
import { getInvitationsByCondominium } from "../invitations/invitationService";
import type { InvitationResponse } from "../invitations/types";

const ACTIVE_STATUS = 1;
const INACTIVE_STATUS = 2;
const PENDING_INVITATION_STATUS = 1;
const ADMIN_ROLE = 2;

type ModalMode = "create" | "edit" | null;

type FormState = {
    name: string;
    cnpj: string;
    number: string;
    address: string;
    city: string;
    state: string;
    emailContact: string;
    status: number;
    adminName: string;
    adminCpf: string;
    adminPhoneNumber: string;
    adminEmail: string;
    adminPassword: string;
};

type FieldErrors = Partial<Record<keyof FormState, string>>;

const emptyForm: FormState = {
    name: "",
    cnpj: "",
    number: "",
    address: "",
    city: "",
    state: "",
    emailContact: "",
    status: ACTIVE_STATUS,
    adminName: "",
    adminCpf: "",
    adminPhoneNumber: "",
    adminEmail: "",
    adminPassword: "",
};

export function CondominiumsPage() {
    const [condominiums, setCondominiums] = useState<CondominiumResponse[]>([]);
    const [invitations, setInvitations] = useState<InvitationResponse[]>([]);
    const [search, setSearch] = useState("");
    const [errorMessage, setErrorMessage] = useState("");
    const [modalErrorMessage, setModalErrorMessage] = useState("");
    const [successMessage, setSuccessMessage] = useState("");
    const [warningMessage, setWarningMessage] = useState("");
    const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [modalMode, setModalMode] = useState<ModalMode>(null);
    const [selectedCondominium, setSelectedCondominium] =
        useState<CondominiumResponse | null>(null);
    const [form, setForm] = useState<FormState>(emptyForm);

    async function loadCondominiums() {
        try {
            setIsLoading(true);
            setErrorMessage("");
            setWarningMessage("");

            const condominiumResult = await getCondominiums();
            setCondominiums(condominiumResult);

            const invitationResults = await Promise.allSettled(
                condominiumResult.map((condominium) =>
                    getInvitationsByCondominium(condominium.id),
                ),
            );

            setInvitations(
                invitationResults
                    .filter(
                        (
                            result,
                        ): result is PromiseFulfilledResult<InvitationResponse[]> =>
                            result.status === "fulfilled",
                    )
                    .flatMap((result) => result.value),
            );

            if (invitationResults.some((result) => result.status === "rejected")) {
                setWarningMessage("Alguns convites não puderam ser carregados agora.");
            }
        } catch (error) {
            setCondominiums([]);
            setInvitations([]);

            if (error instanceof Error) {
                setErrorMessage(error.message);
            } else {
                setErrorMessage("Não foi possível carregar os condomínios.");
            }
        } finally {
            setIsLoading(false);
        }
    }

    useEffect(() => {
        void loadCondominiums();
    }, []);

    const activeCondominiums = condominiums.filter(
        (condominium) => condominium.status === ACTIVE_STATUS,
    );

    const inactiveCondominiums = condominiums.filter(
        (condominium) => condominium.status !== ACTIVE_STATUS,
    );

    const pendingAdminInvitations = invitations.filter(
        (invitation) =>
            invitation.role === ADMIN_ROLE &&
            invitation.invitationStatus === PENDING_INVITATION_STATUS,
    );

    const filteredCondominiums = useMemo(() => {
        const normalizedSearch = search.trim().toLowerCase();

        if (!normalizedSearch) {
            return condominiums;
        }

        return condominiums.filter((condominium) =>
            [
                condominium.name,
                condominium.cnpj,
                condominium.emailContact,
                condominium.city,
                condominium.state,
                condominium.address,
            ]
                .join(" ")
                .toLowerCase()
                .includes(normalizedSearch),
        );
    }, [condominiums, search]);

    const metrics = [
        {
            label: "Total de condomínios",
            value: condominiums.length.toString(),
            helper: "Base cadastrada",
        },
        {
            label: "Aguardando resposta ADM",
            value: pendingAdminInvitations.length.toString(),
            helper: "Convites pendentes",
        },
        {
            label: "Ativos",
            value: activeCondominiums.length.toString(),
            helper: "Em operação",
        },
        {
            label: "Inativos",
            value: inactiveCondominiums.length.toString(),
            helper: "Pausados ou desativados",
        },
    ];

    function openCreateModal() {
        setSelectedCondominium(null);
        setForm(emptyForm);
        setErrorMessage("");
        setModalErrorMessage("");
        setSuccessMessage("");
        setFieldErrors({});
        setModalMode("create");
    }

    function openEditModal(condominium: CondominiumResponse) {
        setSelectedCondominium(condominium);
        setForm({
            name: condominium.name,
            cnpj: condominium.cnpj,
            number: condominium.number,
            address: condominium.address,
            city: condominium.city,
            state: condominium.state,
            emailContact: condominium.emailContact,
            status: condominium.status,
            adminName: "",
            adminCpf: "",
            adminPhoneNumber: "",
            adminEmail: "",
            adminPassword: "",
        });
        setErrorMessage("");
        setModalErrorMessage("");
        setSuccessMessage("");
        setFieldErrors({});
        setModalMode("edit");
    }

    function closeModal() {
        setModalMode(null);
        setSelectedCondominium(null);
        setForm(emptyForm);
        setModalErrorMessage("");
        setFieldErrors({});
        setIsSaving(false);
    }

    function clearFieldError(field: keyof FormState) {
        if (!fieldErrors[field]) {
            return;
        }

        setFieldErrors((currentErrors) => {
            const nextErrors = { ...currentErrors };
            delete nextErrors[field];
            return nextErrors;
        });
    }

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setErrorMessage("");
        setModalErrorMessage("");
        setSuccessMessage("");
        setFieldErrors({});

        const validationErrors = validateForm(form, modalMode);

        if (Object.keys(validationErrors).length > 0) {
            setFieldErrors(validationErrors);
            setModalErrorMessage("Revise os campos destacados antes de continuar.");
            return;
        }

        try {
            setIsSaving(true);

            if (modalMode === "create") {
                await onboardCondominium(toOnboardingRequest(form));
                setSuccessMessage("Condomínio e administrador cadastrados com sucesso.");
            }

            if (modalMode === "edit" && selectedCondominium) {
                await updateCondominium(
                    selectedCondominium.id,
                    toUpdateRequest(form),
                );
                setSuccessMessage("Condomínio atualizado com sucesso.");
            }

            closeModal();
            await loadCondominiums();
        } catch (error) {
            if (error instanceof Error) {
                setModalErrorMessage(getFriendlyErrorMessage(error.message));
            } else {
                setModalErrorMessage("Não foi possível salvar o condomínio.");
            }
        } finally {
            setIsSaving(false);
        }
    }

    async function handleToggleStatus(condominium: CondominiumResponse) {
        const nextStatus =
            condominium.status === ACTIVE_STATUS ? INACTIVE_STATUS : ACTIVE_STATUS;

        try {
            setErrorMessage("");
            setSuccessMessage("");

            await updateCondominium(condominium.id, {
                name: condominium.name,
                number: condominium.number,
                address: condominium.address,
                city: condominium.city,
                state: condominium.state,
                emailContact: condominium.emailContact,
                status: nextStatus,
            });

            setSuccessMessage(
                nextStatus === ACTIVE_STATUS
                    ? "Condomínio ativado com sucesso."
                    : "Condomínio desativado com sucesso.",
            );
            await loadCondominiums();
        } catch (error) {
            if (error instanceof Error) {
                setErrorMessage(error.message);
            } else {
                setErrorMessage("Não foi possível alterar o status.");
            }
        }
    }

    async function handleDelete(condominium: CondominiumResponse) {
        const confirmed = window.confirm(
            `Deseja excluir o condomínio ${condominium.name}? Esta ação não pode ser desfeita.`,
        );

        if (!confirmed) {
            return;
        }

        try {
            setErrorMessage("");
            setSuccessMessage("");

            await deleteCondominium(condominium.id);
            setSuccessMessage("Condomínio excluído com sucesso.");
            await loadCondominiums();
        } catch (error) {
            if (error instanceof Error) {
                setErrorMessage(error.message);
            } else {
                setErrorMessage("Não foi possível excluir o condomínio.");
            }
        }
    }

    return (
        <>
            <div className="space-y-7">
                <section className="rounded-[2rem] border border-[#E5E7EB] bg-white p-5 shadow-sm sm:p-6">
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                            <h1 className="text-3xl font-black tracking-tight text-[#111827]">
                                Condomínios
                            </h1>
                            <p className="mt-1 text-sm font-semibold text-[#6B7280]">
                                Gerenciador de condomínios da plataforma.
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={openCreateModal}
                            className="inline-flex h-11 cursor-pointer items-center justify-center rounded-2xl bg-[#16A34A] px-5 text-sm font-extrabold text-white shadow-sm shadow-[#16A34A]/30 transition hover:-translate-y-0.5 hover:bg-[#0B3D2E]"
                        >
                            + Novo Condomínio
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

                    {errorMessage && <FeedbackMessage variant="danger" message={errorMessage} />}
                    {successMessage && (
                        <FeedbackMessage variant="success" message={successMessage} />
                    )}
                    {warningMessage && (
                        <FeedbackMessage variant="warning" message={warningMessage} />
                    )}

                    <div className="mt-6 rounded-[1.5rem] border border-[#E5E7EB] bg-[#F3F4F6] p-4">
                        <div className="mb-4 flex flex-col gap-3 md:flex-row">
                            <input
                                type="search"
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                                placeholder="Buscar condomínio..."
                                className="h-11 flex-1 rounded-2xl border border-[#E5E7EB] bg-white px-4 text-sm font-semibold text-[#111827] outline-none transition placeholder:text-[#9CA3AF] focus:border-[#22C55E] focus:ring-4 focus:ring-[#86EFAC]/30"
                            />

                            <button
                                type="button"
                                onClick={() => setSearch("")}
                                className="h-11 cursor-pointer rounded-2xl border border-[#E5E7EB] bg-white px-5 text-sm font-bold text-[#6B7280] transition hover:bg-[#DCFCE7] hover:text-[#0B3D2E]"
                            >
                                Limpar
                            </button>
                        </div>

                        {isLoading ? (
                            <EmptyState message="Carregando condomínios..." />
                        ) : filteredCondominiums.length === 0 ? (
                            <EmptyState message="Nenhum condomínio encontrado." />
                        ) : (
                            <div className="overflow-x-auto rounded-2xl border border-[#E5E7EB] bg-white">
                                <table className="w-full min-w-[940px] border-collapse text-left text-sm">
                                    <thead className="bg-[#DCFCE7] text-xs uppercase tracking-wide text-[#0B3D2E]">
                                        <tr>
                                            <th className="px-4 py-3 font-extrabold">Condomínio</th>
                                            <th className="px-4 py-3 font-extrabold">Contato</th>
                                            <th className="px-4 py-3 font-extrabold">Localização</th>
                                            <th className="px-4 py-3 font-extrabold">Status</th>
                                            <th className="px-4 py-3 font-extrabold">Cadastro</th>
                                            <th className="px-4 py-3 font-extrabold">Ações</th>
                                        </tr>
                                    </thead>

                                    <tbody className="divide-y divide-[#E5E7EB]">
                                        {filteredCondominiums.map((condominium) => (
                                            <tr
                                                key={condominium.id}
                                                className="transition hover:bg-[#F3F4F6]"
                                            >
                                                <td className="px-4 py-4">
                                                    <p className="font-extrabold text-[#111827]">
                                                        {condominium.name}
                                                    </p>
                                                    <p className="mt-1 text-xs font-semibold text-[#6B7280]">
                                                        CNPJ {formatCnpj(condominium.cnpj)}
                                                    </p>
                                                </td>
                                                <td className="px-4 py-4 font-semibold text-[#6B7280]">
                                                    {condominium.emailContact}
                                                </td>
                                                <td className="px-4 py-4 font-semibold text-[#6B7280]">
                                                    {formatLocation(condominium)}
                                                </td>
                                                <td className="px-4 py-4">
                                                    <StatusBadge
                                                        label={getStatusLabel(condominium.status)}
                                                        variant={getStatusVariant(condominium.status)}
                                                    />
                                                </td>
                                                <td className="px-4 py-4 font-semibold text-[#6B7280]">
                                                    {formatDate(condominium.createdAt)}
                                                </td>
                                                <td className="px-4 py-4">
                                                    <div className="flex flex-wrap gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => openEditModal(condominium)}
                                                            className="rounded-xl border border-[#E5E7EB] bg-white px-3 py-1.5 text-xs font-bold text-[#6B7280] transition hover:bg-[#DCFCE7] hover:text-[#0B3D2E]"
                                                        >
                                                            Editar
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => void handleToggleStatus(condominium)}
                                                            className="rounded-xl border border-[#E5E7EB] bg-white px-3 py-1.5 text-xs font-bold text-[#6B7280] transition hover:bg-[#DCFCE7] hover:text-[#0B3D2E]"
                                                        >
                                                            {condominium.status === ACTIVE_STATUS
                                                                ? "Desativar"
                                                                : "Ativar"}
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => void handleDelete(condominium)}
                                                            className="rounded-xl border border-[#FECACA] bg-white px-3 py-1.5 text-xs font-bold text-[#B42318] transition hover:bg-[#FDECEC]"
                                                        >
                                                            Excluir
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </section>
            </div>

            {modalMode && (
                <CondominiumModal
                    form={form}
                    mode={modalMode}
                    fieldErrors={fieldErrors}
                    errorMessage={modalErrorMessage}
                    isSaving={isSaving}
                    onChange={setForm}
                    onClearFieldError={clearFieldError}
                    onClose={closeModal}
                    onSubmit={handleSubmit}
                />
            )}
        </>
    );
}

function CondominiumModal({
    form,
    mode,
    fieldErrors,
    errorMessage,
    isSaving,
    onChange,
    onClearFieldError,
    onClose,
    onSubmit,
}: {
    form: FormState;
    mode: Exclude<ModalMode, null>;
    fieldErrors: FieldErrors;
    errorMessage: string;
    isSaving: boolean;
    onChange: (form: FormState) => void;
    onClearFieldError: (field: keyof FormState) => void;
    onClose: () => void;
    onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
    const isEdit = mode === "edit";

    function updateField(field: keyof FormState, value: string | number) {
        onChange({
            ...form,
            [field]: value,
        });
        onClearFieldError(field);
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0B3D2E]/30 px-4 py-8 backdrop-blur-sm">
            <form
                onSubmit={onSubmit}
                className="w-full max-w-3xl overflow-hidden rounded-[2rem] border border-[#E5E7EB] bg-white shadow-2xl shadow-[#0B3D2E]/20"
            >
                <div className="flex items-center justify-between border-b border-[#E5E7EB] px-6 py-5">
                    <div>
                        <h2 className="text-2xl font-black text-[#111827]">
                            {isEdit ? "Editar condomínio" : "Novo condomínio"}
                        </h2>
                        <p className="mt-1 text-sm font-semibold text-[#6B7280]">
                            {isEdit
                                ? "Atualize os dados institucionais do condomínio."
                                : "Cadastre o condomínio e o primeiro administrador."}
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className="flex size-10 cursor-pointer items-center justify-center rounded-full bg-[#F3F4F6] text-xl font-light text-[#6B7280] transition hover:bg-[#FDECEC] hover:text-[#B42318]"
                    >
                        x
                    </button>
                </div>

                {errorMessage && (
                    <div className="mx-6 mt-5 rounded-2xl border border-[#FECACA] bg-[#FDECEC] px-4 py-3 text-sm font-bold text-[#B42318]">
                        {errorMessage}
                    </div>
                )}

                <div className="grid max-h-[65vh] grid-cols-1 gap-5 overflow-y-auto px-6 py-6 md:grid-cols-2">
                    <SectionTitle title="Dados do condomínio" />

                    <Field
                        label="Nome do condomínio"
                        value={form.name}
                        error={fieldErrors.name}
                        onChange={(value) => updateField("name", value)}
                    />
                    <Field
                        label="CNPJ"
                        value={form.cnpj}
                        error={fieldErrors.cnpj}
                        disabled={isEdit}
                        onChange={(value) => updateField("cnpj", value)}
                    />
                    <Field
                        label="E-mail de contato"
                        value={form.emailContact}
                        error={fieldErrors.emailContact}
                        onChange={(value) => updateField("emailContact", value)}
                    />
                    <Field
                        label="Número"
                        value={form.number}
                        error={fieldErrors.number}
                        onChange={(value) => updateField("number", value)}
                    />
                    <Field
                        label="Endereço"
                        value={form.address}
                        error={fieldErrors.address}
                        onChange={(value) => updateField("address", value)}
                    />
                    <Field
                        label="Cidade"
                        value={form.city}
                        error={fieldErrors.city}
                        onChange={(value) => updateField("city", value)}
                    />
                    <Field
                        label="Estado"
                        value={form.state}
                        error={fieldErrors.state}
                        maxLength={2}
                        onChange={(value) => updateField("state", value.toUpperCase())}
                    />

                    {isEdit && (
                        <label className="block">
                            <span className="mb-2 block text-sm font-extrabold text-[#111827]">
                                Status
                            </span>
                            <select
                                value={form.status}
                                onChange={(event) =>
                                    updateField("status", Number(event.target.value))
                                }
                                className="h-11 w-full rounded-2xl border border-[#E5E7EB] bg-white px-4 text-sm font-bold text-[#111827] outline-none focus:border-[#22C55E] focus:ring-4 focus:ring-[#86EFAC]/30"
                            >
                                <option value={ACTIVE_STATUS}>Ativo</option>
                                <option value={INACTIVE_STATUS}>Inativo</option>
                            </select>
                        </label>
                    )}

                    {!isEdit && (
                        <>
                            <SectionTitle
                                title="Administrador do condomínio"
                                helper="Este usuário terá acesso ADM ao condomínio cadastrado."
                            />

                            <Field
                                label="Nome do administrador"
                                value={form.adminName}
                                error={fieldErrors.adminName}
                                onChange={(value) => updateField("adminName", value)}
                            />
                            <Field
                                label="CPF"
                                value={form.adminCpf}
                                error={fieldErrors.adminCpf}
                                maxLength={14}
                                onChange={(value) => updateField("adminCpf", value)}
                            />
                            <Field
                                label="Telefone"
                                value={form.adminPhoneNumber}
                                error={fieldErrors.adminPhoneNumber}
                                maxLength={15}
                                onChange={(value) =>
                                    updateField("adminPhoneNumber", value)
                                }
                            />
                            <Field
                                label="E-mail do administrador"
                                value={form.adminEmail}
                                error={fieldErrors.adminEmail}
                                onChange={(value) => updateField("adminEmail", value)}
                            />
                            <Field
                                label="Senha inicial"
                                value={form.adminPassword}
                                error={fieldErrors.adminPassword}
                                type="password"
                                onChange={(value) => updateField("adminPassword", value)}
                            />
                        </>
                    )}
                </div>

                <div className="border-t border-[#E5E7EB] px-6 py-5">
                    <button
                        type="submit"
                        disabled={isSaving}
                        className="h-12 w-full cursor-pointer rounded-2xl bg-[#16A34A] text-sm font-extrabold text-white shadow-sm shadow-[#16A34A]/30 transition hover:bg-[#0B3D2E] disabled:cursor-not-allowed disabled:opacity-70"
                    >
                        {isSaving
                            ? "Salvando..."
                            : isEdit
                                ? "Salvar alterações"
                                : "Cadastrar condomínio e administrador"}
                    </button>
                </div>
            </form>
        </div>
    );
}

function Field({
    label,
    value,
    error,
    disabled = false,
    maxLength,
    type = "text",
    onChange,
}: {
    label: string;
    value: string;
    error?: string;
    disabled?: boolean;
    maxLength?: number;
    type?: "email" | "password" | "text";
    onChange: (value: string) => void;
}) {
    return (
        <label className="block">
            <span className="mb-2 block text-sm font-extrabold text-[#111827]">
                {label}
            </span>
            <input
                type={type}
                value={value}
                disabled={disabled}
                maxLength={maxLength}
                onChange={(event) => onChange(event.target.value)}
                aria-invalid={!!error}
                className={`h-11 w-full rounded-2xl border bg-white px-4 text-sm font-bold text-[#111827] outline-none transition placeholder:text-[#9CA3AF] disabled:bg-[#F3F4F6] disabled:text-[#6B7280] ${
                    error
                        ? "border-[#EF4444] focus:border-[#EF4444] focus:ring-4 focus:ring-[#FECACA]/50"
                        : "border-[#E5E7EB] focus:border-[#22C55E] focus:ring-4 focus:ring-[#86EFAC]/30"
                }`}
            />
            {error && (
                <span className="mt-2 block text-xs font-extrabold text-[#B42318]">
                    {error}
                </span>
            )}
        </label>
    );
}

function SectionTitle({ title, helper }: { title: string; helper?: string }) {
    return (
        <div className="md:col-span-2">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-[#16A34A]">
                {title}
            </p>
            {helper && (
                <p className="mt-1 text-xs font-semibold text-[#6B7280]">
                    {helper}
                </p>
            )}
        </div>
    );
}

function FeedbackMessage({
    message,
    variant,
}: {
    message: string;
    variant: "success" | "warning" | "danger";
}) {
    const classes = {
        success: "border-[#BBF7D0] bg-[#DCFCE7] text-[#0B3D2E]",
        warning: "border-[#FDE68A] bg-[#FFF6DF] text-[#9A6A00]",
        danger: "border-[#FECACA] bg-[#FDECEC] text-[#B42318]",
    };

    return (
        <p className={`mt-5 rounded-2xl border px-4 py-3 text-sm font-bold ${classes[variant]}`}>
            {message}
        </p>
    );
}

function EmptyState({ message }: { message: string }) {
    return (
        <div className="rounded-2xl border border-dashed border-[#D0D5DD] bg-white px-5 py-10 text-center">
            <p className="text-sm font-extrabold text-[#6B7280]">{message}</p>
        </div>
    );
}

function validateForm(form: FormState, mode: ModalMode): FieldErrors {
    const errors: FieldErrors = {};

    if (!form.name.trim()) {
        errors.name = "Informe o nome do condomínio.";
    } else if (form.name.trim().length < 3) {
        errors.name = "Use pelo menos 3 caracteres.";
    }

    if (mode === "create") {
        if (!form.cnpj.trim()) {
            errors.cnpj = "Informe o CNPJ.";
        } else if (!isValidCnpj(form.cnpj)) {
            errors.cnpj = "Informe um CNPJ válido com 14 dígitos.";
        }
    }

    if (!form.emailContact.trim()) {
        errors.emailContact = "Informe o e-mail de contato.";
    } else if (!isValidEmail(form.emailContact)) {
        errors.emailContact = "Informe um e-mail válido.";
    }

    if (!form.number.trim()) {
        errors.number = "Informe o número.";
    }

    if (!form.address.trim()) {
        errors.address = "Informe o endereço.";
    } else if (form.address.trim().length < 3) {
        errors.address = "Use um endereço mais completo.";
    }

    if (!form.city.trim()) {
        errors.city = "Informe a cidade.";
    } else if (form.city.trim().length < 2) {
        errors.city = "Use pelo menos 2 caracteres.";
    }

    if (!form.state.trim()) {
        errors.state = "Informe a UF.";
    } else if (!/^[A-Za-z]{2}$/.test(form.state.trim())) {
        errors.state = "Use a UF com 2 letras. Ex: SP, RS, RJ.";
    }

    if (mode === "create") {
        if (!form.adminName.trim()) {
            errors.adminName = "Informe o nome do administrador.";
        } else if (form.adminName.trim().length < 3) {
            errors.adminName = "Use pelo menos 3 caracteres.";
        }

        if (!form.adminCpf.trim()) {
            errors.adminCpf = "Informe o CPF do administrador.";
        } else if (!isValidCpf(form.adminCpf)) {
            errors.adminCpf = "Informe um CPF válido com 11 dígitos.";
        }

        const phoneDigits = onlyDigits(form.adminPhoneNumber);

        if (!phoneDigits) {
            errors.adminPhoneNumber = "Informe o telefone do administrador.";
        } else if (phoneDigits.length < 10 || phoneDigits.length > 11) {
            errors.adminPhoneNumber = "Informe um telefone válido com DDD.";
        }

        if (!form.adminEmail.trim()) {
            errors.adminEmail = "Informe o e-mail do administrador.";
        } else if (!isValidEmail(form.adminEmail)) {
            errors.adminEmail = "Informe um e-mail válido.";
        }

        if (!form.adminPassword) {
            errors.adminPassword = "Informe uma senha inicial.";
        } else if (!isValidInitialPassword(form.adminPassword)) {
            errors.adminPassword = "Use pelo menos 6 caracteres.";
        }
    }

    return errors;
}

function toCreateRequest(form: FormState): CreateCondominiumRequest {
    return {
        name: form.name.trim(),
        cnpj: onlyDigits(form.cnpj),
        number: form.number.trim(),
        address: form.address.trim(),
        city: form.city.trim(),
        state: form.state.trim().toUpperCase(),
        emailContact: form.emailContact.trim(),
    };
}

function toOnboardingRequest(form: FormState): CreateCondominiumOnboardingRequest {
    return {
        condominium: toCreateRequest(form),
        admin: {
            name: form.adminName.trim(),
            cpf: onlyDigits(form.adminCpf),
            phoneNumber: onlyDigits(form.adminPhoneNumber),
            email: form.adminEmail.trim(),
            password: form.adminPassword,
        },
    };
}

function toUpdateRequest(form: FormState): UpdateCondominiumRequest {
    return {
        name: form.name.trim(),
        number: form.number.trim(),
        address: form.address.trim(),
        city: form.city.trim(),
        state: form.state.trim().toUpperCase(),
        emailContact: form.emailContact.trim(),
        status: form.status,
    };
}

function getStatusLabel(status: number) {
    return status === ACTIVE_STATUS ? "Ativo" : "Inativo";
}

function getStatusVariant(status: number) {
    return status === ACTIVE_STATUS ? ("success" as const) : ("neutral" as const);
}

function formatLocation(condominium: CondominiumResponse) {
    const cityState = [condominium.city, condominium.state]
        .filter(Boolean)
        .join(" - ");

    if (cityState && condominium.address) {
        return `${condominium.address}, ${condominium.number} · ${cityState}`;
    }

    return cityState || condominium.address || "Sem localização";
}

function formatDate(value: string) {
    return new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    }).format(new Date(value));
}

function formatCnpj(value: string) {
    const digits = onlyDigits(value);

    if (digits.length !== 14) {
        return value || "não informado";
    }

    return digits.replace(
        /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
        "$1.$2.$3/$4-$5",
    );
}

function onlyDigits(value: string) {
    return value.replace(/\D/g, "");
}

function isValidEmail(value: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function isValidInitialPassword(value: string) {
    return value.trim().length >= 6;
}

function isValidCpf(value: string) {
    const cpf = onlyDigits(value);

    if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) {
        return false;
    }

    const calculateDigit = (base: string, factor: number) => {
        const sum = base
            .split("")
            .reduce((total, digit) => total + Number(digit) * factor--, 0);
        const remainder = (sum * 10) % 11;
        return remainder === 10 ? 0 : remainder;
    };

    const firstDigit = calculateDigit(cpf.slice(0, 9), 10);
    const secondDigit = calculateDigit(cpf.slice(0, 10), 11);

    return cpf.endsWith(`${firstDigit}${secondDigit}`);
}

function isValidCnpj(value: string) {
    const cnpj = onlyDigits(value);

    if (cnpj.length !== 14 || /^(\d)\1+$/.test(cnpj)) {
        return false;
    }

    const calculateDigit = (base: string, weights: number[]) => {
        const sum = base
            .split("")
            .reduce((total, digit, index) => total + Number(digit) * weights[index], 0);
        const remainder = sum % 11;
        return remainder < 2 ? 0 : 11 - remainder;
    };

    const firstDigit = calculateDigit(cnpj.slice(0, 12), [
        5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2,
    ]);
    const secondDigit = calculateDigit(cnpj.slice(0, 13), [
        6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2,
    ]);

    return cnpj.endsWith(`${firstDigit}${secondDigit}`);
}

function getFriendlyErrorMessage(message: string) {
    const normalizedMessage = message.toLowerCase();

    if (normalizedMessage.includes("cnpj")) {
        return "Este CNPJ já está cadastrado ou não pôde ser aceito pela API.";
    }

    if (normalizedMessage.includes("cpf")) {
        return "Este CPF já está cadastrado ou não pôde ser aceito pela API.";
    }

    if (normalizedMessage.includes("email")) {
        return "Este e-mail já está cadastrado ou não pôde ser aceito pela API.";
    }

    if (normalizedMessage.includes("password") || normalizedMessage.includes("senha")) {
        return "A senha inicial não atende aos requisitos de segurança.";
    }

    return message || "Não foi possível salvar o condomínio.";
}
