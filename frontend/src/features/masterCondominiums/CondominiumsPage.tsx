import { useEffect, useMemo, useState, type Dispatch, type FormEvent, type SetStateAction } from "react";
import { useNavigate } from "react-router-dom";
import { MetricCard } from "../../shared/components/MetricCard";
import { StatusBadge } from "../../shared/components/StatusBadge";
import {
    deleteCondominium,
    getCondominiums,
    onboardCondominium,
    removeCondominiumAdmin,
    updateCondominium,
    updateCondominiumAdmin,
} from "../condominiums/condominiumService";
import type {
    CreateCondominiumOnboardingRequest,
    CondominiumResponse,
    CreateCondominiumRequest,
    UpdateCondominiumRequest,
} from "../condominiums/types";
import { getInvitationsByCondominium } from "../invitations/invitationService";
import { createInvitation } from "../invitations/invitationService";
import type { InvitationResponse } from "../invitations/types";
import { getMasterUsers } from "../masterUsers/masterUserService";
import type { MasterUserResponse } from "../masterUsers/types";
import { createPerson } from "../persons/personService";

const ACTIVE_STATUS = 1;
const INACTIVE_STATUS = 2;
const PENDING_INVITATION_STATUS = 1;
const ADMIN_ROLE = 2;

const BRAZILIAN_STATES = [
    "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG",
    "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
];

type ViaCepResponse = {
    cep: string;
    logradouro: string;
    bairro: string;
    localidade: string;
    uf: string;
    erro?: boolean;
};

type ModalMode = "create" | "edit" | null;

type FormState = {
    name: string;
    cnpj: string;
    cep: string;
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
    linkedAdminUserId: string;
};

type FieldErrors = Partial<Record<keyof FormState, string>>;

type CreateAdminInvitationRequest = {
    condominiumId: number;
    name: string;
    cpf: string;
    phoneNumber: string;
    email: string;
};

const emptyForm: FormState = {
    name: "",
    cnpj: "",
    cep: "",
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
    linkedAdminUserId: "",
};

