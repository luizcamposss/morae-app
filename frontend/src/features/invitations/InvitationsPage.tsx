import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import { useCondominium } from "../../app/providers/useCondominium";
import { MetricCard } from "../../shared/components/MetricCard";
import { StatusBadge } from "../../shared/components/StatusBadge";
import { getPersonsByCondominium } from "../persons/personService";
import type { PersonResponse } from "../persons/types";
import { createInvitation, getInvitationsByCondominium } from "./invitationService";
import type { CreateInvitationRequest, InvitationResponse, InvitationRole } from "./types";

const roleOptions: Array<{ value: InvitationRole; label: string }> = [
  { value: 4, label: "Morador" },
  { value: 3, label: "Sindico" },
];

function getStatusLabel(invitation: InvitationResponse) {
  if (invitation.statusName) {
    return invitation.statusName;
  }

  if (invitation.invitationStatus === 1) return "Pending";
  if (invitation.invitationStatus === 2) return "Accepted";
  if (invitation.invitationStatus === 4) return "Expired";
  if (invitation.invitationStatus === 5) return "Canceled";
  return "Refused";
}

function getStatusVariant(invitation: InvitationResponse) {
  const status = getStatusLabel(invitation);

  if (status === "Accepted") return "success" as const;
  if (status === "Pending") return "warning" as const;
  if (status === "Expired" || status === "Canceled" || status === "Refused") {
    return "danger" as const;
  }

  return "neutral" as const;
}

function getRoleLabel(invitation: InvitationResponse) {
  if (invitation.roleName) {
    return invitation.roleName;
  }

  return roleOptions.find((option) => option.value === invitation.role)?.label ?? "Nao informado";
}

