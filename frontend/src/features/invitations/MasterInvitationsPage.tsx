import { useEffect, useMemo, useState } from "react";
import { getCondominiums } from "../condominiums/condominiumService";
import type { CondominiumResponse } from "../condominiums/types";
import { MetricCard } from "../../shared/components/MetricCard";
import { StatusBadge } from "../../shared/components/StatusBadge";
import { getInvitationsByCondominium, renewInvitation } from "./invitationService";
import type { InvitationResponse, InvitationStatus } from "./types";

const ADMIN_ROLE = 2;
const PENDING_STATUS = 1;
const ACCEPTED_STATUS = 2;
const EXPIRED_STATUS = 4;
const CANCELED_STATUS = 5;

type CondominiumFilter = "all" | number;
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
  const [condominiums, setCondominiums] = useState<CondominiumResponse[]>([]);
  const [selectedCondominiumId, setSelectedCondominiumId] =
    useState<CondominiumFilter>("all");
  const [invitations, setInvitations] = useState<InvitationResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRenewingId, setIsRenewingId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [generatedLink, setGeneratedLink] = useState("");

  const selectedCondominium =
    selectedCondominiumId === "all"
      ? null
      : condominiums.find((condominium) => condominium.id === selectedCondominiumId) ??
        null;

  const scopedInvitations = useMemo(() => {
    if (selectedCondominiumId === "all") {
      return invitations;
    }

    return invitations.filter(
      (invitation) => invitation.condominiumId === selectedCondominiumId,
    );
  }, [invitations, selectedCondominiumId]);

  const filteredInvitations = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return scopedInvitations.filter((invitation) => {
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
  }, [scopedInvitations, searchTerm, statusFilter]);

  const pendingInvitations = scopedInvitations.filter(
    (invitation) => getEffectiveStatus(invitation) === PENDING_STATUS,
  );

  const acceptedInvitations = scopedInvitations.filter(
    (invitation) => getEffectiveStatus(invitation) === ACCEPTED_STATUS,
  );

  const expiredInvitations = scopedInvitations.filter(
    (invitation) => getEffectiveStatus(invitation) === EXPIRED_STATUS,
  );

  const metrics = [
    {
      label: "Total",
      value: scopedInvitations.length.toString(),
      helper: "Convites reais de Admin",
    },
    {
      label: "Pendentes",
      value: pendingInvitations.length.toString(),
      helper: "Aguardando aceite",
    },
    {
      label: "Aceitos",
      value: acceptedInvitations.length.toString(),
      helper: "Admins criados",
    },
    {
      label: "Expirados",
      value: expiredInvitations.length.toString(),
      helper: "Precisam de renovação",
    },
  ];

  async function loadPageData() {
    try {
      setIsLoading(true);
      setErrorMessage("");

      const condominiumResult = await getCondominiums();
      setCondominiums(condominiumResult);

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
      setCondominiums([]);
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
            Convites de Admin
          </h1>
          <p className="mt-1 max-w-3xl text-sm font-semibold text-[#6B7280]">
            Acompanhe convites reais gerados para administradores dos condomínios
            criados pelo Master.
          </p>
          <p className="mt-2 text-sm font-bold text-[#16A34A]">
            {selectedCondominium
              ? `Condomínio selecionado: ${selectedCondominium.name}`
              : "Visualizando todos os condomínios"}
          </p>
        </div>

        <div className="flex flex-col gap-3 lg:items-end">
          <select
            value={selectedCondominiumId}
            onChange={(event) => {
              const value = event.target.value;
              setGeneratedLink("");
              setSuccessMessage("");
              setSelectedCondominiumId(
                value === "all" ? "all" : Number(value),
              );
            }}
            disabled={condominiums.length === 0}
            className="h-11 min-w-full cursor-pointer rounded-2xl border border-[#E5E7EB] bg-white px-4 text-sm font-bold text-[#111827] outline-none transition focus:border-[#22C55E] focus:ring-4 focus:ring-[#86EFAC]/30 disabled:cursor-not-allowed disabled:opacity-70 sm:min-w-72"
          >
            <option value="all">Todos os condomínios</option>
            {condominiums.map((condominium) => (
              <option key={condominium.id} value={condominium.id}>
                {condominium.name}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => void loadPageData()}
            disabled={isLoading}
            className="h-11 w-full cursor-pointer rounded-2xl border border-[#E5E7EB] bg-white px-5 text-sm font-extrabold text-[#0B3D2E] transition hover:bg-[#DCFCE7] disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto"
          >
            {isLoading ? "Atualizando..." : "Atualizar"}
          </button>
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
        <div className="mb-4 flex flex-col gap-3 lg:flex-row">
          <input
            type="search"
            placeholder="Buscar admin, e-mail, condomínio ou status..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className="h-11 flex-1 rounded-2xl border border-[#E5E7EB] bg-white px-4 text-sm font-semibold text-[#111827] outline-none transition placeholder:text-[#9CA3AF] focus:border-[#22C55E] focus:ring-4 focus:ring-[#86EFAC]/30"
          />

          <select
            value={statusFilter}
            onChange={(event) => {
              const value = event.target.value;
              setStatusFilter(
                value === "all" ? "all" : (Number(value) as InvitationStatus),
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
          <EmptyState message="Carregando convites..." />
        ) : filteredInvitations.length === 0 ? (
          <EmptyState
            message={
              searchTerm || statusFilter !== "all" || selectedCondominiumId !== "all"
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
                  <th className="px-4 py-3 font-extrabold">Expira em</th>
                  <th className="px-4 py-3 font-extrabold">Ações</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-[#E5E7EB]">
                {filteredInvitations.map((invitation) => {
                  const status = getEffectiveStatus(invitation);
                  const canCopyLink = status === PENDING_STATUS;
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
                        {formatDateTime(invitation.expiresAt)}
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

                          {!canCopyLink && !canRenew && (
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

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
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