export function CondominiumsPage() {
    const navigate = useNavigate();

    const [condominiums, setCondominiums] = useState<CondominiumResponse[]>([]);
    const [invitations, setInvitations] = useState<InvitationResponse[]>([]);
    const [adminUsers, setAdminUsers] = useState<MasterUserResponse[]>([]);
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
    const [detailsCondominium, setDetailsCondominium] =
        useState<CondominiumResponse | null>(null);
    const [adminInviteCondominium, setAdminInviteCondominium] =
        useState<CondominiumResponse | null>(null);
    const [form, setForm] = useState<FormState>(emptyForm);

    async function loadCondominiums() {
        try {
            setIsLoading(true);
            setErrorMessage("");
            setWarningMessage("");

            const [condominiumResult, masterUsersResult] = await Promise.all([
                getCondominiums(),
                getMasterUsers(),
            ]);
            setCondominiums(condominiumResult);
            setAdminUsers(masterUsersResult);

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
            setAdminUsers([]);

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

    const uniqueAdminUsers = useMemo(() => getUniqueAdmins(adminUsers), [adminUsers]);

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
            helper: "Cadastros na plataforma",
        },
        {
            label: "Aguardando aceite",
            value: pendingAdminInvitations.length.toString(),
            helper: "Admins aguardando vínculo",
        },
        {
            label: "Ativos",
            value: activeCondominiums.length.toString(),
            helper: "Condomínios em operação",
        },
        {
            label: "Inativos",
            value: inactiveCondominiums.length.toString(),
            helper: "Acessos pausados",
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
            cep: condominium.cep || "",
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
            linkedAdminUserId: condominium.adminUserId?.toString() ?? "",
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
                setSuccessMessage("Condomínio cadastrado e convite do Admin gerado com sucesso.");
            }

            if (modalMode === "edit" && selectedCondominium) {
                await updateCondominium(
                    selectedCondominium.id,
                    toUpdateRequest(form),
                );

                const nextAdminUserId = Number(form.linkedAdminUserId);
                const currentAdminUserId = selectedCondominium.adminUserId ?? null;

                if (nextAdminUserId && nextAdminUserId !== currentAdminUserId) {
                    await updateCondominiumAdmin(selectedCondominium.id, {
                        adminUserId: nextAdminUserId,
                    });
                }

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
                cep: condominium.cep || "",
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

    async function handleRemoveAdmin(condominium: CondominiumResponse) {
        const confirmed = window.confirm(
            `Deseja remover o Admin ativo de ${condominium.name}? O acesso administrativo será suspenso.`,
        );

        if (!confirmed) {
            return;
        }

        try {
            setIsSaving(true);
            setModalErrorMessage("");
            setSuccessMessage("");

            await removeCondominiumAdmin(condominium.id);
            setForm((current) => ({
                ...current,
                linkedAdminUserId: "",
            }));
            setSuccessMessage("Admin removido do condomínio com sucesso.");
            await loadCondominiums();
        } catch (error) {
            if (error instanceof Error) {
                setModalErrorMessage(getFriendlyErrorMessage(error.message));
            } else {
                setModalErrorMessage("Não foi possível remover o Admin vinculado.");
            }
        } finally {
            setIsSaving(false);
        }
    }

    async function handleCreateAdminInvitation(data: CreateAdminInvitationRequest) {
        try {
            setIsSaving(true);
            setModalErrorMessage("");
            setSuccessMessage("");

            const person = await createPerson({
                name: data.name,
                cpf: onlyDigits(data.cpf),
                phoneNumber: onlyDigits(data.phoneNumber),
            });

            await createInvitation({
                condominiumId: data.condominiumId,
                personId: person.id,
                email: data.email.trim(),
                role: ADMIN_ROLE,
            });

            setAdminInviteCondominium(null);
            closeModal();
            setSuccessMessage("Convite de Admin gerado com sucesso.");
            await loadCondominiums();
            navigate("/master/invitations");
        } catch (error) {
            if (error instanceof Error) {
                setModalErrorMessage(getFriendlyErrorMessage(error.message));
            } else {
                setModalErrorMessage("Não foi possível gerar o convite de Admin.");
            }
        } finally {
            setIsSaving(false);
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
                        <div className="mb-4">
                            <div className="relative">
                                <input
                                    type="text"
                                    value={search}
                                    onChange={(event) => setSearch(event.target.value)}
                                    placeholder="Buscar condomínio..."
                                    className="h-11 w-full rounded-2xl border border-[#E5E7EB] bg-white px-4 pr-12 text-sm font-semibold text-[#111827] outline-none transition placeholder:text-[#9CA3AF] focus:border-[#22C55E] focus:ring-4 focus:ring-[#86EFAC]/30"
                                />

                                {search && (
                                    <button
                                        type="button"
                                        aria-label="Limpar busca"
                                        onClick={() => setSearch("")}
                                        className="absolute right-2 top-1/2 flex size-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full text-lg font-black leading-none text-[#6B7280] transition hover:bg-[#DCFCE7] hover:text-[#0B3D2E] focus:outline-none focus:ring-4 focus:ring-[#86EFAC]/30"
                                    >
                                        ×
                                    </button>
                                )}
                            </div>
                        </div>

                        {isLoading ? (
                            <EmptyState message="Carregando condomínios..." />
                        ) : filteredCondominiums.length === 0 ? (
                            <EmptyState message="Nenhum condomínio encontrado." />
                        ) : (
                            <div className="overflow-x-auto rounded-2xl border border-[#E5E7EB] bg-white">
                                <table className="w-full min-w-[1080px] border-collapse text-left text-sm">
                                    <thead className="bg-[#DCFCE7] text-xs uppercase tracking-wide text-[#0B3D2E]">
                                        <tr>
                                            <th className="px-4 py-3 font-extrabold">Condomínio</th>
                                            <th className="px-4 py-3 font-extrabold">Contato</th>
                                            <th className="px-4 py-3 font-extrabold">Admins vinculados</th>
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
                                                <td className="px-4 py-4">
                                                    <p className="font-semibold text-[#6B7280]">
                                                        {condominium.emailContact}
                                                    </p>
                                                </td>
                                                <td className="px-4 py-4">
                                                    <AdminSummary
                                                        admins={getCondominiumAdmins(
                                                            condominium.id,
                                                            adminUsers,
                                                        )}
                                                    />
                                                </td>
                                                <td className="px-4 py-4">
                                                    <p className="font-semibold text-[#6B7280]">
                                                        {formatLocation(condominium)}
                                                    </p>
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
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => setDetailsCondominium(condominium)}
                                                            className="cursor-pointer rounded-xl border border-[#E5E7EB] bg-white px-3 py-1.5 text-xs font-bold text-[#6B7280] transition hover:bg-[#DCFCE7] hover:text-[#0B3D2E]"
                                                        >
                                                            Ver
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => openEditModal(condominium)}
                                                            className="cursor-pointer rounded-xl border border-[#E5E7EB] bg-white px-3 py-1.5 text-xs font-bold text-[#6B7280] transition hover:bg-[#DCFCE7] hover:text-[#0B3D2E]"
                                                        >
                                                            Editar
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => void handleToggleStatus(condominium)}
                                                            className="cursor-pointer rounded-xl border border-[#E5E7EB] bg-white px-3 py-1.5 text-xs font-bold text-[#6B7280] transition hover:bg-[#DCFCE7] hover:text-[#0B3D2E]"
                                                        >
                                                            {condominium.status === ACTIVE_STATUS
                                                                ? "Desativar"
                                                                : "Ativar"}
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => void handleDelete(condominium)}
                                                            className="cursor-pointer rounded-xl border border-[#FECACA] bg-white px-3 py-1.5 text-xs font-bold text-[#B42318] transition hover:bg-[#FDECEC]"
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
                    adminUsers={uniqueAdminUsers}
                    fieldErrors={fieldErrors}
                    errorMessage={modalErrorMessage}
                    isSaving={isSaving}
                    onChange={setForm}
                    onClearFieldError={clearFieldError}
                    onClose={closeModal}
                    onAddAdmin={() => {
                        if (selectedCondominium) {
                            setAdminInviteCondominium(selectedCondominium);
                        }
                    }}
                    onRemoveAdmin={() => {
                        if (selectedCondominium) {
                            void handleRemoveAdmin(selectedCondominium);
                        }
                    }}
                    onSubmit={handleSubmit}
                />
            )}

            {adminInviteCondominium && (
                <CreateAdminInvitationModal
                    condominium={adminInviteCondominium}
                    isSaving={isSaving}
                    errorMessage={modalErrorMessage}
                    onClose={() => setAdminInviteCondominium(null)}
                    onConfirm={handleCreateAdminInvitation}
                />
            )}

            {detailsCondominium && (
                <CondominiumDetailsModal
                    condominium={detailsCondominium}
                    admins={getCondominiumAdmins(detailsCondominium.id, adminUsers)}
                    onClose={() => setDetailsCondominium(null)}
                    onEdit={() => {
                        const condominium = detailsCondominium;
                        setDetailsCondominium(null);
                        openEditModal(condominium);
                    }}
                />
            )}
        </>
    );
}

