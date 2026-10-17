import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import { Copy, Mail, Plus, RotateCw, Search, X } from "lucide-react";
import { useCondominium } from "../../app/providers/useCondominium";
import { Button, ButtonLink } from "../../shared/components/Button";
import { ConfirmDialog, type ConfirmRequest } from "../../shared/components/ConfirmDialog";
import { SelectField } from "../../shared/components/SelectField";
import { SummaryCard } from "../../shared/components/SummaryCard";
import { formatDateTime } from "../../shared/lib/date";
import { PageHeader } from "../../shared/layout/PageHeader";
import { getPersonsByCondominium } from "../persons/personService";
import type { PersonResponse } from "../persons/types";
import { getInvitationLink } from "./invitationLink";
import { cancelInvitation, getInvitationsByCondominium, renewInvitation } from "./invitationService";
import {
  INVITATION_STATUS_FILTERS,
  getInvitationErrorMessage,
  invitationRoleLabel,
  invitationStatusLabel,
  invitationStatusOf,
  type InvitationStatusFilter,
} from "./invitationStatus";
import { CreateInvitationModal, InvitationDetailsModal, InvitationStatusChip, InvitationStatusTile } from "./InvitationModals";
import type { InvitationResponse } from "./types";

export function InvitationsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    condominiums,
    activeCondominium,
    activeCondominiumId,
    isLoading: isLoadingCondominiums,
    errorMessage: condominiumErrorMessage,
    setActiveCondominiumId,
  } = useCondominium();

  const [invitations, setInvitations] = useState<InvitationResponse[]>([]);
  const [people, setPeople] = useState<PersonResponse[]>([]);
  const [isLoadingInvitations, setIsLoadingInvitations] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [viewingInvitationId, setViewingInvitationId] = useState<number | null>(null);
  const [confirmRequest, setConfirmRequest] = useState<ConfirmRequest | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<InvitationStatusFilter>("all");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // ?personId= comes from the Pessoas screen ("Convidar") and opens the form with that person selected.
  const requestedPersonId = Number(searchParams.get("personId"));
  const invitablePeople = useMemo(() => people.filter((person) => !person.hasRegisteredUser), [people]);
  const isCreateVisible = isCreateOpen || (requestedPersonId > 0 && invitablePeople.some((person) => person.id === requestedPersonId));

  useEffect(() => {
    if (!activeCondominiumId) return;
    let isMounted = true;

    Promise.all([getInvitationsByCondominium(activeCondominiumId), getPersonsByCondominium(activeCondominiumId)])
      .then(([invitationsResult, peopleResult]) => {
        if (!isMounted) return;
        setInvitations(invitationsResult);
        setPeople(peopleResult);
        setErrorMessage("");
      })
      .catch((error) => {
        if (!isMounted) return;
        setInvitations([]);
        setPeople([]);
        setErrorMessage(error instanceof Error ? getInvitationErrorMessage(error.message) : "Não foi possível carregar os convites.");
      })
      .finally(() => isMounted && setIsLoadingInvitations(false));

    return () => {
      isMounted = false;
    };
  }, [activeCondominiumId]);

  async function refreshInvitations() {
    if (!activeCondominiumId) return;
    const [invitationsResult, peopleResult] = await Promise.all([
      getInvitationsByCondominium(activeCondominiumId),
      getPersonsByCondominium(activeCondominiumId),
    ]);
    setInvitations(invitationsResult);
    setPeople(peopleResult);
  }

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: invitations.length };
    for (const invitation of invitations) {
      const status = invitationStatusOf(invitation);
      counts[status] = (counts[status] ?? 0) + 1;
    }
    return counts;
  }, [invitations]);

  const visibleInvitations = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return invitations.filter((invitation) => {
      const status = invitationStatusOf(invitation);
      if (statusFilter !== "all" && status !== statusFilter) return false;
      return (
        !term ||
        invitation.personName.toLowerCase().includes(term) ||
        invitation.email.toLowerCase().includes(term) ||
        invitationRoleLabel(invitation).toLowerCase().includes(term) ||
        invitationStatusLabel(status).toLowerCase().includes(term)
      );
    });
  }, [invitations, searchTerm, statusFilter]);

  const isLoading = isLoadingCondominiums || (Boolean(activeCondominiumId) && isLoadingInvitations);
  const pageErrorMessage = condominiumErrorMessage || errorMessage;
  const viewingInvitation = invitations.find((invitation) => invitation.id === viewingInvitationId) ?? null;
  const count = (key: string) => (isLoading ? "–" : String(statusCounts[key] ?? 0));

  function clearMessages() {
    setErrorMessage("");
    setSuccessMessage("");
  }

  async function copyLink(invitation: InvitationResponse) {
    clearMessages();
    const link = getInvitationLink(invitation.token);
    try {
      await navigator.clipboard.writeText(link);
      setSuccessMessage(`Link do convite de ${invitation.personName} copiado.`);
    } catch {
      setSuccessMessage(`Link do convite: ${link}`);
    }
  }

  async function handleRenew(invitation: InvitationResponse) {
    clearMessages();
    try {
      await renewInvitation(invitation.id);
      await refreshInvitations();
      setSuccessMessage(`Novo link enviado para ${invitation.email}.`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? getInvitationErrorMessage(error.message) : "Não foi possível reenviar o convite.");
    }
  }

  function askCancel(invitation: InvitationResponse) {
    setViewingInvitationId(null);
    setConfirmRequest({
      title: "Cancelar este convite?",
      description: `O link enviado para ${invitation.email} deixa de funcionar na hora. Depois dá para mandar um convite novo.`,
      confirmLabel: "Cancelar convite",
      tone: "danger",
      onConfirm: async () => {
        clearMessages();
        try {
          await cancelInvitation(invitation.id);
          await refreshInvitations();
          setSuccessMessage("Convite cancelado.");
        } catch (error) {
          setErrorMessage(error instanceof Error ? getInvitationErrorMessage(error.message) : "Não foi possível cancelar o convite.");
        }
      },
    });
  }

  function closeCreateModal() {
    setIsCreateOpen(false);
    if (requestedPersonId) setSearchParams({}, { replace: true });
  }

  const emptyMessage =
    people.length === 0
      ? "Cadastre uma pessoa antes de enviar um convite."
      : invitablePeople.length === 0
        ? "Todas as pessoas cadastradas já têm acesso ao app."
        : "Convide moradores e síndicos para pagar, acompanhar avisos e votar pelo app.";

  return (
    <>
      <PageHeader overline={activeCondominium?.condominiumName} title="Convites">
        <Button
          variant="accent"
          disabled={!activeCondominiumId || invitablePeople.length === 0}
          onClick={() => {
            clearMessages();
            setIsCreateOpen(true);
          }}
        >
          <Plus size={18} strokeWidth={2} aria-hidden />
          Novo convite
        </Button>
      </PageHeader>

      {condominiums.length > 1 && (
        <SelectField
          label="Condomínio"
          className="mb-6 lg:hidden"
          value={activeCondominiumId ?? ""}
          onChange={(event) => setActiveCondominiumId(Number(event.target.value))}
          options={condominiums.map((condominium) => ({ value: String(condominium.condominiumId), label: condominium.condominiumName }))}
        />
      )}

      {pageErrorMessage && (
        <p role="alert" className="mb-6 rounded-field bg-vermelho-suave px-4 py-3 text-sm font-medium text-vermelho">
          {pageErrorMessage}
        </p>
      )}
      {successMessage && (
        <p role="status" className="mb-6 break-all rounded-field bg-verde-suave px-4 py-3 text-sm font-medium text-verde-tinta">
          {successMessage}
        </p>
      )}

      <SummaryCard
        items={[
          { label: "Pendentes", value: count("Pending"), detail: "aguardando a pessoa aceitar" },
          { label: "Aceitos", value: count("Accepted"), detail: "já entram no app", tone: statusCounts.Accepted ? "good" : "neutral" },
          { label: "Expirados", value: count("Expired"), detail: "precisam de um link novo", tone: statusCounts.Expired ? "danger" : "neutral" },
          { label: "Pessoas sem acesso", value: isLoading ? "–" : String(invitablePeople.length), detail: `de ${people.length} cadastrada${people.length === 1 ? "" : "s"}` },
        ]}
      />

      <div className="mb-4 mt-10 flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
        <div role="tablist" aria-label="Situação" className="flex gap-1 self-start overflow-x-auto rounded-field bg-campo p-1 [scrollbar-width:none] max-lg:max-w-full">
          {INVITATION_STATUS_FILTERS.map((filter) => (
            <button
              key={filter.value}
              type="button"
              role="tab"
              aria-selected={statusFilter === filter.value}
              onClick={() => setStatusFilter(filter.value)}
              className={`flex shrink-0 items-center gap-1.5 rounded-field px-3.5 py-1.5 text-sm font-semibold transition-colors ${
                statusFilter === filter.value ? "bg-superficie text-tinta shadow-whisper" : "text-tinta-suave hover:text-tinta"
              }`}
            >
              {filter.label}
              <span className="text-xs font-medium tabular-nums text-tinta-suave">{count(filter.value)}</span>
            </button>
          ))}
        </div>
        <label className="relative lg:w-72">
          <span className="sr-only">Buscar convite</span>
          <Search size={17} strokeWidth={1.8} aria-hidden className="pointer-events-none absolute inset-y-0 left-3.5 my-auto text-tinta-suave" />
          <input
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Nome, e-mail ou papel"
            className="w-full rounded-full bg-superficie py-2.5 pl-10 pr-4 text-sm text-tinta shadow-whisper outline-none placeholder:text-tinta-suave/80 focus:ring-2 focus:ring-verde focus-visible:outline-none"
          />
        </label>
      </div>

      <ul className="divide-y divide-linha overflow-hidden rounded-card bg-superficie shadow-whisper">
        {visibleInvitations.length === 0 ? (
          <li className="flex flex-col items-center px-5 py-12 text-center">
            {isLoading ? (
              <span className="text-sm text-tinta-suave">Carregando…</span>
            ) : invitations.length > 0 ? (
              <span className="text-sm text-tinta-suave">Nenhum convite encontrado com esses filtros.</span>
            ) : (
              <>
                <span className="grid size-12 place-items-center rounded-block bg-verde-suave text-verde-tinta">
                  <Mail size={22} strokeWidth={1.8} aria-hidden />
                </span>
                <span className="mt-4 font-display text-lg font-bold text-tinta">Nenhum convite enviado</span>
                <span className="mt-1 max-w-sm text-sm text-tinta-suave">{emptyMessage}</span>
                {people.length === 0 ? (
                  <ButtonLink to="/admin/people" variant="quiet" size="sm" className="mt-5">
                    Ir para Moradores
                  </ButtonLink>
                ) : (
                  invitablePeople.length > 0 && (
                    <Button variant="quiet" size="sm" className="mt-5" onClick={() => setIsCreateOpen(true)}>
                      Enviar o primeiro convite
                    </Button>
                  )
                )}
              </>
            )}
          </li>
        ) : (
          visibleInvitations.map((invitation) => {
            const status = invitationStatusOf(invitation);
            const dateLine =
              status === "Accepted" && invitation.acceptedAt
                ? `Aceito em ${formatDateTime(invitation.acceptedAt)}`
                : status === "Pending"
                  ? `Vence ${formatDateTime(invitation.expiresAt)}`
                  : status === "Expired"
                    ? `Venceu ${formatDateTime(invitation.expiresAt)}`
                    : `Enviado em ${formatDateTime(invitation.createdAt)}`;

            return (
              <li key={invitation.id} className="flex items-center gap-2 pr-3 transition-colors hover:bg-campo/60">
                <button
                  type="button"
                  onClick={() => {
                    setSuccessMessage("");
                    setViewingInvitationId(invitation.id);
                  }}
                  className="flex min-w-0 flex-1 items-center gap-3 py-4 pl-4 text-left sm:gap-4 sm:pl-5"
                >
                  <InvitationStatusTile status={status} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-semibold text-tinta">{invitation.personName || invitation.email}</span>
                    <span className="block truncate text-[13px] text-tinta-suave">
                      {invitationRoleLabel(invitation)} · {invitation.email}
                    </span>
                    <span className={`block truncate text-xs ${status === "Expired" ? "text-vermelho" : status === "Pending" ? "text-ambar" : "text-tinta-suave"}`}>
                      <span className="font-semibold sm:hidden">{invitationStatusLabel(status)} · </span>
                      {dateLine}
                    </span>
                  </span>
                  <span className="hidden sm:block">
                    <InvitationStatusChip status={status} />
                  </span>
                </button>
                {/* Fixed-width slot keeps the status chips aligned across rows. */}
                <span className="flex w-[4.75rem] shrink-0 justify-end gap-1">
                  {status === "Pending" && (
                    <>
                      <IconAction label={`Copiar link do convite de ${invitation.personName}`} onClick={() => void copyLink(invitation)}>
                        <Copy size={16} strokeWidth={1.8} aria-hidden />
                      </IconAction>
                      <IconAction label={`Cancelar convite de ${invitation.personName}`} onClick={() => askCancel(invitation)}>
                        <X size={16} strokeWidth={1.8} aria-hidden />
                      </IconAction>
                    </>
                  )}
                  {status === "Expired" && (
                    <IconAction label={`Reenviar convite de ${invitation.personName} com novo link`} onClick={() => void handleRenew(invitation)}>
                      <RotateCw size={16} strokeWidth={1.8} aria-hidden />
                    </IconAction>
                  )}
                </span>
              </li>
            );
          })
        )}
      </ul>

      {isCreateVisible && activeCondominiumId && (
        <CreateInvitationModal
          condominiumId={activeCondominiumId}
          people={invitablePeople}
          initialPersonId={requestedPersonId || undefined}
          onClose={closeCreateModal}
          onCreated={async (invitation) => {
            await refreshInvitations();
            setSuccessMessage(`Convite enviado para ${invitation.email}.`);
            setViewingInvitationId(invitation.id);
          }}
        />
      )}

      {viewingInvitation && (
        <InvitationDetailsModal
          invitation={viewingInvitation}
          onClose={() => setViewingInvitationId(null)}
          onCopy={() => void copyLink(viewingInvitation)}
          onRenew={() => {
            setViewingInvitationId(null);
            void handleRenew(viewingInvitation);
          }}
          onCancel={() => askCancel(viewingInvitation)}
        />
      )}

      {confirmRequest && <ConfirmDialog request={confirmRequest} onClose={() => setConfirmRequest(null)} />}
    </>
  );
}

function IconAction({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="grid size-9 shrink-0 place-items-center rounded-full text-tinta-suave transition-colors hover:bg-campo hover:text-tinta"
    >
      {children}
    </button>
  );
}