function buildInvitationLink(token: string) {
  return `${window.location.origin}/accept-invitation/${token}`;
}

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
  const [viewingInvitation, setViewingInvitation] = useState<InvitationResponse | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const requestedPersonId = Number(searchParams.get("personId"));

  const filteredInvitations = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    if (!normalizedSearch) {
      return invitations;
    }

    return invitations.filter((invitation) =>
      invitation.personName.toLowerCase().includes(normalizedSearch) ||
      invitation.email.toLowerCase().includes(normalizedSearch) ||
      getRoleLabel(invitation).toLowerCase().includes(normalizedSearch) ||
      getStatusLabel(invitation).toLowerCase().includes(normalizedSearch),
    );
  }, [invitations, searchTerm]);

  const pendingInvitations = invitations.filter((invitation) => getStatusLabel(invitation) === "Pending").length;
  const acceptedInvitations = invitations.filter((invitation) => getStatusLabel(invitation) === "Accepted").length;
  const expiredInvitations = invitations.filter((invitation) => getStatusLabel(invitation) === "Expired").length;

  const metrics = [
    { label: "Total", value: invitations.length.toString(), helper: "Convites criados" },
    { label: "Pendentes", value: pendingInvitations.toString(), helper: "Aguardando aceite" },
    { label: "Aceitos", value: acceptedInvitations.toString(), helper: "Acesso criado" },
    { label: "Expirados", value: expiredInvitations.toString(), helper: "Precisam de novo convite" },
  ];

  async function loadInvitations(condominiumId: number) {
    try {
      setErrorMessage("");
      setSuccessMessage("");
      setIsLoadingInvitations(true);

      const [invitationsResult, peopleResult] = await Promise.all([
        getInvitationsByCondominium(condominiumId),
        getPersonsByCondominium(condominiumId),
      ]);

      setInvitations(invitationsResult);
      setPeople(peopleResult);

      if (requestedPersonId && peopleResult.some((person) => person.id === requestedPersonId)) {
        setIsCreateOpen(true);
      }
    } catch (error) {
      setInvitations([]);
      setPeople([]);

      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("Nao foi possivel carregar os convites.");
      }
    } finally {
      setIsLoadingInvitations(false);
    }
  }

  async function refreshInvitations() {
    if (!activeCondominiumId) {
      return;
    }

    await loadInvitations(activeCondominiumId);
  }

  useEffect(() => {
    if (!activeCondominiumId) {
      setInvitations([]);
      setPeople([]);
      setIsLoadingInvitations(false);
      return;
    }

    void loadInvitations(activeCondominiumId);
  }, [activeCondominiumId]);

  async function copyInvitationLink(invitation: InvitationResponse) {
    try {
      await navigator.clipboard.writeText(buildInvitationLink(invitation.token));
      setSuccessMessage("Link do convite copiado.");
    } catch {
      setSuccessMessage(buildInvitationLink(invitation.token));
    }
  }

  const isLoading = isLoadingCondominiums || isLoadingInvitations;
  const pageErrorMessage = condominiumErrorMessage || errorMessage;

  function closeCreateModal() {
    setIsCreateOpen(false);
    setSearchParams({}, { replace: true });
  }

  return (
    <>
      <section className="rounded-[2rem] border border-[#E5E7EB] bg-white p-6 shadow-sm">
        <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-[#111827]">
              Convites
            </h1>
            <p className="mt-1 text-sm font-semibold text-[#6B7280]">
              Crie acessos para moradores e sindicos usando pessoas ja cadastradas.
            </p>
            {activeCondominium && (
              <p className="mt-2 text-sm font-semibold text-[#16A34A]">
                Condominio ativo: {activeCondominium.condominiumName}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-3 md:items-end">
            {condominiums.length > 1 && (
              <select
                value={activeCondominiumId ?? ""}
                onChange={(event) => setActiveCondominiumId(Number(event.target.value))}
                className="h-11 min-w-72 rounded-2xl border border-[#E5E7EB] bg-white px-4 text-sm font-bold text-[#111827] outline-none transition focus:border-[#22C55E] focus:ring-4 focus:ring-[#86EFAC]/30"
              >
                {condominiums.map((condominium) => (
                  <option
                    key={condominium.condominiumId}
                    value={condominium.condominiumId}
                  >
                    {condominium.condominiumName}
                  </option>
                ))}
              </select>
            )}

            <button
              type="button"
              disabled={!activeCondominiumId || people.length === 0}
              onClick={() => setIsCreateOpen(true)}
              className="h-11 rounded-2xl bg-[#16A34A] px-5 text-sm font-extrabold text-white shadow-sm shadow-[#16A34A]/30 transition hover:bg-[#0B3D2E] disabled:cursor-not-allowed disabled:opacity-70"
            >
              + Novo Convite
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

        <div className="mt-6 rounded-[1.5rem] border border-[#E5E7EB] bg-[#F3F4F6] p-4">
          <div className="mb-4 flex flex-col gap-3 md:flex-row">
            <input
              type="search"
              placeholder="Buscar pessoa, e-mail, papel ou status..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="h-11 flex-1 rounded-2xl border border-[#E5E7EB] bg-white px-4 text-sm font-semibold text-[#111827] outline-none transition placeholder:text-[#9CA3AF] focus:border-[#22C55E] focus:ring-4 focus:ring-[#86EFAC]/30"
            />

            <button
              type="button"
              onClick={() => setSearchTerm("")}
              className="h-11 rounded-2xl border border-[#E5E7EB] bg-white px-5 text-sm font-bold text-[#6B7280] transition hover:bg-[#DCFCE7] hover:text-[#0B3D2E]"
            >
              Todos
            </button>
          </div>

          {isLoading && (
            <p className="mb-4 text-sm font-semibold text-[#6B7280]">
              Carregando convites...
            </p>
          )}

          {pageErrorMessage && (
            <p className="mb-4 text-sm font-semibold text-[#B42318]">
              {pageErrorMessage}
            </p>
          )}

          {successMessage && (
            <p className="mb-4 text-sm font-semibold text-[#16A34A]">
              {successMessage}
            </p>
          )}

          {!isLoading && filteredInvitations.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#D0D5DD] bg-white px-6 py-12 text-center">
              <p className="text-lg font-extrabold text-[#111827]">
                {searchTerm ? "Nenhum convite encontrado" : "Nenhum convite criado"}
              </p>
              <p className="mt-2 text-sm font-semibold text-[#6B7280]">
                {people.length === 0
                  ? "Cadastre uma pessoa antes de enviar um convite."
                  : "Crie o primeiro convite para transformar uma pessoa em usuario do sistema."}
              </p>
              {!searchTerm && people.length > 0 && (
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(true)}
                  className="mt-6 h-11 rounded-2xl bg-[#16A34A] px-5 text-sm font-extrabold text-white shadow-sm shadow-[#16A34A]/30 transition hover:bg-[#0B3D2E]"
                >
                  + Novo Convite
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white">
              <table className="w-full border-collapse text-left text-sm">
                <thead className="bg-[#DCFCE7] text-xs uppercase tracking-wide text-[#0B3D2E]">
                  <tr>
                    <th className="px-4 py-3 font-extrabold">Pessoa</th>
                    <th className="px-4 py-3 font-extrabold">E-mail</th>
                    <th className="px-4 py-3 font-extrabold">Papel</th>
                    <th className="px-4 py-3 font-extrabold">Status</th>
                    <th className="px-4 py-3 font-extrabold">Acoes</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-[#E5E7EB]">
                  {filteredInvitations.map((invitation) => (
                    <tr key={invitation.id} className="transition hover:bg-[#F3F4F6]">
                      <td className="px-4 py-4 font-extrabold text-[#111827]">
                        <div>{invitation.personName}</div>
                        <div className="mt-1 text-xs font-semibold text-[#6B7280]">
                          {invitation.condominiumName}
                        </div>
                      </td>
                      <td className="px-4 py-4 font-semibold text-[#6B7280]">
                        {invitation.email}
                      </td>
                      <td className="px-4 py-4 font-semibold text-[#6B7280]">
                        {getRoleLabel(invitation)}
                      </td>
                      <td className="px-4 py-4">
                        <StatusBadge
                          label={getStatusLabel(invitation)}
                          variant={getStatusVariant(invitation)}
                        />
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => setViewingInvitation(invitation)}
                            className="rounded-xl border border-[#E5E7EB] bg-white px-3 py-1.5 text-xs font-bold text-[#6B7280] transition hover:bg-[#DCFCE7] hover:text-[#0B3D2E]"
                          >
                            Ver
                          </button>
                          <button
                            type="button"
                            onClick={() => void copyInvitationLink(invitation)}
                            className="rounded-xl border border-[#E5E7EB] bg-white px-3 py-1.5 text-xs font-bold text-[#6B7280] transition hover:bg-[#DCFCE7] hover:text-[#0B3D2E]"
                          >
                            Copiar link
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <p className="mt-4 text-sm font-semibold text-[#6B7280]">
            Admins podem convidar apenas sindicos e moradores do condominio ativo.
          </p>
        </div>
      </section>

      {isCreateOpen && activeCondominiumId && (
        <CreateInvitationModal
          condominiumId={activeCondominiumId}
          people={people}
          initialPersonId={requestedPersonId || undefined}
          onClose={closeCreateModal}
          onCreated={async (invitation) => {
            await refreshInvitations();
            setSearchParams({}, { replace: true });
            setSuccessMessage(`Convite criado. Link: ${buildInvitationLink(invitation.token)}`);
          }}
        />
      )}

      {viewingInvitation && (
        <InvitationDetailsModal
          invitation={viewingInvitation}
          onClose={() => setViewingInvitation(null)}
          onCopy={() => void copyInvitationLink(viewingInvitation)}
        />
      )}
    </>
  );
}

type CreateInvitationModalProps = {
  condominiumId: number;
  people: PersonResponse[];
  initialPersonId?: number;
  onClose: () => void;
  onCreated: (invitation: InvitationResponse) => Promise<void>;
};

function CreateInvitationModal({
  condominiumId,
  people,
  initialPersonId,
  onClose,
  onCreated,
}: CreateInvitationModalProps) {
  const [form, setForm] = useState<CreateInvitationRequest>({
    condominiumId,
    personId: initialPersonId && people.some((person) => person.id === initialPersonId)
      ? initialPersonId
      : people[0]?.id ?? 0,
    email: "",
    role: 4,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setIsSubmitting(true);

    try {
      const invitation = await createInvitation(form);
      await onCreated(invitation);
      onClose();
    } catch (error) {
      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("Nao foi possivel criar o convite.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <ModalShell title="Novo Convite" onClose={onClose}>
      <form className="space-y-6" onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <SelectField
            label="Pessoa"
            value={form.personId}
            onChange={(value) => setForm((current) => ({ ...current, personId: value }))}
            options={people.map((person) => ({
              value: person.id,
              label: `${person.name} - CPF ${person.cpf}`,
            }))}
          />

          <SelectField
            label="Papel"
            value={form.role}
            onChange={(value) =>
              setForm((current) => ({
                ...current,
                role: value as InvitationRole,
              }))
            }
            options={roleOptions}
          />

          <Field
            label="E-mail"
            value={form.email}
            onChange={(value) => setForm((current) => ({ ...current, email: value }))}
            placeholder="morador@email.com"
          />
        </div>

        {errorMessage && (
          <p className="text-sm font-semibold text-[#B42318]">
            {errorMessage}
          </p>
        )}

        <button
          type="submit"
          disabled={isSubmitting || !form.personId}
          className="h-12 w-full rounded-2xl bg-[#16A34A] text-sm font-extrabold text-white shadow-sm shadow-[#16A34A]/30 transition hover:bg-[#0B3D2E] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSubmitting ? "Criando..." : "Criar convite"}
        </button>
      </form>
    </ModalShell>
  );
}

function InvitationDetailsModal({
  invitation,
  onClose,
  onCopy,
}: {
  invitation: InvitationResponse;
  onClose: () => void;
  onCopy: () => void;
}) {
  return (
    <ModalShell title="Detalhes do Convite" onClose={onClose}>
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <ReadOnlyField label="Pessoa" value={invitation.personName} />
          <ReadOnlyField label="E-mail" value={invitation.email} />
          <ReadOnlyField label="Condominio" value={invitation.condominiumName} />
          <ReadOnlyField label="Papel" value={getRoleLabel(invitation)} />
          <ReadOnlyField label="Status" value={getStatusLabel(invitation)} />
          <ReadOnlyField
            label="Expira em"
            value={new Date(invitation.expiresAt).toLocaleString("pt-BR")}
          />
        </div>

        <section className="rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] p-5">
          <h3 className="text-sm font-extrabold uppercase tracking-wide text-[#0B3D2E]">
            Link de aceite
          </h3>
          <p className="mt-2 break-all text-sm font-semibold text-[#6B7280]">
            {buildInvitationLink(invitation.token)}
          </p>
          <button
            type="button"
            onClick={onCopy}
            className="mt-4 h-10 rounded-2xl bg-[#16A34A] px-5 text-sm font-extrabold text-white transition hover:bg-[#0B3D2E]"
          >
            Copiar link
          </button>
        </section>
      </div>
    </ModalShell>
  );
}

function ModalShell({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0B3D2E]/30 px-6 py-8 backdrop-blur-sm">
      <div className="w-full max-w-3xl overflow-hidden rounded-[2rem] bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#E5E7EB] px-6 py-5">
          <h2 className="text-xl font-extrabold text-[#111827]">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-[#F3F4F6] px-3 py-1 text-sm font-extrabold text-[#6B7280] transition hover:bg-[#FDECEC] hover:text-[#B42318]"
          >
            Fechar
          </button>
        </div>

        <div className="max-h-[75vh] overflow-y-auto px-6 py-6">
          {children}
        </div>
      </div>
    </div>
  );
}

type FieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
};

function Field({ label, value, onChange, placeholder }: FieldProps) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-extrabold text-[#111827]">
        {label}
      </span>
      <input
        type="email"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-11 w-full rounded-2xl border border-[#E5E7EB] bg-white px-4 text-sm font-bold text-[#111827] outline-none transition placeholder:text-[#9CA3AF] focus:border-[#22C55E] focus:ring-4 focus:ring-[#86EFAC]/30"
      />
    </label>
  );
}

type SelectFieldProps = {
  label: string;
  value: number;
  onChange: (value: number) => void;
  options: Array<{ value: number; label: string }>;
};

function SelectField({ label, value, onChange, options }: SelectFieldProps) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-extrabold text-[#111827]">
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-11 w-full rounded-2xl border border-[#E5E7EB] bg-white px-4 text-sm font-bold text-[#111827] outline-none transition focus:border-[#22C55E] focus:ring-4 focus:ring-[#86EFAC]/30"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-extrabold text-[#111827]">
        {label}
      </span>
      <input
        type="text"
        value={value}
        readOnly
        className="h-11 w-full rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] px-4 text-sm font-bold text-[#111827] outline-none"
      />
    </label>
  );
}