function CreateAdminInvitationModal({
    condominium,
    isSaving,
    errorMessage,
    onClose,
    onConfirm,
}: {
    condominium: CondominiumResponse;
    isSaving: boolean;
    errorMessage: string;
    onClose: () => void;
    onConfirm: (data: CreateAdminInvitationRequest) => Promise<void>;
}) {
    const [form, setForm] = useState({
        name: "",
        cpf: "",
        phoneNumber: "",
        email: "",
    });
    const [localError, setLocalError] = useState("");

    function updateField(field: keyof typeof form, value: string) {
        setForm((current) => ({
            ...current,
            [field]: value,
        }));
        setLocalError("");
    }

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (form.name.trim().length < 3) {
            setLocalError("Informe o nome completo do Admin.");
            return;
        }

        if (!isValidCpf(form.cpf)) {
            setLocalError("Informe um CPF válido.");
            return;
        }

        const phoneDigits = onlyDigits(form.phoneNumber);

        if (phoneDigits.length < 10 || phoneDigits.length > 11) {
            setLocalError("Informe um telefone válido com DDD.");
            return;
        }

        if (!isValidEmail(form.email)) {
            setLocalError("Informe um e-mail válido.");
            return;
        }

        await onConfirm({
            condominiumId: condominium.id,
            name: form.name.trim(),
            cpf: form.cpf,
            phoneNumber: form.phoneNumber,
            email: form.email.trim(),
        });
    }

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#0B3D2E]/40 px-4 py-8 backdrop-blur-sm">
            <form
                onSubmit={handleSubmit}
                className="w-full max-w-2xl overflow-hidden rounded-[2rem] border border-[#E5E7EB] bg-white shadow-2xl shadow-[#0B3D2E]/20"
            >
                <div className="flex items-center justify-between border-b border-[#E5E7EB] px-6 py-5">
                    <div>
                        <h2 className="text-2xl font-black text-[#111827]">
                            Novo Admin
                        </h2>
                        <p className="mt-1 text-sm font-semibold text-[#6B7280]">
                            Gere um convite administrativo para {condominium.name}.
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

                {(localError || errorMessage) && (
                    <div className="mx-6 mt-5 rounded-2xl border border-[#FECACA] bg-[#FDECEC] px-4 py-3 text-sm font-bold text-[#B42318]">
                        {localError || errorMessage}
                    </div>
                )}

                <div className="grid grid-cols-1 gap-4 px-6 py-6 md:grid-cols-2">
                    <SimpleField
                        label="Nome"
                        value={form.name}
                        placeholder="Nome do Admin"
                        onChange={(value) => updateField("name", value)}
                    />
                    <SimpleField
                        label="CPF"
                        value={form.cpf}
                        placeholder="Somente números"
                        maxLength={14}
                        onChange={(value) => updateField("cpf", value)}
                    />
                    <SimpleField
                        label="Telefone"
                        value={form.phoneNumber}
                        placeholder="DDD + número"
                        maxLength={15}
                        onChange={(value) => updateField("phoneNumber", value)}
                    />
                    <SimpleField
                        label="E-mail"
                        value={form.email}
                        placeholder="admin@email.com"
                        type="email"
                        onChange={(value) => updateField("email", value)}
                    />
                </div>

                <div className="border-t border-[#E5E7EB] px-6 py-5">
                    <button
                        type="submit"
                        disabled={isSaving}
                        className="h-12 w-full cursor-pointer rounded-2xl bg-[#16A34A] text-sm font-extrabold text-white shadow-lg shadow-[#16A34A]/20 transition hover:bg-[#0B3D2E] disabled:cursor-not-allowed disabled:opacity-70"
                    >
                        {isSaving ? "Gerando convite..." : "Gerar convite de Admin"}
                    </button>
                </div>
            </form>
        </div>
    );
}

