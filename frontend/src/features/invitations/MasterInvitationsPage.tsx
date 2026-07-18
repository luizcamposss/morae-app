import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { getCondominiums } from "../condominiums/condominiumService";
import type { CondominiumResponse } from "../condominiums/types";
import { createPerson } from "../persons/personService";
import type { CreatePersonRequest } from "../persons/types";
import { MetricCard } from "../../shared/components/MetricCard";
import { StatusBadge } from "../../shared/components/StatusBadge";
import { createInvitation, getInvitationsByCondominium } from "./invitationService";
import type { InvitationResponse } from "./types";

const emptyPerson: CreatePersonRequest = {
  name: "",
  cpf: "",
  phoneNumber: "",
};

function getStatusLabel(invitation: InvitationResponse) {
  if (invitation.statusName) return invitation.statusName;
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
  return "danger" as const;
}

function buildInvitationLink(token: string) {
  return `${window.location.origin}/accept-invitation/${token}`;
}

export function MasterInvitationsPage() {
  const [condominiums, setCondominiums] = useState<CondominiumResponse[]>([]);
  const [selectedCondominiumId, setSelectedCondominiumId] = useState<number | null>(null);
  const [invitations, setInvitations] = useState<InvitationResponse[]>([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingInvitations, setIsLoadingInvitations] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const selectedCondominium = condominiums.find(
    (condominium) => condominium.id === selectedCondominiumId,
  ) ?? null;

  const filteredInvitations = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    if (!normalizedSearch) {
      return invitations;
    }

    return invitations.filter((invitation) =>
      invitation.personName.toLowerCase().includes(normalizedSearch) ||
      invitation.email.toLowerCase().includes(normalizedSearch) ||
      invitation.condominiumName.toLowerCase().includes(normalizedSearch) ||
      getStatusLabel(invitation).toLowerCase().includes(normalizedSearch),
    );
  }, [invitations, searchTerm]);

  const pendingInvitations = invitations.filter((invitation) => getStatusLabel(invitation) === "Pending").length;
  const acceptedInvitations = invitations.filter((invitation) => getStatusLabel(invitation) === "Accepted").length;
  const expiredInvitations = invitations.filter((invitation) => getStatusLabel(invitation) === "Expired").length;

  const metrics = [
    { label: "Total", value: invitations.length.toString(), helper: "Convites de admin" },
    { label: "Pendentes", value: pendingInvitations.toString(), helper: "Aguardando aceite" },
    { label: "Aceitos", value: acceptedInvitations.toString(), helper: "Admins criados" },
    { label: "Expirados", value: expiredInvitations.toString(), helper: "Precisam de novo convite" },
  ];

  async function loadCondominiums() {
    try {
      setErrorMessage("");
      setIsLoading(true);

      const result = await getCondominiums();
      setCondominiums(result);
      setSelectedCondominiumId(result[0]?.id ?? null);
    } catch (error) {
      setCondominiums([]);
      setSelectedCondominiumId(null);

      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("Nao foi possivel carregar os condominios.");
      }
    } finally {
      setIsLoading(false);
    }
  }

  async function loadInvitations(condominiumId: number) {
    try {
      setErrorMessage("");
      setSuccessMessage("");
      setIsLoadingInvitations(true);

      const result = await getInvitationsByCondominium(condominiumId);
      setInvitations(result);
    } catch (error) {
      setInvitations([]);

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
    if (!selectedCondominiumId) return;
    await loadInvitations(selectedCondominiumId);
  }

  useEffect(() => {
    void loadCondominiums();
  }, []);

  useEffect(() => {
    if (!selectedCondominiumId) {
      setInvitations([]);
      return;
    }

    void loadInvitations(selectedCondominiumId);
  }, [selectedCondominiumId]);

  async function copyInvitationLink(invitation: InvitationResponse) {
    try {
      await navigator.clipboard.writeText(buildInvitationLink(invitation.token));
      setSuccessMessage("Link do convite copiado.");
    } catch {
      setSuccessMessage(buildInvitationLink(invitation.token));
    }
  }

  return (
    <>
      <section className="rounded-[2rem] border border-[#E5E7EB] bg-white p-6 shadow-sm">
        <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-[#111827]">
              Convites de Admin
            </h1>
            <p className="mt-1 text-sm font-semibold text-[#6B7280]">
              Convide administradores para assumirem a operacao dos condominios.
            </p>
            {selectedCondominium && (
              <p className="mt-2 text-sm font-semibold text-[#16A34A]">
                Condominio selecionado: {selectedCondominium.name}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-3 md:items-end">
            <select
              value={selectedCondominiumId ?? ""}
              onChange={(event) => setSelectedCondominiumId(Number(event.target.value))}
              disabled={condominiums.length === 0}
              className="h-11 min-w-72 rounded-2xl border border-[#E5E7EB] bg-white px-4 text-sm font-bold text-[#111827] outline-none transition focus:border-[#22C55E] focus:ring-4 focus:ring-[#86EFAC]/30 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {condominiums.length === 0 ? (
                <option value="">Nenhum condominio disponivel</option>
              ) : (
                condominiums.map((condominium) => (
                  <option key={condominium.id} value={condominium.id}>
                    {condominium.name}
                  </option>
                ))
              )}
            </select>

            <button
              type="button"
              disabled={!selectedCondominiumId}
              onClick={() => setIsCreateOpen(true)}
              className="h-11 rounded-2xl bg-[#16A34A] px-5 text-sm font-extrabold text-white shadow-sm shadow-[#16A34A]/30 transition hover:bg-[#0B3D2E] disabled:cursor-not-allowed disabled:opacity-70"
            >
              + Convidar Admin
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
              placeholder="Buscar admin, e-mail, condominio ou status..."
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

          {(isLoading || isLoadingInvitations) && (
            <p className="mb-4 text-sm font-semibold text-[#6B7280]">
              Carregando convites...
            </p>
          )}

          {errorMessage && (
            <p className="mb-4 text-sm font-semibold text-[#B42318]">
              {errorMessage}
            </p>
          )}

          {successMessage && (
            <p className="mb-4 text-sm font-semibold text-[#16A34A]">
              {successMessage}
            </p>
          )}

          {!isLoading && !isLoadingInvitations && filteredInvitations.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#D0D5DD] bg-white px-6 py-12 text-center">
              <p className="text-lg font-extrabold text-[#111827]">
                {searchTerm ? "Nenhum convite encontrado" : "Nenhum convite criado"}
              </p>
              <p className="mt-2 text-sm font-semibold text-[#6B7280]">
                Convide um admin para o condominio selecionado.
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white">
              <table className="w-full border-collapse text-left text-sm">
                <thead className="bg-[#DCFCE7] text-xs uppercase tracking-wide text-[#0B3D2E]">
                  <tr>
                    <th className="px-4 py-3 font-extrabold">Admin</th>
                    <th className="px-4 py-3 font-extrabold">E-mail</th>
                    <th className="px-4 py-3 font-extrabold">Condominio</th>
                    <th className="px-4 py-3 font-extrabold">Status</th>
                    <th className="px-4 py-3 font-extrabold">Acoes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB]">
                  {filteredInvitations.map((invitation) => (
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
                          label={getStatusLabel(invitation)}
                          variant={getStatusVariant(invitation)}
                        />
                      </td>
                      <td className="px-4 py-4">
                        <button
                          type="button"
                          onClick={() => void copyInvitationLink(invitation)}
                          className="rounded-xl border border-[#E5E7EB] bg-white px-3 py-1.5 text-xs font-bold text-[#6B7280] transition hover:bg-[#DCFCE7] hover:text-[#0B3D2E]"
                        >
                          Copiar link
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {isCreateOpen && selectedCondominiumId && (
        <CreateAdminInvitationModal
          condominiumId={selectedCondominiumId}
          onClose={() => setIsCreateOpen(false)}
          onCreated={async (invitation) => {
            await refreshInvitations();
            setSuccessMessage(`Convite criado. Link: ${buildInvitationLink(invitation.token)}`);
          }}
        />
      )}
    </>
  );
}

type CreateAdminInvitationModalProps = {
  condominiumId: number;
  onClose: () => void;
  onCreated: (invitation: InvitationResponse) => Promise<void>;
};

function CreateAdminInvitationModal({
  condominiumId,
  onClose,
  onCreated,
}: CreateAdminInvitationModalProps) {
  const [person, setPerson] = useState<CreatePersonRequest>(emptyPerson);
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setIsSubmitting(true);

    try {
      const createdPerson = await createPerson(person);
      const invitation = await createInvitation({
        condominiumId,
        personId: createdPerson.id,
        email,
        role: 2,
      });

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
    <ModalShell title="Convidar Admin" onClose={onClose}>
      <form className="space-y-6" onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <Field
            label="Nome"
            type="text"
            value={person.name}
            onChange={(value) => setPerson((current) => ({ ...current, name: value }))}
            placeholder="Nome completo"
          />
          <Field
            label="CPF"
            type="text"
            value={person.cpf}
            onChange={(value) =>
              setPerson((current) => ({
                ...current,
                cpf: value.replace(/\D/g, "").slice(0, 11),
              }))
            }
            placeholder="Somente numeros"
          />
          <Field
            label="Telefone"
            type="text"
            value={person.phoneNumber}
            onChange={(value) =>
              setPerson((current) => ({
                ...current,
                phoneNumber: value.replace(/\D/g, "").slice(0, 20),
              }))
            }
            placeholder="11999999999"
          />
          <Field
            label="E-mail de acesso"
            type="email"
            value={email}
            onChange={setEmail}
            placeholder="admin@email.com"
          />
        </div>

        {errorMessage && (
          <p className="text-sm font-semibold text-[#B42318]">
            {errorMessage}
          </p>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="h-12 w-full rounded-2xl bg-[#16A34A] text-sm font-extrabold text-white shadow-sm shadow-[#16A34A]/30 transition hover:bg-[#0B3D2E] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSubmitting ? "Criando..." : "Criar convite de admin"}
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
  type: "email" | "text";
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
};

function Field({ label, type, value, onChange, placeholder }: FieldProps) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-extrabold text-[#111827]">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-11 w-full rounded-2xl border border-[#E5E7EB] bg-white px-4 text-sm font-bold text-[#111827] outline-none transition placeholder:text-[#9CA3AF] focus:border-[#22C55E] focus:ring-4 focus:ring-[#86EFAC]/30"
      />
    </label>
  );
}
