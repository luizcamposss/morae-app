import { useEffect, useMemo, useState } from "react";
import { getCondominiums } from "../condominiums/condominiumService";
import { MetricCard } from "../../shared/components/MetricCard";
import { StatusBadge } from "../../shared/components/StatusBadge";
import { cancelInvitation, getInvitationsByCondominium, renewInvitation } from "./invitationService";
import type { InvitationResponse, InvitationStatus } from "./types";

const ADMIN_ROLE = 2;
const PENDING_STATUS = 1;
const ACCEPTED_STATUS = 2;
const EXPIRED_STATUS = 4;
const CANCELED_STATUS = 5;

type StatusFilter = "all" | InvitationStatus;

const statusFilterOptions: Array<{ value: StatusFilter; label: string }> = [
  { value: "all", label: "Todos" },
  { value: PENDING_STATUS, label: "Pendentes" },
  { value: ACCEPTED_STATUS, label: "Aceitos" },
  { value: EXPIRED_STATUS, label: "Expirados" },
  { value: CANCELED_STATUS, label: "Cancelados" },
];

function buildInvitationLink(token: string) {
  return `${window.location.origin}/accept-invitation/${token}`;
}

export function MasterInvitationsPage() {
  const [invitations, setInvitations] = useState<InvitationResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRenewingId, setIsRenewingId] = useState<number | null>(null);
  const [isCancelingId, setIsCancelingId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [isStatusFilterOpen, setIsStatusFilterOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [generatedLink, setGeneratedLink] = useState("");

  const filteredInvitations = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return invitations.filter((invitation) => {
      const status = getEffectiveStatus(invitation);
      const matchesStatus = statusFilter === "all" || status === statusFilter;

      if (!matchesStatus) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      return [
        invitation.personName,
        invitation.email,
        invitation.condominiumName,
        getStatusLabel(status),
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalizedSearch);
    });
  }, [invitations, searchTerm, statusFilter]);

  const pendingInvitations = invitations.filter(
    (invitation) => getEffectiveStatus(invitation) === PENDING_STATUS,
  );

  const acceptedInvitations = invitations.filter(
    (invitation) => getEffectiveStatus(invitation) === ACCEPTED_STATUS,
  );

  const expiredInvitations = invitations.filter(
    (invitation) => getEffectiveStatus(invitation) === EXPIRED_STATUS,
  );

  const metrics = [
    {
      label: "Total",
      value: invitations.length.toString(),
      helper: "Convites registrados",
    },
    {
      label: "Pendentes",
      value: pendingInvitations.length.toString(),
      helper: "Aguardando resposta",
    },
    {
      label: "Aceitos",
      value: acceptedInvitations.length.toString(),
      helper: "Acessos liberados",
    },
    {
      label: "Expirados",
      value: expiredInvitations.length.toString(),
      helper: "Renovação necessária",
    },
  ];

  async function loadPageData() {
    try {
      setIsLoading(true);
      setErrorMessage("");

      const condominiumResult = await getCondominiums();
      const invitationResults = await Promise.allSettled(
        condominiumResult.map((condominium) =>
          getInvitationsByCondominium(condominium.id),
        ),
      );

      const loadedInvitations = invitationResults
        .filter(
          (result): result is PromiseFulfilledResult<InvitationResponse[]> =>
            result.status === "fulfilled",
        )
        .flatMap((result) => result.value)
        .filter((invitation) => invitation.role === ADMIN_ROLE)
        .sort(
          (first, second) =>
            new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime(),
        );

      setInvitations(loadedInvitations);

      if (invitationResults.some((result) => result.status === "rejected")) {
        setErrorMessage("Alguns convites não puderam ser carregados agora.");
      }
    } catch (error) {
      setInvitations([]);
      setErrorMessage(getFriendlyErrorMessage(error, "Não foi possível carregar os convites."));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadPageData();
  }, []);

  async function copyInvitationLink(invitation: InvitationResponse) {
    const link = buildInvitationLink(invitation.token);
    setGeneratedLink(link);
    await copyLink(link);
  }

  async function handleRenewInvitation(invitation: InvitationResponse) {
    try {
      setErrorMessage("");
      setSuccessMessage("");
      setGeneratedLink("");
      setIsRenewingId(invitation.id);

      const renewedInvitation = await renewInvitation(invitation.id);
      const link = buildInvitationLink(renewedInvitation.token);

      await loadPageData();
      setGeneratedLink(link);
      setSuccessMessage("Convite renovado com sucesso. O novo link já está disponível.");
      void copyLink(link);
    } catch (error) {
      setErrorMessage(getFriendlyErrorMessage(error, "Não foi possível renovar o convite."));
    } finally {
      setIsRenewingId(null);
    }
  }

  async function handleCancelInvitation(invitation: InvitationResponse) {
    const shouldCancel = window.confirm(
      "Deseja cancelar este convite? O link deixará de funcionar imediatamente.",
    );

    if (!shouldCancel) {
      return;
    }

    try {
      setErrorMessage("");
      setSuccessMessage("");
      setGeneratedLink("");
      setIsCancelingId(invitation.id);

      await cancelInvitation(invitation.id);
      await loadPageData();

      setSuccessMessage("Convite cancelado com sucesso.");
    } catch (error) {
      setErrorMessage(getFriendlyErrorMessage(error, "Não foi possível cancelar o convite."));
    } finally {
      setIsCancelingId(null);
    }
  }

  async function copyLink(link: string) {
    try {
      await navigator.clipboard.writeText(link);
      setSuccessMessage("Link do convite copiado.");
    } catch {
      setSuccessMessage(`Copie o link manualmente: ${link}`);
    }
  }

  return (
    <section className="rounded-[2rem] border border-[#E5E7EB] bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-[#111827]">
            Convites administrativos
          </h1>
          <p className="mt-1 max-w-3xl text-sm font-semibold text-[#6B7280]">
            Acompanhe os convites enviados para administradores dos condomínios
            cadastrados na plataforma.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
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

      {generatedLink && (
        <div className="mt-5 rounded-3xl border border-[#BBF7D0] bg-[#F0FDF4] p-4">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-[#16A34A]">
            Link do convite
          </p>
          <div className="mt-3 flex flex-col gap-3 lg:flex-row lg:items-center">
            <input
              value={generatedLink}
              readOnly
              className="h-11 flex-1 rounded-2xl border border-[#BBF7D0] bg-white px-4 text-sm font-bold text-[#0B3D2E] outline-none"
            />
            <button
              type="button"
              onClick={() => void copyLink(generatedLink)}
              className="h-11 cursor-pointer rounded-2xl bg-[#0B3D2E] px-5 text-sm font-extrabold text-white transition hover:bg-[#16A34A]"
            >
              Copiar link
            </button>
          </div>
        </div>
      )}

      <div className="mt-6 rounded-[1.5rem] border border-[#E5E7EB] bg-[#F3F4F6] p-4">
        <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="relative min-w-0 flex-1">
            <input
              type="text"
              placeholder="Buscar por admin, e-mail, condomínio ou status..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="h-11 w-full rounded-2xl border border-[#E5E7EB] bg-white px-4 pr-12 text-sm font-semibold text-[#111827] outline-none transition placeholder:text-[#9CA3AF] focus:border-[#22C55E] focus:ring-4 focus:ring-[#86EFAC]/30"
            />

            {searchTerm && (
              <button
                type="button"
                aria-label="Limpar busca"
                onClick={() => setSearchTerm("")}
                className="absolute right-2 top-1/2 flex size-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full text-lg font-black leading-none text-[#6B7280] transition hover:bg-[#DCFCE7] hover:text-[#0B3D2E] focus:outline-none focus:ring-4 focus:ring-[#86EFAC]/30"
              >
                ×
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative w-full sm:w-44">
              <button
                type="button"
                onClick={() => setIsStatusFilterOpen((isOpen) => !isOpen)}
                className={`flex h-11 w-full cursor-pointer items-center justify-between rounded-2xl border bg-white px-4 text-sm font-extrabold outline-none transition ${
                  isStatusFilterOpen
                    ? "border-[#22C55E] text-[#0B3D2E] ring-4 ring-[#86EFAC]/30"
                    : "border-[#E5E7EB] text-[#6B7280] hover:border-[#BBF7D0] hover:text-[#0B3D2E]"
                }`}
              >
                <span>
                  {statusFilterOptions.find((option) => option.value === statusFilter)?.label ?? "Status"}
                </span>
                <span
                  className={`block size-2 shrink-0 border-r-2 border-b-2 border-current transition-transform ${
                    isStatusFilterOpen ? "rotate-[225deg] translate-y-0.5" : "rotate-45 -translate-y-0.5"
                  }`}
                  aria-hidden="true"
                />
              </button>

              {isStatusFilterOpen && (
                <div className="absolute right-0 top-13 z-30 w-full overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white p-1 shadow-xl shadow-[#111827]/10">
                  {statusFilterOptions.map((option) => {
                    const isActive = statusFilter === option.value;

                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => {
                          setStatusFilter(option.value);
                          setIsStatusFilterOpen(false);
                        }}
                        className={`flex h-10 w-full cursor-pointer items-center rounded-xl px-3 text-left text-sm font-extrabold transition ${
                          isActive
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

            {(searchTerm || statusFilter !== "all") && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm("");
                  setStatusFilter("all");
                  setIsStatusFilterOpen(false);
                }}
                className="h-11 cursor-pointer rounded-2xl border border-[#E5E7EB] bg-white px-4 text-sm font-extrabold text-[#6B7280] transition hover:bg-[#FDECEC] hover:text-[#B42318]"
              >
                Limpar filtros
              </button>
            )}
          </div>
        </div>

        {isLoading ? (
          <EmptyState message="Carregando convites..." />
        ) : filteredInvitations.length === 0 ? (
          <EmptyState
            message={
              searchTerm || statusFilter !== "all"
                ? "Nenhum convite encontrado."
                : "Nenhum convite criado."
            }
            helper="Convites aparecem aqui após gerar um Admin pela tela de usuários ou pelo condomínio."
          />
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-[#E5E7EB] bg-white">
            <table className="w-full min-w-[1040px] border-collapse text-left text-sm">
              <thead className="bg-[#DCFCE7] text-xs uppercase tracking-wide text-[#0B3D2E]">
                <tr>
                  <th className="px-4 py-3 font-extrabold">Admin</th>
                  <th className="px-4 py-3 font-extrabold">E-mail</th>
                  <th className="px-4 py-3 font-extrabold">Condomínio</th>
                  <th className="px-4 py-3 font-extrabold">Status</th>
                  <th className="px-4 py-3 font-extrabold">Criado em</th>
                  <th className="px-4 py-3 font-extrabold">Data</th>
                  <th className="px-4 py-3 font-extrabold">Ações</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-[#E5E7EB]">
                {filteredInvitations.map((invitation) => {
                  const status = getEffectiveStatus(invitation);
                  const canCopyLink = status === PENDING_STATUS;
                  const canCancel = status === PENDING_STATUS;
                  const canRenew = status === EXPIRED_STATUS;

                  return (
                    <tr key={invitation.id} className="transition hover:bg-[#F3F4F6]">
                      <td className="px-4 py-4 font-extrabold text-[#111827]">
                        {invitation.personName}
                      </td>
                      <td className="px-4 py-4 font-semibold text-[#6B7280]">
                        {invitation.email}
                      </td>
                      <td className="px-4 py-4 font-semibold text-[#6B7280]">
                        {invitation.condominiumName}
                      </td>
                      <td className="px-4 py-4">
                        <StatusBadge
                          label={getStatusLabel(status)}
                          variant={getStatusVariant(status)}
                        />
                      </td>
                      <td className="px-4 py-4 font-semibold text-[#6B7280]">
                        {formatDateTime(invitation.createdAt)}
                      </td>
                      <td className="px-4 py-4 font-semibold text-[#6B7280]">
                        <span className="block text-[0.65rem] font-black uppercase tracking-[0.14em] text-[#16A34A]">
                          {getInvitationDateLabel(status)}
                        </span>
                        <span className="mt-1 block">
                          {formatDateTime(getInvitationDisplayDate(invitation, status))}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap gap-2">
                          {canCopyLink && (
                            <>
                              <button
                                type="button"
                                onClick={() =>
                                  setGeneratedLink(buildInvitationLink(invitation.token))
                                }
                                className="cursor-pointer rounded-xl border border-[#E5E7EB] bg-white px-3 py-1.5 text-xs font-bold text-[#6B7280] transition hover:bg-[#DCFCE7] hover:text-[#0B3D2E]"
                              >
                                Ver link
                              </button>
                              <button
                                type="button"
                                onClick={() => void copyInvitationLink(invitation)}
                                className="cursor-pointer rounded-xl border border-[#E5E7EB] bg-white px-3 py-1.5 text-xs font-bold text-[#6B7280] transition hover:bg-[#DCFCE7] hover:text-[#0B3D2E]"
                              >
                                Copiar
                              </button>
                              <button
                                type="button"
                                disabled={isCancelingId === invitation.id}
                                onClick={() => void handleCancelInvitation(invitation)}
                                className="cursor-pointer rounded-xl border border-[#FECACA] bg-white px-3 py-1.5 text-xs font-bold text-[#B42318] transition hover:bg-[#FDECEC] disabled:cursor-not-allowed disabled:opacity-70"
                              >
                                {isCancelingId === invitation.id ? "Cancelando..." : "Cancelar"}
                              </button>
                            </>
                          )}

                          {canRenew && (
                            <button
                              type="button"
                              disabled={isRenewingId === invitation.id}
                              onClick={() => void handleRenewInvitation(invitation)}
                              className="cursor-pointer rounded-xl border border-[#BBF7D0] bg-[#DCFCE7] px-3 py-1.5 text-xs font-bold text-[#0B3D2E] transition hover:bg-[#BBF7D0] disabled:cursor-not-allowed disabled:opacity-70"
                            >
                              {isRenewingId === invitation.id ? "Renovando..." : "Renovar"}
                            </button>
                          )}

                          {!canCopyLink && !canRenew && !canCancel && (
                            <span className="rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-1.5 text-xs font-bold text-[#6B7280]">
                              Sem ação
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
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
    <div className="rounded-2xl border border-dashed border-[#D0D5DD] bg-white px-6 py-12 text-center">
      <p className="text-lg font-extrabold text-[#111827]">{message}</p>
      {helper && (
        <p className="mt-2 text-sm font-semibold text-[#6B7280]">{helper}</p>
      )}
    </div>
  );
}

function getEffectiveStatus(invitation: InvitationResponse): InvitationStatus {
  if (
    invitation.invitationStatus === PENDING_STATUS &&
    new Date(invitation.expiresAt).getTime() < Date.now()
  ) {
    return EXPIRED_STATUS;
  }

  return invitation.invitationStatus;
}

function getStatusLabel(status: InvitationStatus) {
  if (status === PENDING_STATUS) return "Pendente";
  if (status === ACCEPTED_STATUS) return "Aceito";
  if (status === EXPIRED_STATUS) return "Expirado";
  if (status === CANCELED_STATUS) return "Cancelado";
  return "Recusado";
}

function getStatusVariant(status: InvitationStatus) {
  if (status === ACCEPTED_STATUS) return "success" as const;
  if (status === PENDING_STATUS) return "warning" as const;
  if (status === EXPIRED_STATUS || status === CANCELED_STATUS) return "danger" as const;
  return "neutral" as const;
}

function getInvitationDateLabel(status: InvitationStatus) {
  return status === ACCEPTED_STATUS ? "Aceito em" : "Expira em";
}

function getInvitationDisplayDate(invitation: InvitationResponse, status: InvitationStatus) {
  if (status === ACCEPTED_STATUS) {
    return invitation.acceptedAt || invitation.createdAt;
  }

  return invitation.expiresAt;
}

function formatDateTime(value?: string | null) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getFriendlyErrorMessage(error: unknown, fallback: string) {
  if (!(error instanceof Error)) {
    return fallback;
  }

  const message = error.message;
  const normalizedMessage = message.toLowerCase();

  if (normalizedMessage.includes("pending invitation")) {
    return "Já existe um convite pendente para esta pessoa.";
  }

  if (normalizedMessage.includes("accepted")) {
    return "Este convite já foi aceito.";
  }

  if (normalizedMessage.includes("expired")) {
    return "Este convite não pode ser usado sem renovação.";
  }

  if (normalizedMessage.includes("forbidden")) {
    return "Seu usuário não tem permissão para gerenciar este convite.";
  }

  return message || fallback;
}
