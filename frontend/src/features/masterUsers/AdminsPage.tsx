import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ChevronRight, Clock, Copy, Plus, RotateCw, Search, X } from "lucide-react";
import { Button } from "../../shared/components/Button";
import { ConfirmDialog, type ConfirmRequest } from "../../shared/components/ConfirmDialog";
import { SummaryCard } from "../../shared/components/SummaryCard";
import { PageHeader } from "../../shared/layout/PageHeader";
import { formatDate, formatDateTime } from "../../shared/lib/date";
import { getCondominiums } from "../condominiums/condominiumService";
import type { CondominiumResponse } from "../condominiums/types";
import { AdminInvitationModal } from "../invitations/AdminInvitationModal";
import { cancelInvitation, createInvitation, getInvitationsByCondominium, renewInvitation } from "../invitations/invitationService";
import { getInvitationLink } from "../invitations/invitationLink";
import type { InvitationResponse } from "../invitations/types";
import { EXPIRED_INVITATION_STATUS, groupOpenAdminInvitations } from "../masterCondominiums/condominiumBilling";
import { ADMIN_ROLE, type CreateAdminInvitationRequest } from "../masterCondominiums/condominiumForm";
import { createPerson } from "../persons/personService";
import { AdminDetailsModal, AdminInitials, type AdminGroup } from "./AdminDetailsModal";
import { deleteCondominiumUser, getMasterUsers, reactivateCondominiumUser, suspendCondominiumUser } from "./masterUserService";
import { SuspendAccessModal } from "./SuspendAccessModal";
import type { MasterUserResponse } from "./types";

const ACTIVE_STATUS = 1;

type Tab = "admins" | "invitations";
type Notice = { tone: "success" | "danger"; text: string };

async function fetchPageData() {
  const [users, condominiums] = await Promise.all([getMasterUsers(), getCondominiums()]);
  const invitationResults = await Promise.allSettled(condominiums.map((condominium) => getInvitationsByCondominium(condominium.id)));
  const invitations = invitationResults.flatMap((result) => (result.status === "fulfilled" ? result.value : []));

  return { users, condominiums, invitations };
}

// One entry per person, with every condominium they administer.
function groupByPerson(users: MasterUserResponse[]): AdminGroup[] {
  const groups = new Map<number, AdminGroup>();

  for (const user of users) {
    const group = groups.get(user.userId) ?? { userId: user.userId, personName: user.personName, email: user.email, accesses: [] };
    group.accesses.push(user);
    groups.set(user.userId, group);
  }

  return [...groups.values()].sort((a, b) => a.personName.localeCompare(b.personName, "pt-BR"));
}

