import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { ChevronRight, Plus, Search, UserRound } from "lucide-react";
import { Button } from "../../shared/components/Button";
import { ConfirmDialog, type ConfirmRequest } from "../../shared/components/ConfirmDialog";
import { SummaryCard } from "../../shared/components/SummaryCard";
import { PageHeader } from "../../shared/layout/PageHeader";
import { formatCurrency } from "../../shared/lib/currency";
import { formatCalendarDate, isPastCalendarDate, toAppDateString, todayInputDate } from "../../shared/lib/date";
import { getPlatformCharges } from "../charges/chargeService";
import type { ChargeResponse } from "../charges/types";
import {
    deleteCondominium,
    getCondominiums,
    onboardCondominium,
    removeCondominiumAdmin,
    updateCondominium,
    updateCondominiumAdmin,
    updateCondominiumStatus,
} from "../condominiums/condominiumService";
import type { CondominiumResponse } from "../condominiums/types";
import { cancelInvitation, createInvitation, getInvitationsByCondominium, renewInvitation } from "../invitations/invitationService";
import { getInvitationLink } from "../invitations/invitationLink";
import type { InvitationResponse } from "../invitations/types";
import { getMasterUsers } from "../masterUsers/masterUserService";
import type { MasterUserResponse } from "../masterUsers/types";
import { createPerson } from "../persons/personService";
import { AdminInvitationModal } from "../invitations/AdminInvitationModal";
import { CondominiumDetailsModal } from "./CondominiumDetailsModal";
import { CondominiumFormModal } from "./CondominiumFormModal";
import {
    EXPIRED_INVITATION_STATUS,
    buildBillingIndex,
    getSituation,
    groupOpenAdminInvitations,
    type Situation,
} from "./condominiumBilling";
import { SituationChip, SituationTile } from "./SituationBadge";
import {
    ACTIVE_STATUS,
    ADMIN_ROLE,
    INACTIVE_STATUS,
    emptyForm,
    formatCnpj,
    formatCepInput,
    formatCnpjInput,
    getCondominiumAdmins,
    getFriendlyErrorMessage,
    getUniqueAdmins,
    onlyDigits,
    toOnboardingRequest,
    toUpdateRequest,
    validateForm,
    type CreateAdminInvitationRequest,
    type FieldErrors,
    type FormState,
    type ModalMode,
} from "./condominiumForm";

type Filter = "all" | Situation;

async function fetchPageData() {
    const [condominiums, admins, charges] = await Promise.all([getCondominiums(), getMasterUsers(), getPlatformCharges()]);
    // Pending admin invitations: one request per condominium; a failed one just shows no invitation.
    const invitationResults = await Promise.allSettled(condominiums.map((condominium) => getInvitationsByCondominium(condominium.id)));
    const invitations = invitationResults.flatMap((result) => (result.status === "fulfilled" ? result.value : []));

    return { condominiums, admins, charges, invitations };
}

