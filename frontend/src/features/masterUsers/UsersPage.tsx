import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { MetricCard } from "../../shared/components/MetricCard";
import { StatusBadge } from "../../shared/components/StatusBadge";
import { getCondominiums } from "../condominiums/condominiumService";
import type { CondominiumResponse } from "../condominiums/types";
import { createInvitation } from "../invitations/invitationService";
import { createPerson } from "../persons/personService";
import {
    deleteCondominiumUser,
    getMasterUsers,
    reactivateCondominiumUser,
    suspendCondominiumUser,
} from "./masterUserService";
import type {
    MasterUserResponse,
    UserCondominiumStatus,
} from "./types";

const ACTIVE_STATUS = 1;
const SUSPENDED_STATUS = 2;
const ADMIN_ROLE = 2;

type CreateAdminInvitationRequest = {
    condominiumId: number;
    name: string;
    cpf: string;
    phoneNumber: string;
    email: string;
};

type StatusFilter = "all" | UserCondominiumStatus;

const statusFilterOptions: Array<{ value: StatusFilter; label: string }> = [
    { value: "all", label: "Todos" },
    { value: ACTIVE_STATUS, label: "Ativos" },
    { value: SUSPENDED_STATUS, label: "Acessos suspensos" },
];

export function UsersPage() {
    const navigate = useNavigate();

    const [users, setUsers] = useState<MasterUserResponse[]>([]);
    const [condominiums, setCondominiums] = useState<CondominiumResponse[]>([]);
    const [selectedUser, setSelectedUser] = useState<MasterUserResponse | null>(null);
    const [userToSuspend, setUserToSuspend] = useState<MasterUserResponse | null>(null);
    const [userToDelete, setUserToDelete] = useState<MasterUserResponse | null>(null);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [successMessage, setSuccessMessage] = useState("");

    const filteredUsers = useMemo(() => {
        const normalizedSearch = searchTerm.trim().toLowerCase();

        return users.filter((user) => {
            const matchesStatus = statusFilter === "all" || user.status === statusFilter;

            if (!matchesStatus) {
                return false;
            }

            if (!normalizedSearch) {
                return true;
            }

            return [
                user.personName,
                user.email,
                user.condominiumName,
                user.role,
                getStatusLabel(user.status),
            ]
                .join(" ")
                .toLowerCase()
                .includes(normalizedSearch);
        });
    }, [users, searchTerm, statusFilter]);

    const activeUsers = users.filter((user) => user.status === ACTIVE_STATUS);
    const suspendedUsers = users.filter((user) => user.status === SUSPENDED_STATUS);
    const condominiumCount = new Set(users.map((user) => user.condominiumId)).size;

    const metrics = [
        {
            label: "Administradores ativos",
            value: activeUsers.length.toString(),
            helper: "Com acesso liberado",
        },
        {
            label: "Acessos suspensos",
            value: suspendedUsers.length.toString(),
            helper: "Bloqueados temporariamente",
        },
        {
            label: "Condomínios atendidos",
            value: condominiumCount.toString(),
            helper: "Com Admin vinculado",
        },
        {
            label: "Total de Admins",
            value: users.length.toString(),
            helper: "Perfis criados pelo Master",
        },
    ];

    async function loadUsers() {
        try {
            setIsLoading(true);
            setErrorMessage("");

            const [userResult, condominiumResult] = await Promise.all([
                getMasterUsers(),
                getCondominiums(),
            ]);

            setUsers(userResult);
            setCondominiums(condominiumResult);
        } catch (error) {
            setUsers([]);
            setCondominiums([]);
            setErrorMessage(getFriendlyErrorMessage(error, "Não foi possível carregar os usuários."));
        } finally {
            setIsLoading(false);
        }
    }

    useEffect(() => {
        void loadUsers();
    }, []);

    async function handleReactivate(user: MasterUserResponse) {
        try {
            setIsSaving(true);
            setErrorMessage("");
            setSuccessMessage("");

            await reactivateCondominiumUser(user.condominiumId, user.userId);
            setSuccessMessage("Acesso reativado com sucesso.");
            await loadUsers();
        } catch (error) {
            setErrorMessage(getFriendlyErrorMessage(error, "Não foi possível reativar o acesso."));
        } finally {
            setIsSaving(false);
        }
    }

    async function handleSuspend(user: MasterUserResponse, suspensionReason: string) {
        try {
            setIsSaving(true);
            setErrorMessage("");
            setSuccessMessage("");

            await suspendCondominiumUser(user.condominiumId, user.userId, {
                suspensionReason: suspensionReason.trim() || undefined,
            });
            setUserToSuspend(null);
            setSuccessMessage("Acesso suspenso com sucesso.");
            await loadUsers();
        } catch (error) {
            setErrorMessage(getFriendlyErrorMessage(error, "Não foi possível suspender o acesso."));
        } finally {
            setIsSaving(false);
        }
    }

    async function handleDelete(user: MasterUserResponse) {
        try {
            setIsSaving(true);
            setErrorMessage("");
            setSuccessMessage("");

            await deleteCondominiumUser(user.condominiumId, user.userId);
            setUserToDelete(null);
            setSuccessMessage("Admin removido do condomínio com sucesso.");
            await loadUsers();
        } catch (error) {
            setErrorMessage(getFriendlyErrorMessage(error, "Não foi possível excluir o Admin."));
        } finally {
            setIsSaving(false);
        }
    }

    async function handleCreateUser(data: CreateAdminInvitationRequest) {
        try {
            setIsSaving(true);
            setErrorMessage("");
            setSuccessMessage("");

            const person = await createPerson({
                name: data.name,
                cpf: data.cpf,
                phoneNumber: data.phoneNumber,
            });

            await createInvitation({
                condominiumId: data.condominiumId,
                personId: person.id,
                email: data.email,
                role: ADMIN_ROLE,
            });
            setIsCreateOpen(false);
            setSuccessMessage("Convite de Admin gerado com sucesso.");
            await loadUsers();
            navigate("/master/invitations");
        } catch (error) {
            setErrorMessage(getFriendlyErrorMessage(error, "Não foi possível criar o usuário."));
        } finally {
            setIsSaving(false);
        }
    }

    return (
        <>
            <section className="rounded-[2rem] border border-[#E5E7EB] bg-white p-5 shadow-sm sm:p-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                    <h1 className="text-3xl font-black tracking-tight text-[#111827]">
                        Usuários
                    </h1>
                    <p className="mt-1 max-w-3xl text-sm font-semibold text-[#6B7280]">
                        Gerencie os administradores dos condomínios que você criou.
                    </p>
                    </div>

                    <button
                        type="button"
                        onClick={() => setIsCreateOpen(true)}
                        className="h-12 w-full cursor-pointer rounded-2xl bg-[#16A34A] px-5 text-sm font-extrabold text-white shadow-lg shadow-[#16A34A]/20 transition hover:bg-[#0D7A3A] sm:w-auto"
                    >
                        + Novo Admin
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
                {successMessage && <FeedbackMessage variant="success" message={successMessage} />}

                <div className="mt-6 rounded-[1.5rem] border border-[#E5E7EB] bg-[#F3F4F6] p-4">
                    <div className="mb-4 flex flex-col gap-3 lg:flex-row">
                        <div className="relative flex-1">
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(event) => setSearchTerm(event.target.value)}
                                placeholder="Buscar por nome, e-mail, condomínio ou status..."
                                className="h-11 w-full rounded-2xl border border-[#E5E7EB] bg-white px-4 pr-11 text-sm font-semibold text-[#111827] outline-none transition placeholder:text-[#9CA3AF] focus:border-[#22C55E] focus:ring-4 focus:ring-[#86EFAC]/30"
                            />

                            {searchTerm && (
                                <button
                                    type="button"
                                    aria-label="Limpar busca"
                                    onClick={() => setSearchTerm("")}
                                    className="absolute right-2 top-1/2 flex size-7 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full text-base font-black text-[#6B7280] transition hover:bg-[#DCFCE7] hover:text-[#0B3D2E] focus:outline-none focus:ring-4 focus:ring-[#86EFAC]/30"
                                >
                                    ×
                                </button>
                            )}
                        </div>

                        <StatusFilterSelect
                            value={statusFilter}
                            onChange={setStatusFilter}
                        />

                        <button
                            type="button"
                            onClick={() => {
                                setSearchTerm("");
                                setStatusFilter("all");
                            }}
                            className="h-11 cursor-pointer rounded-2xl border border-[#E5E7EB] bg-white px-5 text-sm font-bold text-[#6B7280] transition hover:bg-[#DCFCE7] hover:text-[#0B3D2E]"
                        >
                            Limpar
                        </button>
                    </div>

                    {isLoading ? (
                        <EmptyState message="Carregando usuários..." />
                    ) : filteredUsers.length === 0 ? (
                        <EmptyState
                            message={
                                searchTerm || statusFilter !== "all"
                                    ? "Nenhum usuário encontrado."
                                    : "Nenhum Admin cadastrado."
                            }
                            helper="Admins aparecem aqui após onboarding ou aceite de convite."
                        />
                    ) : (
                        <div className="overflow-x-auto rounded-2xl border border-[#E5E7EB] bg-white">
                            <table className="w-full min-w-[960px] border-collapse text-left text-sm">
                                <thead className="bg-[#DCFCE7] text-xs uppercase tracking-wide text-[#0B3D2E]">
                                    <tr>
                                        <th className="px-4 py-3 font-extrabold">Responsável</th>
                                        <th className="px-4 py-3 font-extrabold">E-mail</th>
                                        <th className="px-4 py-3 font-extrabold">Condomínio</th>
                                        <th className="px-4 py-3 font-extrabold">Status</th>
                                        <th className="px-4 py-3 font-extrabold">Criado em</th>
                                        <th className="px-4 py-3 font-extrabold">Ações</th>
                                    </tr>
                                </thead>

                                <tbody className="divide-y divide-[#E5E7EB]">
                                    {filteredUsers.map((user) => (
                                        <tr key={`${user.condominiumId}-${user.userId}`} className="transition hover:bg-[#F3F4F6]">
                                            <td className="px-4 py-4">
                                                <p className="font-extrabold text-[#111827]">
                                                    {user.personName}
                                                </p>
                                                <p className="mt-1 text-xs font-bold text-[#6B7280]">
                                                    {user.role}
                                                </p>
                                            </td>
                                            <td className="px-4 py-4 font-semibold text-[#6B7280]">
                                                {user.email}
                                            </td>
                                            <td className="px-4 py-4 font-semibold text-[#6B7280]">
                                                {user.condominiumName}
                                            </td>
                                            <td className="px-4 py-4">
                                                <StatusBadge
                                                    label={getStatusLabel(user.status)}
                                                    variant={getStatusVariant(user.status)}
                                                />
                                            </td>
                                            <td className="px-4 py-4 font-semibold text-[#6B7280]">
                                                {formatDate(user.userCreatedAt)}
                                            </td>
                                            <td className="px-4 py-4">
                                                <div className="flex flex-wrap gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => setSelectedUser(user)}
                                                        className="cursor-pointer rounded-xl border border-[#E5E7EB] bg-white px-3 py-1.5 text-xs font-bold text-[#6B7280] transition hover:bg-[#DCFCE7] hover:text-[#0B3D2E]"
                                                    >
                                                        Ver
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => navigate("/master/condominiums")}
                                                        className="cursor-pointer rounded-xl border border-[#E5E7EB] bg-white px-3 py-1.5 text-xs font-bold text-[#6B7280] transition hover:bg-[#DCFCE7] hover:text-[#0B3D2E]"
                                                    >
                                                        Condomínios
                                                    </button>
                                                    {user.status === ACTIVE_STATUS ? (
                                                        <button
                                                            type="button"
                                                            disabled={isSaving}
                                                            onClick={() => setUserToSuspend(user)}
                                                            className="cursor-pointer rounded-xl border border-[#FECACA] bg-white px-3 py-1.5 text-xs font-bold text-[#B42318] transition hover:bg-[#FDECEC] disabled:cursor-not-allowed disabled:opacity-70"
                                                        >
                                                            Suspender
                                                        </button>
                                                    ) : (
                                                        <button
                                                            type="button"
                                                            disabled={isSaving}
                                                            onClick={() => void handleReactivate(user)}
                                                            className="cursor-pointer rounded-xl border border-[#BBF7D0] bg-white px-3 py-1.5 text-xs font-bold text-[#0B3D2E] transition hover:bg-[#DCFCE7] disabled:cursor-not-allowed disabled:opacity-70"
                                                        >
                                                            Reativar
                                                        </button>
                                                    )}
                                                    <button
                                                        type="button"
                                                        disabled={isSaving}
                                                        onClick={() => setUserToDelete(user)}
                                                        className="cursor-pointer rounded-xl border border-[#FECACA] bg-white px-3 py-1.5 text-xs font-bold text-[#B42318] transition hover:bg-[#FDECEC] disabled:cursor-not-allowed disabled:opacity-70"
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

            {selectedUser && (
                <UserDetailsModal
                    user={selectedUser}
                    onClose={() => setSelectedUser(null)}
                />
            )}

            {userToSuspend && (
                <SuspendUserModal
                    user={userToSuspend}
                    isSaving={isSaving}
                    onClose={() => setUserToSuspend(null)}
                    onConfirm={handleSuspend}
                />
            )}

            {userToDelete && (
                <DeleteUserModal
                    user={userToDelete}
                    isSaving={isSaving}
                    onClose={() => setUserToDelete(null)}
                    onConfirm={handleDelete}
                />
            )}

            {isCreateOpen && (
                <CreateUserModal
                    condominiums={condominiums}
                    isSaving={isSaving}
                    onClose={() => setIsCreateOpen(false)}
                    onConfirm={handleCreateUser}
                />
            )}
        </>
    );
}

function StatusFilterSelect({
    value,
    onChange,
}: {
    value: StatusFilter;
    onChange: (value: StatusFilter) => void;
}) {
    const [isOpen, setIsOpen] = useState(false);
    const selectedLabel = statusFilterOptions.find((option) => option.value === value)?.label ?? "Todos";

    function selectStatus(nextValue: StatusFilter) {
        onChange(nextValue);
        setIsOpen(false);
    }

    return (
        <div className="relative w-full lg:w-48">
            <button
                type="button"
                aria-expanded={isOpen}
                onClick={() => setIsOpen((current) => !current)}
                className={`flex h-11 w-full cursor-pointer items-center justify-between rounded-2xl border bg-white px-4 text-left text-sm font-bold outline-none transition ${
                    isOpen
                        ? "border-[#22C55E] text-[#111827] ring-4 ring-[#86EFAC]/30"
                        : "border-[#E5E7EB] text-[#6B7280] hover:border-[#BBF7D0] hover:text-[#0B3D2E]"
                }`}
            >
                <span>{selectedLabel}</span>
                <span
                    aria-hidden="true"
                    className={`block size-2 shrink-0 border-r-2 border-b-2 border-current text-[#6B7280] transition-transform ${
                        isOpen ? "rotate-[225deg] translate-y-0.5" : "rotate-45 -translate-y-0.5"
                    }`}
                />
            </button>

            {isOpen && (
                <div className="absolute left-0 top-12 z-[70] w-full overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white p-1 shadow-xl shadow-[#111827]/10">
                    {statusFilterOptions.map((option) => {
                        const isSelected = option.value === value;

                        return (
                            <button
                                key={option.value}
                                type="button"
                                onClick={() => selectStatus(option.value)}
                                className={`flex h-10 w-full cursor-pointer items-center rounded-xl px-3 text-left text-sm font-extrabold transition ${
                                    isSelected
                                        ? "bg-[#DCFCE7] text-[#0B3D2E]"
                                        : "text-[#6B7280] hover:bg-[#F0FDF4] hover:text-[#0B3D2E]"
                                }`}
                            >
                                {option.label}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

function UserDetailsModal({
    user,
    onClose,
}: {
    user: MasterUserResponse;
    onClose: () => void;
}) {
    return (
        <ModalShell title="Detalhes do Admin" onClose={onClose}>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <ReadOnlyField label="Nome" value={user.personName} />
                <ReadOnlyField label="E-mail" value={user.email} />
                <ReadOnlyField label="Condomínio" value={user.condominiumName} />
                <ReadOnlyField label="Papel" value={user.role} />
                <ReadOnlyField label="Status" value={getStatusLabel(user.status)} />
                <ReadOnlyField label="Usuário criado em" value={formatDate(user.userCreatedAt)} />
                <ReadOnlyField label="Acesso criado em" value={formatDate(user.accessCreatedAt)} />
                <ReadOnlyField
                    label="Suspenso em"
                    value={user.suspendedAt ? formatDate(user.suspendedAt) : "Não suspenso"}
                />
            </div>

            {user.suspensionReason && (
                <div className="mt-5 rounded-2xl border border-[#FECACA] bg-[#FDECEC] p-4">
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-[#B42318]">
                        Motivo da suspensão
                    </p>
                    <p className="mt-2 text-sm font-bold text-[#7A271A]">
                        {user.suspensionReason}
                    </p>
                </div>
            )}
        </ModalShell>
    );
}

function SuspendUserModal({
    user,
    isSaving,
    onClose,
    onConfirm,
}: {
    user: MasterUserResponse;
    isSaving: boolean;
    onClose: () => void;
    onConfirm: (user: MasterUserResponse, suspensionReason: string) => Promise<void>;
}) {
    const [suspensionReason, setSuspensionReason] = useState("");

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        await onConfirm(user, suspensionReason);
    }

    return (
        <ModalShell title="Suspender acesso" onClose={onClose}>
            <form className="space-y-5" onSubmit={handleSubmit}>
                <div className="rounded-2xl border border-[#FECACA] bg-[#FDECEC] p-4">
                    <p className="text-sm font-extrabold text-[#7A271A]">
                        Você está suspendendo o acesso de {user.personName} ao condomínio
                        {` ${user.condominiumName}`}.
                    </p>
                    <p className="mt-2 text-sm font-semibold text-[#B42318]">
                        Isso não apaga dados. Apenas bloqueia o acesso enquanto estiver suspenso.
                    </p>
                </div>

                <label className="block">
                    <span className="mb-2 block text-sm font-extrabold text-[#111827]">
                        Motivo da suspensão
                    </span>
                    <textarea
                        value={suspensionReason}
                        maxLength={300}
                        onChange={(event) => setSuspensionReason(event.target.value)}
                        placeholder="Ex: solicitação do condomínio, contrato pausado..."
                        className="min-h-28 w-full resize-none rounded-2xl border border-[#E5E7EB] bg-white px-4 py-3 text-sm font-bold text-[#111827] outline-none transition placeholder:text-[#9CA3AF] focus:border-[#22C55E] focus:ring-4 focus:ring-[#86EFAC]/30"
                    />
                </label>

                <button
                    type="submit"
                    disabled={isSaving}
                    className="h-12 w-full cursor-pointer rounded-2xl bg-[#B42318] text-sm font-extrabold text-white shadow-sm shadow-[#B42318]/20 transition hover:bg-[#7A271A] disabled:cursor-not-allowed disabled:opacity-70"
                >
                    {isSaving ? "Suspendendo..." : "Suspender acesso"}
                </button>
            </form>
        </ModalShell>
    );
}

function DeleteUserModal({
    user,
    isSaving,
    onClose,
    onConfirm,
}: {
    user: MasterUserResponse;
    isSaving: boolean;
    onClose: () => void;
    onConfirm: (user: MasterUserResponse) => Promise<void>;
}) {
    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        await onConfirm(user);
    }

    return (
        <ModalShell title="Excluir Admin" onClose={onClose}>
            <form className="space-y-5" onSubmit={handleSubmit}>
                <div className="rounded-2xl border border-[#FECACA] bg-[#FDECEC] p-4">
                    <p className="text-sm font-extrabold text-[#7A271A]">
                        Você está removendo {user.personName} do condomínio {user.condominiumName}.
                    </p>
                    <p className="mt-2 text-sm font-semibold text-[#B42318]">
                        Se este for o último vínculo do Admin, a conta também será excluída quando não houver histórico bloqueando a remoção.
                    </p>
                </div>

                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isSaving}
                        className="h-12 cursor-pointer rounded-2xl border border-[#E5E7EB] bg-white px-5 text-sm font-extrabold text-[#6B7280] transition hover:bg-[#F3F4F6] disabled:cursor-not-allowed disabled:opacity-70"
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        disabled={isSaving}
                        className="h-12 cursor-pointer rounded-2xl bg-[#B42318] px-5 text-sm font-extrabold text-white shadow-sm shadow-[#B42318]/20 transition hover:bg-[#7A271A] disabled:cursor-not-allowed disabled:opacity-70"
                    >
                        {isSaving ? "Excluindo..." : "Excluir Admin"}
                    </button>
                </div>
            </form>
        </ModalShell>
    );
}

function CreateUserModal({
    condominiums,
    isSaving,
    onClose,
    onConfirm,
}: {
    condominiums: CondominiumResponse[];
    isSaving: boolean;
    onClose: () => void;
    onConfirm: (data: CreateAdminInvitationRequest) => Promise<void>;
}) {
    const [form, setForm] = useState({
        condominiumId: condominiums[0]?.id?.toString() ?? "",
        name: "",
        cpf: "",
        phoneNumber: "",
        email: "",
    });
    const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof typeof form, string>>>({});

    function updateField(field: keyof typeof form, value: string) {
        setForm((current) => ({
            ...current,
            [field]: value,
        }));
        setFieldErrors((current) => ({
            ...current,
            [field]: "",
        }));
    }

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        const phoneDigits = onlyDigits(form.phoneNumber);
        const errors: Partial<Record<keyof typeof form, string>> = {};

        if (!form.condominiumId) {
            errors.condominiumId = "Selecione um condomínio.";
        }

        if (form.name.trim().length < 2) {
            errors.name = "Informe o nome completo do Admin.";
        }

        if (!isValidCpf(form.cpf)) {
            errors.cpf = "Informe um CPF válido com 11 dígitos.";
        }

        if (phoneDigits.length < 10 || phoneDigits.length > 11) {
            errors.phoneNumber = "Informe um telefone com DDD.";
        }

        if (!isValidEmail(form.email)) {
            errors.email = "Informe um e-mail válido para o convite.";
        }

        if (Object.keys(errors).length > 0) {
            setFieldErrors(errors);
            return;
        }

        await onConfirm({
            condominiumId: Number(form.condominiumId),
            name: form.name.trim(),
            cpf: onlyDigits(form.cpf),
            phoneNumber: phoneDigits,
            email: form.email.trim(),
        });
    }

    return (
        <ModalShell title="Novo Admin" onClose={onClose}>
            <form className="space-y-5" onSubmit={handleSubmit}>
                <div className="rounded-2xl border border-[#BBF7D0] bg-[#DCFCE7] p-4">
                    <p className="text-sm font-extrabold text-[#0B3D2E]">
                        Este cadastro vai gerar um convite para o Admin selecionado.
                    </p>
                    <p className="mt-2 text-sm font-semibold text-[#0D7A3A]">
                        O acesso ao condomínio será liberado após ele aceitar o convite e criar a senha.
                    </p>
                </div>

                <CondominiumSelectField
                    condominiums={condominiums}
                    value={form.condominiumId}
                    error={fieldErrors.condominiumId}
                    onChange={(value) => updateField("condominiumId", value)}
                />

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <TextField
                        label="Nome"
                        value={form.name}
                        onChange={(value) => updateField("name", value)}
                        placeholder="Carlos Martins"
                        error={fieldErrors.name}
                    />
                    <TextField
                        label="CPF"
                        value={form.cpf}
                        onChange={(value) => updateField("cpf", formatCpfInput(value))}
                        placeholder="000.000.000-00"
                        maxLength={14}
                        error={fieldErrors.cpf}
                    />
                    <TextField
                        label="Telefone"
                        value={form.phoneNumber}
                        onChange={(value) => updateField("phoneNumber", formatPhoneInput(value))}
                        placeholder="(11) 99999-9999"
                        maxLength={15}
                        error={fieldErrors.phoneNumber}
                    />
                    <TextField
                        label="E-mail"
                        value={form.email}
                        onChange={(value) => updateField("email", value)}
                        placeholder="admin@condominio.com.br"
                        type="email"
                        error={fieldErrors.email}
                    />
                </div>

                <button
                    type="submit"
                    disabled={isSaving || condominiums.length === 0}
                    className="h-12 w-full cursor-pointer rounded-2xl bg-[#16A34A] text-sm font-extrabold text-white shadow-lg shadow-[#16A34A]/20 transition hover:bg-[#0D7A3A] disabled:cursor-not-allowed disabled:opacity-70"
                >
                    {isSaving ? "Gerando convite..." : "Gerar convite"}
                </button>
            </form>
        </ModalShell>
    );
}

function CondominiumSelectField({
    condominiums,
    value,
    error,
    onChange,
}: {
    condominiums: CondominiumResponse[];
    value: string;
    error?: string;
    onChange: (value: string) => void;
}) {
    const [isOpen, setIsOpen] = useState(false);
    const selectedCondominium = condominiums.find(
        (condominium) => condominium.id.toString() === value,
    );
    const selectedLabel = selectedCondominium?.name ?? "Selecione um condomínio";

    function selectCondominium(nextValue: string) {
        onChange(nextValue);
        setIsOpen(false);
    }

    return (
        <div className="relative block">
            <span className="mb-2 block text-sm font-extrabold text-[#111827]">
                Condomínio
            </span>
            <button
                type="button"
                disabled={condominiums.length === 0}
                aria-expanded={isOpen}
                aria-invalid={!!error}
                onClick={() => setIsOpen((current) => !current)}
                className={`flex h-12 w-full cursor-pointer items-center justify-between rounded-2xl border bg-white px-4 text-left text-sm font-bold outline-none transition disabled:cursor-not-allowed disabled:bg-[#F3F4F6] disabled:text-[#6B7280] ${
                    error
                        ? "border-[#EF4444] text-[#111827] focus:ring-4 focus:ring-[#FECACA]/50"
                        : isOpen
                            ? "border-[#22C55E] text-[#111827] ring-4 ring-[#86EFAC]/30"
                            : "border-[#E5E7EB] text-[#111827] hover:border-[#BBF7D0]"
                }`}
            >
                <span className={selectedCondominium ? "text-[#111827]" : "text-[#9CA3AF]"}>
                    {selectedLabel}
                </span>
                <span
                    aria-hidden="true"
                    className={`block size-2 shrink-0 border-r-2 border-b-2 border-current text-[#6B7280] transition-transform ${
                        isOpen ? "rotate-[225deg] translate-y-0.5" : "rotate-45 -translate-y-0.5"
                    }`}
                />
            </button>

            {isOpen && (
                <div className="absolute left-0 top-[4.75rem] z-[80] max-h-56 w-full overflow-y-auto rounded-2xl border border-[#E5E7EB] bg-white p-1 shadow-xl shadow-[#111827]/10">
                    <button
                        type="button"
                        onClick={() => selectCondominium("")}
                        className={`flex h-10 w-full cursor-pointer items-center rounded-xl px-3 text-left text-sm font-extrabold transition ${
                            !value
                                ? "bg-[#DCFCE7] text-[#0B3D2E]"
                                : "text-[#6B7280] hover:bg-[#F0FDF4] hover:text-[#0B3D2E]"
                        }`}
                    >
                        Selecione um condomínio
                    </button>
                    {condominiums.map((condominium) => {
                        const nextValue = condominium.id.toString();
                        const isSelected = value === nextValue;

                        return (
                            <button
                                key={condominium.id}
                                type="button"
                                onClick={() => selectCondominium(nextValue)}
                                className={`flex h-10 w-full cursor-pointer items-center rounded-xl px-3 text-left text-sm font-extrabold transition ${
                                    isSelected
                                        ? "bg-[#DCFCE7] text-[#0B3D2E]"
                                        : "text-[#6B7280] hover:bg-[#F0FDF4] hover:text-[#0B3D2E]"
                                }`}
                            >
                                {condominium.name}
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

function TextField({
    label,
    value,
    onChange,
    placeholder,
    type = "text",
    maxLength,
    error,
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    placeholder: string;
    type?: string;
    maxLength?: number;
    error?: string;
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
                className={`h-12 w-full rounded-2xl border bg-white px-4 text-sm font-bold text-[#111827] outline-none transition placeholder:text-[#9CA3AF] focus:border-[#22C55E] focus:ring-4 focus:ring-[#86EFAC]/30 ${
                    error ? "border-[#EF4444]" : "border-[#E5E7EB]"
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

function ModalShell({
    title,
    children,
    onClose,
}: {
    title: string;
    children: React.ReactNode;
    onClose: () => void;
}) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0B3D2E]/30 px-4 py-8 backdrop-blur-sm">
            <div className="w-full max-w-3xl overflow-hidden rounded-[2rem] border border-[#E5E7EB] bg-white shadow-2xl shadow-[#0B3D2E]/20">
                <div className="flex items-center justify-between border-b border-[#E5E7EB] px-6 py-5">
                    <h2 className="text-2xl font-black text-[#111827]">{title}</h2>
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex size-10 cursor-pointer items-center justify-center rounded-full bg-[#F3F4F6] text-xl font-light text-[#6B7280] transition hover:bg-[#FDECEC] hover:text-[#B42318]"
                    >
                        x
                    </button>
                </div>

                <div className="max-h-[75vh] overflow-y-auto px-6 py-6">
                    {children}
                </div>
            </div>
        </div>
    );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
    return (
        <label className="block">
            <span className="mb-2 block text-sm font-extrabold text-[#111827]">
                {label}
            </span>
            <input
                value={value}
                readOnly
                className="h-11 w-full rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] px-4 text-sm font-bold text-[#111827] outline-none"
            />
        </label>
    );
}

function FeedbackMessage({
    message,
    variant,
}: {
    message: string;
    variant: "success" | "danger";
}) {
    const classes = {
        success: "border-[#BBF7D0] bg-[#DCFCE7] text-[#0B3D2E]",
        danger: "border-[#FECACA] bg-[#FDECEC] text-[#B42318]",
    };

    return (
        <p className={`mt-5 rounded-2xl border px-4 py-3 text-sm font-bold ${classes[variant]}`}>
            {message}
        </p>
    );
}

function EmptyState({ message, helper }: { message: string; helper?: string }) {
    return (
        <div className="rounded-2xl border border-dashed border-[#D0D5DD] bg-white px-5 py-10 text-center">
            <p className="text-sm font-extrabold text-[#6B7280]">{message}</p>
            {helper && (
                <p className="mt-2 text-xs font-bold text-[#9CA3AF]">{helper}</p>
            )}
        </div>
    );
}

function getStatusLabel(status: UserCondominiumStatus) {
    return status === ACTIVE_STATUS ? "Ativo" : "Suspenso";
}

function getStatusVariant(status: UserCondominiumStatus) {
    return status === ACTIVE_STATUS ? ("success" as const) : ("danger" as const);
}

function formatDate(value: string) {
    return new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    }).format(new Date(value));
}

function onlyDigits(value: string) {
    return value.replace(/\D/g, "");
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

function getFriendlyErrorMessage(error: unknown, fallback: string) {
    if (!(error instanceof Error)) {
        return fallback;
    }

    const normalizedMessage = error.message.toLowerCase();

    if (normalizedMessage.includes("email is already in use")) {
        return "Este e-mail já está em uso por outro usuário.";
    }

    if (normalizedMessage.includes("email already registered")) {
        return "Este e-mail já está cadastrado.";
    }

    if (normalizedMessage.includes("cpf already registered")) {
        return "Este CPF já está cadastrado.";
    }

    if (normalizedMessage.includes("cpf must contain exactly 11 digits")) {
        return "O CPF precisa ter 11 dígitos.";
    }

    if (normalizedMessage.includes("phone number must contain")) {
        return "O telefone precisa ter DDD e conter apenas números.";
    }

    if (normalizedMessage.includes("already a pending invitation")) {
        return "Já existe um convite pendente para essa pessoa.";
    }

    if (normalizedMessage.includes("password")) {
        return "A senha precisa ter pelo menos 6 caracteres.";
    }

    if (normalizedMessage.includes("already suspended")) {
        return "Este acesso já está suspenso.";
    }

    if (normalizedMessage.includes("already active")) {
        return "Este acesso já está ativo.";
    }

    if (normalizedMessage.includes("created by themselves")) {
        return "Você só pode gerenciar Admins de condomínios criados por você.";
    }

    if (normalizedMessage.includes("permission") || normalizedMessage.includes("forbidden")) {
        return "Seu usuário não tem permissão para esta ação.";
    }

    return error.message || fallback;
}
