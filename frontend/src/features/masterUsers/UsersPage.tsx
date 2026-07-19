import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { MetricCard } from "../../shared/components/MetricCard";
import { StatusBadge } from "../../shared/components/StatusBadge";
import {
    getMasterUsers,
    reactivateCondominiumUser,
    suspendCondominiumUser,
} from "./masterUserService";
import type { MasterUserResponse, UserCondominiumStatus } from "./types";

const ACTIVE_STATUS = 1;
const SUSPENDED_STATUS = 2;

type StatusFilter = "all" | UserCondominiumStatus;

const statusFilterOptions: Array<{ value: StatusFilter; label: string }> = [
    { value: "all", label: "Todos" },
    { value: ACTIVE_STATUS, label: "Ativos" },
    { value: SUSPENDED_STATUS, label: "Suspensos" },
];

export function UsersPage() {
    const navigate = useNavigate();

    const [users, setUsers] = useState<MasterUserResponse[]>([]);
    const [selectedUser, setSelectedUser] = useState<MasterUserResponse | null>(null);
    const [userToSuspend, setUserToSuspend] = useState<MasterUserResponse | null>(null);
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
            label: "Admins ativos",
            value: activeUsers.length.toString(),
            helper: "Acessos liberados",
        },
        {
            label: "Suspensos",
            value: suspendedUsers.length.toString(),
            helper: "Sem acesso atual",
        },
        {
            label: "Condomínios",
            value: condominiumCount.toString(),
            helper: "Com Admin cadastrado",
        },
        {
            label: "Total",
            value: users.length.toString(),
            helper: "Admins institucionais",
        },
    ];

    async function loadUsers() {
        try {
            setIsLoading(true);
            setErrorMessage("");

            const result = await getMasterUsers();
            setUsers(result);
        } catch (error) {
            setUsers([]);
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

    return (
        <>
            <section className="rounded-[2rem] border border-[#E5E7EB] bg-white p-5 shadow-sm sm:p-6">
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-[#111827]">
                        Usuários
                    </h1>
                    <p className="mt-1 max-w-3xl text-sm font-semibold text-[#6B7280]">
                        O Master gerencia apenas os Admins institucionais dos condomínios
                        criados por ele. Usuários internos do condomínio ficam restritos ao
                        Admin.
                    </p>
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
                        <input
                            type="search"
                            value={searchTerm}
                            onChange={(event) => setSearchTerm(event.target.value)}
                            placeholder="Buscar por nome, e-mail, condomínio ou status..."
                            className="h-11 flex-1 rounded-2xl border border-[#E5E7EB] bg-white px-4 text-sm font-semibold text-[#111827] outline-none transition placeholder:text-[#9CA3AF] focus:border-[#22C55E] focus:ring-4 focus:ring-[#86EFAC]/30"
                        />

                        <select
                            value={statusFilter}
                            onChange={(event) => {
                                const value = event.target.value;
                                setStatusFilter(
                                    value === "all"
                                        ? "all"
                                        : (Number(value) as UserCondominiumStatus),
                                );
                            }}
                            className="h-11 cursor-pointer rounded-2xl border border-[#E5E7EB] bg-white px-4 text-sm font-bold text-[#6B7280] outline-none transition focus:border-[#22C55E] focus:ring-4 focus:ring-[#86EFAC]/30"
                        >
                            {statusFilterOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>

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
        </>
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

function getFriendlyErrorMessage(error: unknown, fallback: string) {
    if (!(error instanceof Error)) {
        return fallback;
    }

    const normalizedMessage = error.message.toLowerCase();

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