export function AdminsPage() {
  const [users, setUsers] = useState<MasterUserResponse[]>([]);
  const [condominiums, setCondominiums] = useState<CondominiumResponse[]>([]);
  const [invitations, setInvitations] = useState<InvitationResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("admins");
  const [search, setSearch] = useState("");
  const [notice, setNotice] = useState<Notice | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [accessToSuspend, setAccessToSuspend] = useState<MasterUserResponse | null>(null);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [confirmRequest, setConfirmRequest] = useState<ConfirmRequest | null>(null);

  function applyPageData(data: Awaited<ReturnType<typeof fetchPageData>>) {
    setUsers(data.users);
    setCondominiums(data.condominiums);
    setInvitations(data.invitations);
  }

  function showError(error: unknown, fallback: string) {
    setNotice({ tone: "danger", text: error instanceof Error ? error.message : fallback });
  }

  async function reload() {
    try {
      applyPageData(await fetchPageData());
    } catch (error) {
      showError(error, "Não foi possível carregar os administradores.");
    }
  }

  useEffect(() => {
    let isMounted = true;

    fetchPageData()
      .then((data) => isMounted && applyPageData(data))
      .catch((error) => isMounted && showError(error, "Não foi possível carregar os administradores."))
      .finally(() => isMounted && setIsLoading(false));

    return () => {
      isMounted = false;
    };
  }, []);

  const admins = useMemo(() => groupByPerson(users), [users]);
  const openInvitations = useMemo(
    () =>
      [...groupOpenAdminInvitations(invitations).values()]
        .flat()
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [invitations],
  );
  const condominiumName = (id: number) => condominiums.find((condominium) => condominium.id === id)?.name ?? "";

  const activeAdminCount = admins.filter((admin) => admin.accesses.some((access) => access.status === ACTIVE_STATUS)).length;
  const suspendedAccessCount = users.filter((user) => user.status !== ACTIVE_STATUS).length;
  const pendingCount = openInvitations.filter((invitation) => invitation.invitationStatus !== EXPIRED_INVITATION_STATUS).length;
  const coveredIds = new Set(users.filter((user) => user.status === ACTIVE_STATUS).map((user) => user.condominiumId));
  const withoutAdmin = condominiums.filter((condominium) => condominium.status === ACTIVE_STATUS && !coveredIds.has(condominium.id));

  const term = search.trim().toLowerCase();
  const visibleAdmins = admins.filter(
    (admin) =>
      !term ||
      [admin.personName, admin.email, ...admin.accesses.map((access) => access.condominiumName)].join(" ").toLowerCase().includes(term),
  );
  const visibleInvitations = openInvitations.filter(
    (invitation) =>
      !term || [invitation.personName, invitation.email, invitation.condominiumName].join(" ").toLowerCase().includes(term),
  );

  const selectedAdmin = admins.find((admin) => admin.userId === selectedUserId) ?? null;

  async function runAction(action: () => Promise<unknown>, success: string, fallback: string) {
    try {
      setNotice(null);
      await action();
      setNotice({ tone: "success", text: success });
      await reload();
    } catch (error) {
      showError(error, fallback);
    }
  }

  async function copyText(text: string, success: string) {
    try {
      await navigator.clipboard.writeText(text);
      setNotice({ tone: "success", text: success });
    } catch {
      setNotice({ tone: "danger", text: "Não foi possível copiar. Tente de novo." });
    }
  }

  async function handleInvite(data: CreateAdminInvitationRequest) {
    try {
      setIsSaving(true);
      setNotice(null);
      const person = await createPerson({ name: data.name, cpf: data.cpf, phoneNumber: data.phoneNumber });
      await createInvitation({ condominiumId: data.condominiumId, personId: person.id, email: data.email, role: ADMIN_ROLE });
      setIsInviteOpen(false);
      setTab("invitations");
      setNotice({ tone: "success", text: `Convite enviado para ${data.email}.` });
      await reload();
    } catch (error) {
      showError(error, "Não foi possível enviar o convite.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSuspend(reason: string) {
    if (!accessToSuspend) return;
    const access = accessToSuspend;
    setIsSaving(true);
    await runAction(
      () => suspendCondominiumUser(access.condominiumId, access.userId, { suspensionReason: reason || undefined }),
      `${access.personName} suspenso no ${access.condominiumName}.`,
      "Não foi possível suspender o acesso.",
    );
    setIsSaving(false);
    setAccessToSuspend(null);
  }

  function askRemove(access: MasterUserResponse) {
    setConfirmRequest({
      title: `Remover ${access.personName} do ${access.condominiumName}?`,
      description: "A pessoa deixa de administrar este condomínio. Para voltar, é preciso enviar um novo convite.",
      confirmLabel: "Remover acesso",
      tone: "danger",
      onConfirm: () =>
        runAction(
          () => deleteCondominiumUser(access.condominiumId, access.userId),
          "Acesso removido.",
          "Não foi possível remover o acesso.",
        ),
    });
  }

  function askCancelInvitation(invitation: InvitationResponse) {
    setConfirmRequest({
      title: "Cancelar o convite?",
      description: `O link enviado para ${invitation.email} deixa de funcionar.`,
      confirmLabel: "Cancelar convite",
      tone: "danger",
      onConfirm: () => runAction(() => cancelInvitation(invitation.id), "Convite cancelado.", "Não foi possível cancelar o convite."),
    });
  }

  return (
    <>
      <PageHeader
        overline={isLoading ? undefined : `${activeAdminCount} admin${activeAdminCount === 1 ? "" : "s"} · ${coveredIds.size} condomínio${coveredIds.size === 1 ? "" : "s"} atendido${coveredIds.size === 1 ? "" : "s"}`}
        title="Administradores"
      >
        <Button variant="quiet" size="sm" onClick={() => setIsInviteOpen(true)} className="bg-superficie shadow-whisper hover:bg-campo">
          <Plus size={16} strokeWidth={2} aria-hidden />
          Convidar admin
        </Button>
      </PageHeader>

      {notice && !selectedAdmin && (
        <p
          role={notice.tone === "danger" ? "alert" : "status"}
          className={`mb-5 rounded-field px-4 py-3 text-sm font-medium ${notice.tone === "danger" ? "bg-vermelho-suave text-vermelho" : "bg-verde-suave text-verde-tinta"}`}
        >
          {notice.text}
        </p>
      )}

      <SummaryCard
        items={[
          { label: "Admins ativos", value: isLoading ? "–" : String(activeAdminCount), detail: `em ${coveredIds.size} condomínio${coveredIds.size === 1 ? "" : "s"}`, tone: "good" },
          { label: "Acessos suspensos", value: isLoading ? "–" : String(suspendedAccessCount), detail: "aguardando reativação" },
          { label: "Convites pendentes", value: isLoading ? "–" : String(pendingCount), detail: "ainda não criaram a senha" },
          {
            label: "Condomínios sem admin",
            value: isLoading ? "–" : String(withoutAdmin.length),
            detail: withoutAdmin.length ? withoutAdmin.slice(0, 2).map((condominium) => condominium.name).join(", ") + (withoutAdmin.length > 2 ? "…" : "") : "todos atendidos",
            tone: withoutAdmin.length ? "danger" : "neutral",
          },
        ]}
      />

      <div className="mb-4 mt-8 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div role="tablist" aria-label="Administradores e convites" className="inline-flex self-start rounded-block bg-menu p-1">
          {(
            [
              { key: "admins", label: "Admins", count: admins.length },
              { key: "invitations", label: "Convites", count: openInvitations.length },
            ] as const
          ).map((item) => (
            <button
              key={item.key}
              type="button"
              role="tab"
              aria-selected={tab === item.key}
              onClick={() => setTab(item.key)}
              className={`flex items-center gap-1.5 rounded-field px-3.5 py-1.5 text-sm font-semibold transition-colors ${
                tab === item.key ? "bg-superficie text-tinta shadow-whisper" : "text-tinta-suave hover:text-tinta"
              }`}
            >
              {item.label}
              <span className="text-xs font-medium tabular-nums text-tinta-suave">{item.count}</span>
            </button>
          ))}
        </div>

        <label className="relative lg:w-72">
          <span className="sr-only">Buscar</span>
          <Search size={17} strokeWidth={1.8} aria-hidden className="pointer-events-none absolute inset-y-0 left-3.5 my-auto text-tinta-suave" />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Nome, e-mail ou condomínio"
            className="w-full rounded-full bg-superficie py-2.5 pl-10 pr-4 text-sm text-tinta shadow-whisper outline-none placeholder:text-tinta-suave/80 focus:ring-2 focus:ring-verde focus-visible:outline-none"
          />
        </label>
      </div>

      <ul className="divide-y divide-linha overflow-hidden rounded-card bg-superficie shadow-whisper">
        {tab === "admins" ? (
          visibleAdmins.length === 0 ? (
            <EmptyRow>{isLoading ? "Carregando…" : term ? "Nenhum admin encontrado para essa busca." : "Nenhum admin ainda. Convide o primeiro."}</EmptyRow>
          ) : (
            visibleAdmins.map((admin) => {
              const suspended = admin.accesses.filter((access) => access.status !== ACTIVE_STATUS).length;
              return (
                <li key={admin.userId}>
                  <button
                    type="button"
                    onClick={() => {
                      setNotice(null);
                      setSelectedUserId(admin.userId);
                    }}
                    className="flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-campo/60"
                  >
                    <AdminInitials name={admin.personName} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-semibold text-tinta">{admin.personName}</span>
                      <span className="block truncate text-[13px] text-tinta-suave">{admin.email}</span>
                      <span className="mt-1.5 flex flex-wrap gap-1.5">
                        {admin.accesses.slice(0, 3).map((access) => (
                          <span
                            key={access.condominiumId}
                            className={`rounded-chip px-2 py-0.5 text-xs font-medium ${access.status === ACTIVE_STATUS ? "bg-campo text-tinta" : "bg-vermelho-suave text-vermelho"}`}
                          >
                            {access.condominiumName}
                          </span>
                        ))}
                        {admin.accesses.length > 3 && (
                          <span className="rounded-chip bg-campo px-2 py-0.5 text-xs font-medium text-tinta-suave">+{admin.accesses.length - 3}</span>
                        )}
                      </span>
                    </span>
                    <span className="hidden text-right text-[13px] sm:block">
                      <span className={`block font-semibold ${suspended ? "text-vermelho" : "text-verde-tinta"}`}>
                        {suspended ? `${suspended} suspenso${suspended > 1 ? "s" : ""}` : "Ativo"}
                      </span>
                      <span className="block text-tinta-suave">
                        {admin.accesses.length} condomínio{admin.accesses.length > 1 ? "s" : ""}
                      </span>
                    </span>
                    <ChevronRight size={18} strokeWidth={1.8} aria-hidden className="shrink-0 text-tinta-suave" />
                  </button>
                </li>
              );
            })
          )
        ) : visibleInvitations.length === 0 ? (
          <EmptyRow>{isLoading ? "Carregando…" : term ? "Nenhum convite encontrado para essa busca." : "Nenhum convite aberto."}</EmptyRow>
        ) : (
          visibleInvitations.map((invitation) => {
            const isExpired = invitation.invitationStatus === EXPIRED_INVITATION_STATUS;
            return (
              <li key={invitation.id} className="flex flex-wrap items-center gap-4 px-5 py-4">
                <span
                  aria-hidden
                  className={`grid size-10 shrink-0 place-items-center rounded-full ${isExpired ? "bg-vermelho-suave text-vermelho" : "bg-ambar-suave text-ambar"}`}
                >
                  <Clock size={17} strokeWidth={1.8} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-semibold text-tinta">{invitation.personName || invitation.email}</span>
                  <span className="block truncate text-[13px] text-tinta-suave">
                    {invitation.email} · {invitation.condominiumName || condominiumName(invitation.condominiumId)}
                  </span>
                  <span className={`block text-xs ${isExpired ? "text-vermelho" : "text-ambar"}`}>
                    Enviado em {formatDate(invitation.createdAt)} · {isExpired ? "venceu" : "vence"} {formatDateTime(invitation.expiresAt)}
                  </span>
                </span>
                <span className="flex shrink-0 gap-1">
                  {isExpired ? (
                    <IconAction
                      label="Reenviar com um novo link"
                      icon={<RotateCw size={16} strokeWidth={1.8} aria-hidden />}
                      onClick={() =>
                        void runAction(() => renewInvitation(invitation.id), `Novo link enviado para ${invitation.email}.`, "Não foi possível reenviar o convite.")
                      }
                    />
                  ) : (
                    <IconAction
                      label="Copiar link do convite"
                      icon={<Copy size={16} strokeWidth={1.8} aria-hidden />}
                      onClick={() => void copyText(getInvitationLink(invitation.token), `Link do convite de ${invitation.email} copiado.`)}
                    />
                  )}
                  <IconAction label="Cancelar convite" icon={<X size={16} strokeWidth={1.8} aria-hidden />} onClick={() => askCancelInvitation(invitation)} />
                </span>
              </li>
            );
          })
        )}
      </ul>

      {selectedAdmin && (
        <AdminDetailsModal
          admin={selectedAdmin}
          notice={notice ?? undefined}
          onClose={() => {
            setSelectedUserId(null);
            setNotice(null);
          }}
          onCopyEmail={() => void copyText(selectedAdmin.email, "E-mail copiado.")}
          onSuspend={setAccessToSuspend}
          onReactivate={(access) =>
            void runAction(
              () => reactivateCondominiumUser(access.condominiumId, access.userId),
              `${access.personName} reativado no ${access.condominiumName}.`,
              "Não foi possível reativar o acesso.",
            )
          }
          onRemove={askRemove}
        />
      )}

      {accessToSuspend && (
        <SuspendAccessModal
          personName={accessToSuspend.personName}
          condominiumName={accessToSuspend.condominiumName}
          isSaving={isSaving}
          onClose={() => setAccessToSuspend(null)}
          onConfirm={handleSuspend}
        />
      )}

      {isInviteOpen && (
        <AdminInvitationModal
          condominiums={condominiums.filter((condominium) => condominium.status === ACTIVE_STATUS)}
          isSaving={isSaving}
          errorMessage={notice?.tone === "danger" ? notice.text : ""}
          onClose={() => setIsInviteOpen(false)}
          onConfirm={handleInvite}
        />
      )}

      {confirmRequest && <ConfirmDialog request={confirmRequest} onClose={() => setConfirmRequest(null)} />}
    </>
  );
}

function EmptyRow({ children }: { children: ReactNode }) {
  return <li className="px-5 py-10 text-center text-sm text-tinta-suave">{children}</li>;
}

function IconAction({ label, icon, onClick }: { label: string; icon: ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="grid size-9 place-items-center rounded-full text-tinta-suave transition-colors hover:bg-campo hover:text-tinta"
    >
      {icon}
    </button>
  );
}