export function CondominiumsPage() {
    const [condominiums, setCondominiums] = useState<CondominiumResponse[]>([]);
    const [charges, setCharges] = useState<ChargeResponse[]>([]);
    const [invitations, setInvitations] = useState<InvitationResponse[]>([]);
    const [search, setSearch] = useState("");
    const [adminUsers, setAdminUsers] = useState<MasterUserResponse[]>([]);
    const [filter, setFilter] = useState<Filter>("all");
    const [confirmRequest, setConfirmRequest] = useState<ConfirmRequest | null>(null);
    const [errorMessage, setErrorMessage] = useState("");
    const [modalErrorMessage, setModalErrorMessage] = useState("");
    const [successMessage, setSuccessMessage] = useState("");
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

    function applyPageData(data: Awaited<ReturnType<typeof fetchPageData>>) {
        setCondominiums(data.condominiums);
        setAdminUsers(data.admins);
        setCharges(data.charges);
        setInvitations(data.invitations);
    }

    function applyLoadError(error: unknown) {
        setErrorMessage(error instanceof Error ? error.message : "Não foi possível carregar os condomínios.");
    }

    // Reload after saving (silent: the list stays on screen while it refreshes).
    async function loadCondominiums() {
        try {
            applyPageData(await fetchPageData());
        } catch (error) {
            applyLoadError(error);
        }
    }

    useEffect(() => {
        let isMounted = true;

        fetchPageData()
            .then((data) => isMounted && applyPageData(data))
            .catch((error) => isMounted && applyLoadError(error))
            .finally(() => isMounted && setIsLoading(false));

        return () => {
            isMounted = false;
        };
    }, []);

    const uniqueAdminUsers = useMemo(() => getUniqueAdmins(adminUsers), [adminUsers]);

    const billing = useMemo(() => buildBillingIndex(charges), [charges]);
    const openInvitations = useMemo(() => groupOpenAdminInvitations(invitations), [invitations]);
    const situationOf = (condominium: CondominiumResponse) => getSituation(condominium, billing.get(condominium.id));

    const counts = {
        all: condominiums.length,
        ok: condominiums.filter((condominium) => situationOf(condominium) === "ok").length,
        late: condominiums.filter((condominium) => situationOf(condominium) === "late").length,
        inactive: condominiums.filter((condominium) => situationOf(condominium) === "inactive").length,
    };

    const currentMonth = todayInputDate().slice(0, 7);
    const newThisMonth = condominiums.filter((condominium) => toAppDateString(condominium.createdAt).startsWith(currentMonth)).length;
    const pendingInvitationCount = [...openInvitations.values()]
        .flat()
        .filter((invitation) => invitation.invitationStatus !== EXPIRED_INVITATION_STATUS).length;
    const overdueTotal = [...billing.values()].reduce((total, entry) => total + entry.overdueValue, 0);

    const normalizedSearch = search.trim().toLowerCase();
    const matchesSearch = (condominium: CondominiumResponse) =>
        !normalizedSearch ||
        [condominium.name, condominium.cnpj, formatCnpj(condominium.cnpj), condominium.city, condominium.adminName ?? ""]
            .join(" ")
            .toLowerCase()
            .includes(normalizedSearch);

    const visibleCondominiums = condominiums.filter(
        (condominium) => (filter === "all" || situationOf(condominium) === filter) && matchesSearch(condominium),
    );

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
            cnpj: formatCnpjInput(condominium.cnpj),
            cep: formatCepInput(condominium.cep || ""),
            number: condominium.number,
            address: condominium.address,
            city: condominium.city,
            state: condominium.state,
            emailContact: condominium.emailContact,
            status: condominium.status,
            type: condominium.type,
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

            await updateCondominiumStatus(condominium.id, { status: nextStatus });

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

    function askToggleStatus(condominium: CondominiumResponse) {
        if (condominium.status !== ACTIVE_STATUS) {
            void handleToggleStatus(condominium);
            return;
        }

        setConfirmRequest({
            title: `Inativar ${condominium.name}?`,
            description:
                "Moradores e síndicos perdem o acesso até o condomínio ser reativado. O admin só consegue entrar para pagar a mensalidade do Moraê. Nenhum dado é apagado.",
            confirmLabel: "Inativar",
            tone: "danger",
            onConfirm: () => handleToggleStatus(condominium),
        });
    }

    function askDelete(condominium: CondominiumResponse) {
        setConfirmRequest({
            title: `Apagar ${condominium.name}?`,
            description: "Esta ação não pode ser desfeita.",
            confirmLabel: "Apagar condomínio",
            tone: "danger",
            onConfirm: () => handleDelete(condominium),
        });
    }

    function askRemoveAdmin(condominium: CondominiumResponse) {
        setConfirmRequest({
            title: "Remover o admin?",
            description: `O admin ativo de ${condominium.name} perde o acesso administrativo a este condomínio.`,
            confirmLabel: "Remover admin",
            tone: "danger",
            onConfirm: () => handleRemoveAdmin(condominium),
        });
    }

    async function copyInvitationLink(invitation: InvitationResponse) {
        try {
            await navigator.clipboard.writeText(getInvitationLink(invitation.token));
            setSuccessMessage(`Link do convite de ${invitation.email} copiado.`);
        } catch {
            setErrorMessage("Não foi possível copiar o link. Tente de novo.");
        }
    }

    async function handleRenewInvitation(invitation: InvitationResponse) {
        try {
            setErrorMessage("");
            await renewInvitation(invitation.id);
            setSuccessMessage(`Novo link enviado para ${invitation.email}.`);
            await loadCondominiums();
        } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : "Não foi possível reenviar o convite.");
        }
    }

    function askCancelInvitation(invitation: InvitationResponse) {
        setConfirmRequest({
            title: "Cancelar o convite?",
            description: `O link enviado para ${invitation.email} deixa de funcionar.`,
            confirmLabel: "Cancelar convite",
            tone: "danger",
            onConfirm: async () => {
                try {
                    setErrorMessage("");
                    await cancelInvitation(invitation.id);
                    setSuccessMessage("Convite cancelado.");
                    await loadCondominiums();
                } catch (error) {
                    setErrorMessage(error instanceof Error ? error.message : "Não foi possível cancelar o convite.");
                }
            },
        });
    }

    const tabs: Array<{ key: Filter; label: string }> = [
        { key: "all", label: "Todos" },
        { key: "ok", label: "Em dia" },
        { key: "late", label: "Mensalidade atrasada" },
        { key: "inactive", label: "Inativos" },
    ];

    return (
        <>
            <PageHeader
                overline={isLoading ? undefined : `${condominiums.length - counts.inactive} ativo${condominiums.length - counts.inactive === 1 ? "" : "s"} · ${counts.inactive} inativo${counts.inactive === 1 ? "" : "s"}`}
                title="Condomínios"
            >
                <Button variant="quiet" size="sm" onClick={openCreateModal} className="bg-superficie shadow-whisper hover:bg-campo">
                    <Plus size={16} strokeWidth={2} aria-hidden />
                    Novo condomínio
                </Button>
            </PageHeader>

            {errorMessage && <Feedback tone="danger">{errorMessage}</Feedback>}
            {successMessage && <Feedback tone="success">{successMessage}</Feedback>}

            <SummaryCard
                items={[
                    {
                        label: "Ativos",
                        value: isLoading ? "–" : String(counts.all - counts.inactive),
                        detail: newThisMonth ? `+${newThisMonth} este mês` : "nenhum novo este mês",
                        tone: "good",
                    },
                    { label: "Inativos", value: isLoading ? "–" : String(counts.inactive), detail: "acesso pausado" },
                    {
                        label: "Convites pendentes",
                        value: isLoading ? "–" : String(pendingInvitationCount),
                        detail: "admins que ainda não entraram",
                    },
                    {
                        label: "Em atraso",
                        value: isLoading ? "–" : formatCurrency(overdueTotal),
                        detail: counts.late ? `${counts.late} condomínio${counts.late > 1 ? "s" : ""}` : "todos em dia",
                        tone: overdueTotal > 0 ? "danger" : "neutral",
                    },
                ]}
            />

            <div className="mb-4 mt-8 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div role="tablist" aria-label="Filtrar condomínios" className="inline-flex max-w-full self-start overflow-x-auto rounded-block bg-menu p-1">
                    {tabs.map((tab) => (
                        <button
                            key={tab.key}
                            type="button"
                            role="tab"
                            aria-selected={filter === tab.key}
                            onClick={() => setFilter(tab.key)}
                            className={`flex shrink-0 items-center gap-1.5 rounded-field px-3.5 py-1.5 text-sm font-semibold transition-colors ${
                                filter === tab.key ? "bg-superficie text-tinta shadow-whisper" : "text-tinta-suave hover:text-tinta"
                            }`}
                        >
                            {tab.label}
                            <span className="text-xs font-medium tabular-nums text-tinta-suave">{counts[tab.key]}</span>
                        </button>
                    ))}
                </div>

                <label className="relative lg:w-72">
                    <span className="sr-only">Buscar condomínio</span>
                    <Search size={17} strokeWidth={1.8} aria-hidden className="pointer-events-none absolute inset-y-0 left-3.5 my-auto text-tinta-suave" />
                    <input
                        type="search"
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Nome, CNPJ, cidade ou admin"
                        className="w-full rounded-full bg-superficie py-2.5 pl-10 pr-4 text-sm text-tinta shadow-whisper outline-none placeholder:text-tinta-suave/80 focus:ring-2 focus:ring-verde focus-visible:outline-none"
                    />
                </label>
            </div>

            <ul className="divide-y divide-linha overflow-hidden rounded-card bg-superficie shadow-whisper">
                {visibleCondominiums.length === 0 ? (
                    <li className="px-5 py-10 text-center text-sm text-tinta-suave">
                        {isLoading
                            ? "Carregando…"
                            : normalizedSearch
                              ? "Nenhum condomínio encontrado para essa busca."
                              : filter === "all"
                                ? "Nenhum condomínio cadastrado ainda."
                                : "Nenhum condomínio nesta situação."}
                    </li>
                ) : (
                    visibleCondominiums.map((condominium) => {
                        const situation = situationOf(condominium);
                        const condominiumBilling = billing.get(condominium.id);
                        const invitation = openInvitations.get(condominium.id)?.[0];
                        const isInvitationExpired = invitation?.invitationStatus === EXPIRED_INVITATION_STATUS;
                        const nextDue = condominiumBilling?.nextDue;
                        return (
                            <li key={condominium.id}>
                                <button
                                    type="button"
                                    onClick={() => setDetailsCondominium(condominium)}
                                    className="flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-campo/60"
                                >
                                    <SituationTile name={condominium.name} situation={situation} />
                                    <span className="min-w-0 flex-1">
                                        <span className="block truncate text-[15px] font-semibold text-tinta">{condominium.name}</span>
                                        <span className="block truncate text-[13px] text-tinta-suave">
                                            {formatCnpj(condominium.cnpj)} · {condominium.city}, {condominium.state}
                                        </span>
                                        <span className="mt-1 flex items-center gap-1.5 truncate text-[13px]">
                                            <UserRound size={14} strokeWidth={1.8} aria-hidden className="shrink-0 text-tinta-suave" />
                                            {condominium.adminName ? (
                                                <span className="truncate text-tinta">{condominium.adminName}</span>
                                            ) : invitation ? (
                                                <span className={`truncate font-medium ${isInvitationExpired ? "text-vermelho" : "text-ambar"}`}>
                                                    {isInvitationExpired ? "Convite vencido" : "Convite pendente"} para {invitation.email}
                                                </span>
                                            ) : (
                                                <span className="text-tinta-suave">Sem admin ativo</span>
                                            )}
                                        </span>
                                    </span>
                                    <span className="hidden w-36 text-right sm:block">
                                        {condominiumBilling?.monthlyValue ? (
                                            <span className="block text-sm font-semibold tabular-nums text-tinta">
                                                {formatCurrency(condominiumBilling.monthlyValue)}/mês
                                            </span>
                                        ) : (
                                            <span className="block text-sm text-tinta-suave">Sem mensalidade</span>
                                        )}
                                        {nextDue && (
                                            <span className={`block text-xs tabular-nums ${isPastCalendarDate(nextDue.slice(0, 10)) ? "text-vermelho" : "text-tinta-suave"}`}>
                                                {isPastCalendarDate(nextDue.slice(0, 10)) ? "venceu" : "vence"} {formatCalendarDate(nextDue)}
                                            </span>
                                        )}
                                    </span>
                                    <span className="hidden w-44 justify-end md:flex">
                                        <SituationChip situation={situation} />
                                    </span>
                                    <ChevronRight size={18} strokeWidth={1.8} aria-hidden className="shrink-0 text-tinta-suave" />
                                </button>
                            </li>
                        );
                    })
                )}
            </ul>

            {modalMode && (
                <CondominiumFormModal
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
                        if (selectedCondominium) setAdminInviteCondominium(selectedCondominium);
                    }}
                    onRemoveAdmin={() => {
                        if (selectedCondominium) askRemoveAdmin(selectedCondominium);
                    }}
                    onSubmit={handleSubmit}
                />
            )}

            {adminInviteCondominium && (
                <AdminInvitationModal
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
                    situation={situationOf(detailsCondominium)}
                    billing={billing.get(detailsCondominium.id)}
                    admins={getCondominiumAdmins(detailsCondominium.id, adminUsers)}
                    invitations={openInvitations.get(detailsCondominium.id) ?? []}
                    notice={errorMessage ? { tone: "danger", text: errorMessage } : successMessage ? { tone: "success", text: successMessage } : undefined}
                    onCopyInvitationLink={(invitation) => void copyInvitationLink(invitation)}
                    onRenewInvitation={(invitation) => void handleRenewInvitation(invitation)}
                    onCancelInvitation={askCancelInvitation}
                    onClose={() => setDetailsCondominium(null)}
                    onEdit={() => {
                        const condominium = detailsCondominium;
                        setDetailsCondominium(null);
                        openEditModal(condominium);
                    }}
                    onToggleStatus={() => {
                        const condominium = detailsCondominium;
                        setDetailsCondominium(null);
                        askToggleStatus(condominium);
                    }}
                    onDelete={() => {
                        const condominium = detailsCondominium;
                        setDetailsCondominium(null);
                        askDelete(condominium);
                    }}
                />
            )}

            {confirmRequest && <ConfirmDialog request={confirmRequest} onClose={() => setConfirmRequest(null)} />}
        </>
    );
}

function Feedback({ tone, children }: { tone: "danger" | "success"; children: ReactNode }) {
    return (
        <p
            role={tone === "danger" ? "alert" : "status"}
            className={`mb-5 rounded-field px-4 py-3 text-sm font-medium ${tone === "danger" ? "bg-vermelho-suave text-vermelho" : "bg-verde-suave text-verde-tinta"}`}
        >
            {children}
        </p>
    );
}