function CondominiumModal({
    form,
    mode,
    adminUsers,
    fieldErrors,
    errorMessage,
    isSaving,
    onChange,
    onClearFieldError,
    onClose,
    onAddAdmin,
    onRemoveAdmin,
    onSubmit,
}: {
    form: FormState;
    mode: Exclude<ModalMode, null>;
    adminUsers: MasterUserResponse[];
    fieldErrors: FieldErrors;
    errorMessage: string;
    isSaving: boolean;
    onChange: Dispatch<SetStateAction<FormState>>;
    onClearFieldError: (field: keyof FormState) => void;
    onClose: () => void;
    onAddAdmin: () => void;
    onRemoveAdmin: () => void;
    onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
    const isEdit = mode === "edit";
    const [isLoadingCep, setIsLoadingCep] = useState(false);
    const [cepMessage, setCepMessage] = useState("");

    function updateField(field: keyof FormState, value: string | number) {
        onChange((currentForm) => ({
            ...currentForm,
            [field]: value,
        }));
        onClearFieldError(field);
    }

    async function handleCepChange(value: string) {
        const nextCep = formatCepInput(value);
        setCepMessage("");
        onClearFieldError("cep");

        onChange((currentForm) => ({
            ...currentForm,
            cep: nextCep,
        }));

        const cepDigits = onlyDigits(nextCep);

        if (cepDigits.length !== 8) {
            return;
        }

        try {
            setIsLoadingCep(true);
            const address = await getAddressByCep(cepDigits);

            if (!address) {
                setCepMessage("CEP não encontrado. Preencha o endereço manualmente.");
                return;
            }

            onChange((currentForm) => ({
                ...currentForm,
                cep: nextCep,
                address: address.logradouro || currentForm.address,
                city: address.localidade || currentForm.city,
                state: address.uf || currentForm.state,
            }));
            onClearFieldError("address");
            onClearFieldError("city");
            onClearFieldError("state");
        } catch {
            setCepMessage("Não foi possível consultar o CEP agora. Preencha manualmente.");
        } finally {
            setIsLoadingCep(false);
        }
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

                <div className="grid max-h-[65vh] grid-cols-1 gap-5 overflow-y-auto px-6 pb-6 pt-6 md:grid-cols-2">
                    <SectionTitle title="Dados do condomínio" />

                    <Field
                        label="Nome do condomínio"
                        value={form.name}
                        placeholder="Residencial Jardim"
                        error={fieldErrors.name}
                        onChange={(value) => updateField("name", value)}
                    />
                    <Field
                        label="CNPJ"
                        value={form.cnpj}
                        error={fieldErrors.cnpj}
                        disabled={isEdit}
                        placeholder="00.000.000/0000-00"
                        maxLength={18}
                        onChange={(value) => updateField("cnpj", formatCnpjInput(value))}
                    />
                        <Field
                            label="E-mail de contato"
                            value={form.emailContact}
                            placeholder="contato@condominio.com.br"
                            error={fieldErrors.emailContact}
                            onChange={(value) => updateField("emailContact", value)}
                        />
                    <Field
                        label="CEP"
                        value={form.cep}
                        error={fieldErrors.cep}
                        helper={isLoadingCep ? "Buscando endereço..." : cepMessage}
                        placeholder="00000-000"
                        maxLength={9}
                        onChange={handleCepChange}
                    />
                        <Field
                            label="Endereço"
                            value={form.address}
                            placeholder="Rua das Palmeiras"
                            error={fieldErrors.address}
                            onChange={(value) => updateField("address", value)}
                        />
                    <Field
                        label="Número"
                        value={form.number}
                        placeholder="100"
                        error={fieldErrors.number}
                        onChange={(value) => updateField("number", value)}
                    />
                    <Field
                        label="Cidade"
                        value={form.city}
                        placeholder="São Paulo"
                        error={fieldErrors.city}
                        onChange={(value) => updateField("city", value)}
                    />
                    <SelectField
                        label="Estado"
                        value={form.state}
                        placeholder="Selecione a UF"
                        error={fieldErrors.state}
                        options={BRAZILIAN_STATES}
                        onChange={(value) => updateField("state", value)}
                    />

                    {isEdit && (
                        <>
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

                            <div className="md:col-span-2">
                                <span className="mb-2 block text-sm font-extrabold text-[#111827]">
                                    Admin vinculado
                                </span>
                                <div className="flex flex-col gap-3 sm:flex-row">
                                    <select
                                    value={form.linkedAdminUserId}
                                    onChange={(event) =>
                                        updateField("linkedAdminUserId", event.target.value)
                                    }
                                        className="h-11 flex-1 rounded-2xl border border-[#E5E7EB] bg-white px-4 text-sm font-bold text-[#111827] outline-none focus:border-[#22C55E] focus:ring-4 focus:ring-[#86EFAC]/30"
                                >
                                    <option value="">Sem Admin ativo</option>
                                    {adminUsers.map((admin) => (
                                        <option key={admin.userId} value={admin.userId}>
                                            {admin.personName} - {admin.email}
                                        </option>
                                    ))}
                                    </select>

                                    <button
                                        type="button"
                                        onClick={onAddAdmin}
                                        className="h-11 cursor-pointer rounded-2xl bg-[#16A34A] px-4 text-sm font-extrabold text-white shadow-sm shadow-[#16A34A]/20 transition hover:bg-[#0B3D2E]"
                                    >
                                        + Admin
                                    </button>

                                    <button
                                        type="button"
                                        onClick={onRemoveAdmin}
                                        disabled={!form.linkedAdminUserId || isSaving}
                                        className="h-11 cursor-pointer rounded-2xl border border-[#FECACA] bg-white px-4 text-sm font-extrabold text-[#B42318] transition hover:bg-[#FDECEC] disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        Remover
                                    </button>
                                </div>
                                <span className="mt-2 block text-xs font-semibold text-[#6B7280]">
                                    Ao trocar ou remover, o Admin anterior perde o vínculo ativo deste condomínio.
                                </span>
                            </div>
                        </>
                    )}

                    {!isEdit && (
                        <>
                            <SectionTitle
                                title="Administrador do condomínio"
                            />

                            <Field
                                label="Nome do administrador"
                                value={form.adminName}
                                placeholder="Carlos Martins"
                                error={fieldErrors.adminName}
                                onChange={(value) => updateField("adminName", value)}
                            />
                            <Field
                                label="CPF"
                        value={form.adminCpf}
                        error={fieldErrors.adminCpf}
                        maxLength={14}
                        placeholder="000.000.000-00"
                        onChange={(value) => updateField("adminCpf", formatCpfInput(value))}
                            />
                            <Field
                                label="Telefone"
                                value={form.adminPhoneNumber}
                        error={fieldErrors.adminPhoneNumber}
                        maxLength={15}
                        placeholder="(11) 99999-9999"
                        onChange={(value) =>
                            updateField("adminPhoneNumber", formatPhoneInput(value))
                        }
                            />
                            <Field
                                label="E-mail do administrador"
                        value={form.adminEmail}
                        error={fieldErrors.adminEmail}
                        placeholder="admin@email.com"
                        onChange={(value) => updateField("adminEmail", value)}
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
                                : "Cadastrar condomínio e gerar convite"}
                    </button>
                </div>
            </form>
        </div>
    );
}

function AdminSummary({ admins }: { admins: MasterUserResponse[] }) {
    if (admins.length === 0) {
        return (
            <span className="font-semibold text-[#6B7280]">
                Sem Admin vinculado
            </span>
        );
    }

    return (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            {admins.map((admin, index) => (
                <span
                    key={`${admin.condominiumId}-${admin.userId}`}
                    className="font-semibold text-[#111827]"
                >
                    {admin.personName}{index < admins.length - 1 ? "," : ""}
                </span>
            ))}
        </div>
    );
}

function CondominiumDetailsModal({
    condominium,
    admins,
    onClose,
    onEdit,
}: {
    condominium: CondominiumResponse;
    admins: MasterUserResponse[];
    onClose: () => void;
    onEdit: () => void;
}) {
    const activeAdmins = admins.filter((admin) => admin.status === ACTIVE_STATUS);
    const suspendedAdmins = admins.filter((admin) => admin.status !== ACTIVE_STATUS);
    const latestAdminAccess = admins
        .map((admin) => admin.accessCreatedAt)
        .sort((first, second) => new Date(second).getTime() - new Date(first).getTime())[0];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0B3D2E]/30 px-4 py-8 backdrop-blur-sm">
            <div className="w-full max-w-5xl overflow-hidden rounded-[2rem] border border-[#E5E7EB] bg-white shadow-2xl shadow-[#0B3D2E]/20">
                <div className="flex flex-col gap-4 border-b border-[#E5E7EB] px-6 py-5 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <p className="text-xs font-black uppercase tracking-[0.22em] text-[#16A34A]">
                            Condomínio
                        </p>
                        <h2 className="mt-2 text-2xl font-black text-[#111827]">
                            {condominium.name}
                        </h2>
                        <p className="mt-1 text-sm font-semibold text-[#6B7280]">
                            CNPJ {formatCnpj(condominium.cnpj)}
                        </p>
                    </div>

                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={onEdit}
                            className="h-10 cursor-pointer rounded-2xl bg-[#16A34A] px-4 text-sm font-extrabold text-white transition hover:bg-[#0B3D2E]"
                        >
                            Editar
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex size-10 cursor-pointer items-center justify-center rounded-full bg-[#F3F4F6] text-xl font-light text-[#6B7280] transition hover:bg-[#FDECEC] hover:text-[#B42318]"
                        >
                            x
                        </button>
                    </div>
                </div>

                <div className="max-h-[75vh] overflow-y-auto px-6 py-6">
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                        <InfoCard title="Dados institucionais">
                            <DetailRow label="Nome" value={condominium.name} />
                            <DetailRow label="CNPJ" value={formatCnpj(condominium.cnpj)} />
                            <DetailRow label="Status" value={getStatusLabel(condominium.status)} />
                            <DetailRow label="Cadastro" value={formatDate(condominium.createdAt)} />
                        </InfoCard>

                        <InfoCard title="Gestão">
                            <DetailRow label="E-mail" value={condominium.emailContact} />
                            <DetailRow label="Admins ativos" value={activeAdmins.length.toString()} />
                            <DetailRow label="Admins suspensos" value={suspendedAdmins.length.toString()} />
                            <DetailRow
                                label="Último vínculo"
                                value={latestAdminAccess ? formatDate(latestAdminAccess) : "Sem vínculo"}
                            />
                        </InfoCard>

                        <InfoCard title="Localização">
                            <DetailRow label="Endereço" value={condominium.address} />
                            <DetailRow label="Número" value={condominium.number} />
                            <DetailRow label="Cidade" value={condominium.city} />
                            <DetailRow label="Estado" value={condominium.state} />
                        </InfoCard>
                    </div>

                    <div className="mt-5 rounded-[1.5rem] border border-[#E5E7EB] bg-[#F3F4F6] p-4">
                        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                            <div>
                                <h3 className="text-xl font-black text-[#111827]">
                                    Admins vinculados
                                </h3>
                                <p className="mt-1 text-sm font-semibold text-[#6B7280]">
                                    Acessos administrativos cadastrados para este condomínio.
                                </p>
                            </div>
                            <span className="rounded-full bg-white px-3 py-1 text-xs font-extrabold text-[#0B3D2E]">
                                {admins.length} vínculo(s)
                            </span>
                        </div>

                        {admins.length === 0 ? (
                            <div className="mt-4 rounded-2xl border border-dashed border-[#D0D5DD] bg-white px-5 py-8 text-center">
                                <p className="text-sm font-extrabold text-[#6B7280]">
                                    Nenhum Admin vinculado ainda.
                                </p>
                            </div>
                        ) : (
                            <div className="mt-4 overflow-x-auto rounded-2xl border border-[#E5E7EB] bg-white">
                                <table className="w-full min-w-[760px] border-collapse text-left text-sm">
                                    <thead className="bg-[#DCFCE7] text-xs uppercase tracking-wide text-[#0B3D2E]">
                                        <tr>
                                            <th className="px-4 py-3 font-extrabold">Admin</th>
                                            <th className="px-4 py-3 font-extrabold">E-mail</th>
                                            <th className="px-4 py-3 font-extrabold">Status</th>
                                            <th className="px-4 py-3 font-extrabold">Vínculo criado em</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#E5E7EB]">
                                        {admins.map((admin) => (
                                            <tr key={`${admin.condominiumId}-${admin.userId}`}>
                                                <td className="px-4 py-4 font-extrabold text-[#111827]">
                                                    {admin.personName}
                                                </td>
                                                <td className="px-4 py-4 font-semibold text-[#6B7280]">
                                                    {admin.email}
                                                </td>
                                                <td className="px-4 py-4">
                                                    <StatusBadge
                                                        label={getAccessStatusLabel(admin.status)}
                                                        variant={getAccessStatusVariant(admin.status)}
                                                    />
                                                </td>
                                                <td className="px-4 py-4 font-semibold text-[#6B7280]">
                                                    {formatDate(admin.accessCreatedAt)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function InfoCard({
    title,
    children,
}: {
    title: string;
    children: React.ReactNode;
}) {
    return (
        <div className="rounded-[1.5rem] border border-[#E5E7EB] bg-[#F9FAFB] p-4">
            <h3 className="text-sm font-black uppercase tracking-[0.18em] text-[#16A34A]">
                {title}
            </h3>
            <div className="mt-4 space-y-3">{children}</div>
        </div>
    );
}

function DetailRow({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <p className="text-xs font-extrabold uppercase tracking-wide text-[#9CA3AF]">
                {label}
            </p>
            <p className="mt-1 text-sm font-extrabold text-[#111827]">
                {value || "Não informado"}
            </p>
        </div>
    );
}

function Field({
    label,
    value,
    error,
    helper,
    disabled = false,
    maxLength,
    placeholder,
    type = "text",
    onChange,
}: {
    label: string;
    value: string;
    error?: string;
    helper?: string;
    disabled?: boolean;
    maxLength?: number;
    placeholder?: string;
    type?: "email" | "password" | "text";
    onChange: (value: string) => void | Promise<void>;
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
                placeholder={placeholder}
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
            {!error && helper && (
                <span className="mt-2 block text-xs font-bold text-[#6B7280]">
                    {helper}
                </span>
            )}
        </label>
    );
}

function SelectField({
    label,
    value,
    error,
    placeholder,
    options,
    onChange,
}: {
    label: string;
    value: string;
    error?: string;
    placeholder: string;
    options: string[];
    onChange: (value: string) => void;
}) {
    const [isOpen, setIsOpen] = useState(false);
    const selectedLabel = value || placeholder;

    function selectOption(option: string) {
        onChange(option);
        setIsOpen(false);
    }

    return (
        <div className="relative block">
            <span className="mb-2 block text-sm font-extrabold text-[#111827]">
                {label}
            </span>
            <button
                type="button"
                aria-invalid={!!error}
                aria-expanded={isOpen}
                onClick={() => setIsOpen((current) => !current)}
                className={`flex h-11 w-full cursor-pointer items-center justify-between rounded-2xl border bg-white px-4 text-left text-sm font-bold outline-none transition ${
                    error
                        ? "border-[#EF4444] text-[#111827] focus:ring-4 focus:ring-[#FECACA]/50"
                        : isOpen
                            ? "border-[#22C55E] text-[#111827] ring-4 ring-[#86EFAC]/30"
                            : "border-[#E5E7EB] text-[#111827] hover:border-[#BBF7D0]"
                }`}
            >
                <span className={value ? "text-[#111827]" : "text-[#9CA3AF]"}>
                    {selectedLabel}
                </span>
                <span
                    className={`block size-2 shrink-0 border-r-2 border-b-2 border-current text-[#6B7280] transition-transform ${
                        isOpen ? "rotate-[225deg] translate-y-0.5" : "rotate-45 -translate-y-0.5"
                    }`}
                    aria-hidden="true"
                />
            </button>

            {isOpen && (
                <div className="absolute left-0 top-[4.75rem] z-[80] max-h-64 w-full overflow-y-auto rounded-2xl border border-[#E5E7EB] bg-white p-1 shadow-xl shadow-[#111827]/10">
                    <button
                        type="button"
                        onClick={() => selectOption("")}
                        className={`flex h-10 w-full cursor-pointer items-center rounded-xl px-3 text-left text-sm font-extrabold transition ${
                            !value
                                ? "bg-[#DCFCE7] text-[#0B3D2E]"
                                : "text-[#6B7280] hover:bg-[#F0FDF4] hover:text-[#0B3D2E]"
                        }`}
                    >
                        {placeholder}
                    </button>
                    {options.map((option) => {
                        const isSelected = value === option;

                        return (
                            <button
                                key={option}
                                type="button"
                                onClick={() => selectOption(option)}
                                className={`flex h-10 w-full cursor-pointer items-center rounded-xl px-3 text-left text-sm font-extrabold transition ${
                                    isSelected
                                        ? "bg-[#DCFCE7] text-[#0B3D2E]"
                                        : "text-[#6B7280] hover:bg-[#F0FDF4] hover:text-[#0B3D2E]"
                                }`}
                            >
                                {option}
                            </button>
                        );
                    })}
                </div>
            )}

            {error && (
                <span className="mt-2 block text-xs font-extrabold text-[#B42318]">
                    {error}
                </span>
            )}
        </div>
    );
}

function SimpleField({
    label,
    value,
    placeholder,
    type = "text",
    maxLength,
    onChange,
}: {
    label: string;
    value: string;
    placeholder: string;
    type?: "email" | "text";
    maxLength?: number;
    onChange: (value: string) => void;
}) {
    return (
        <label className="block">
            <span className="mb-2 block text-sm font-extrabold text-[#111827]">
                {label}
            </span>
            <input
                required
                type={type}
                value={value}
                maxLength={maxLength}
                onChange={(event) => onChange(event.target.value)}
                placeholder={placeholder}
                className="h-11 w-full rounded-2xl border border-[#E5E7EB] bg-white px-4 text-sm font-bold text-[#111827] outline-none transition placeholder:text-[#9CA3AF] focus:border-[#22C55E] focus:ring-4 focus:ring-[#86EFAC]/30"
            />
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
            errors.cnpj = "CNPJ inválido. Use um CNPJ real, com dígitos verificadores válidos.";
        }

        if (!form.cep.trim()) {
            errors.cep = "Informe o CEP.";
        } else if (!isValidCep(form.cep)) {
            errors.cep = "Informe um CEP válido com 8 dígitos.";
        }
    } else if (form.cep.trim() && !isValidCep(form.cep)) {
        errors.cep = "Informe um CEP válido com 8 dígitos.";
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
        errors.state = "Selecione a UF.";
    } else if (!BRAZILIAN_STATES.includes(form.state.trim().toUpperCase())) {
        errors.state = "Selecione uma UF válida.";
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
            errors.adminCpf = "CPF inválido. Use um CPF real, com dígitos verificadores válidos.";
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

    }

    return errors;
}

function toCreateRequest(form: FormState): CreateCondominiumRequest {
    return {
        name: form.name.trim(),
        cnpj: onlyDigits(form.cnpj),
        cep: onlyDigits(form.cep),
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
        },
    };
}

function toUpdateRequest(form: FormState): UpdateCondominiumRequest {
    return {
        name: form.name.trim(),
        cep: onlyDigits(form.cep),
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

function getAccessStatusLabel(status: number) {
    return status === ACTIVE_STATUS ? "Ativo" : "Suspenso";
}

function getAccessStatusVariant(status: number) {
    return status === ACTIVE_STATUS ? ("success" as const) : ("danger" as const);
}

function getCondominiumAdmins(condominiumId: number, admins: MasterUserResponse[]) {
    return admins
        .filter((admin) => admin.condominiumId === condominiumId)
        .sort((first, second) => {
            if (first.status !== second.status) {
                return first.status === ACTIVE_STATUS ? -1 : 1;
            }

            return first.personName.localeCompare(second.personName, "pt-BR");
        });
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

function formatCnpjInput(value: string) {
    const digits = onlyDigits(value).slice(0, 14);

    return digits
        .replace(/^(\d{2})(\d)/, "$1.$2")
        .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
        .replace(/\.(\d{3})(\d)/, ".$1/$2")
        .replace(/(\d{4})(\d)/, "$1-$2");
}

function formatCepInput(value: string) {
    const digits = onlyDigits(value).slice(0, 8);

    return digits.replace(/^(\d{5})(\d)/, "$1-$2");
}

function formatCpfInput(value: string) {
    const digits = onlyDigits(value).slice(0, 11);

    return digits
        .replace(/^(\d{3})(\d)/, "$1.$2")
        .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
        .replace(/\.(\d{3})(\d)/, ".$1-$2");
}

function formatPhoneInput(value: string) {
    const digits = onlyDigits(value).slice(0, 11);

    if (digits.length <= 10) {
        return digits
            .replace(/^(\d{2})(\d)/, "($1) $2")
            .replace(/(\d{4})(\d)/, "$1-$2");
    }

    return digits
        .replace(/^(\d{2})(\d)/, "($1) $2")
        .replace(/(\d{5})(\d)/, "$1-$2");
}

function onlyDigits(value: string) {
    return value.replace(/\D/g, "");
}

function isValidCep(value: string) {
    return onlyDigits(value).length === 8;
}

async function getAddressByCep(cep: string) {
    const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);

    if (!response.ok) {
        return null;
    }

    const data = (await response.json()) as ViaCepResponse;

    if (data.erro) {
        return null;
    }

    return data;
}

function isValidEmail(value: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
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

    if (normalizedMessage.includes("selected admin") || normalizedMessage.includes("admin user")) {
        return "Selecione um Admin válido vinculado aos condomínios criados por você.";
    }

    if (normalizedMessage.includes("created by themselves")) {
        return "Você só pode alterar admins de condomínios criados por você.";
    }

    return message || "Não foi possível salvar o condomínio.";
}

function getUniqueAdmins(users: MasterUserResponse[]) {
    const adminsByUserId = new Map<number, MasterUserResponse>();

    for (const user of users) {
        if (!adminsByUserId.has(user.userId)) {
            adminsByUserId.set(user.userId, user);
        }
    }

    return Array.from(adminsByUserId.values()).sort((first, second) =>
        first.personName.localeCompare(second.personName, "pt-BR"),
    );
}
