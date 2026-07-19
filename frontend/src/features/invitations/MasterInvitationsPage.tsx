import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { getCondominiums } from "../condominiums/condominiumService";
import type { CondominiumResponse } from "../condominiums/types";
import { createPerson } from "../persons/personService";
import { MetricCard } from "../../shared/components/MetricCard";
import { StatusBadge } from "../../shared/components/StatusBadge";
import { createInvitation, getInvitationsByCondominium } from "./invitationService";
import type { InvitationResponse, InvitationStatus } from "./types";

const ADMIN_ROLE = 2;
const PENDING_STATUS = 1;
const ACCEPTED_STATUS = 2;
const EXPIRED_STATUS = 4;
const CANCELED_STATUS = 5;

type StatusFilter = "all" | InvitationStatus;

type AdminInvitationForm = {
  name: string;
  cpf: string;
  phoneNumber: string;
  email: string;
};

type FieldErrors = Partial<Record<keyof AdminInvitationForm, string>>;

const emptyForm: AdminInvitationForm = {
  name: "",
  cpf: "",
  phoneNumber: "",
  email: "",
};

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
  const [selectedCondominiumId, setSelectedCondominiumId] = useState<number | null>(null);
  const [invitations, setInvitations] = useState<InvitationResponse[]>([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isLoadingCondominiums, setIsLoadingCondominiums] = useState(true);
  const [isLoadingInvitations, setIsLoadingInvitations] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [generatedLink, setGeneratedLink] = useState("");

  const selectedCondominium =
    condominiums.find((condominium) => condominium.id === selectedCondominiumId) ??
    null;

  const filteredInvitations = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return invitations.filter((invitation) => {
      const matchesStatus =
        statusFilter === "all" || invitation.invitationStatus === statusFilter;

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
        getStatusLabel(invitation.invitationStatus),
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalizedSearch);
    });
  }, [invitations, searchTerm, statusFilter]);

  const pendingInvitations = invitations.filter(
    (invitation) => invitation.invitationStatus === PENDING_STATUS,
  );

  const acceptedInvitations = invitations.filter(
    (invitation) => invitation.invitationStatus === ACCEPTED_STATUS,
  );

  const expiredInvitations = invitations.filter(
    (invitation) => invitation.invitationStatus === EXPIRED_STATUS,
  );

  const metrics = [
    { label: "Total", value: invitations.length.toString(), helper: "Convites de Admin" },
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
      helper: "Precisam de novo convite",
    },
  ];

  async function loadCondominiums() {
    try {
      setErrorMessage("");
      setIsLoadingCondominiums(true);

      const result = await getCondominiums();
      setCondominiums(result);
      setSelectedCondominiumId((currentId) => currentId ?? result[0]?.id ?? null);
    } catch (error) {
      setCondominiums([]);
      setSelectedCondominiumId(null);
      setErrorMessage(getFriendlyErrorMessage(error, "Não foi possível carregar os condomínios."));
    } finally {
      setIsLoadingCondominiums(false);
    }
  }

  async function loadInvitations(condominiumId: number) {
    try {
      setErrorMessage("");
      setIsLoadingInvitations(true);

      const result = await getInvitationsByCondominium(condominiumId);
      setInvitations(result.filter((invitation) => invitation.role === ADMIN_ROLE));
    } catch (error) {
      setInvitations([]);
      setErrorMessage(getFriendlyErrorMessage(error, "Não foi possível carregar os convites."));
    } finally {
      setIsLoadingInvitations(false);
    }
  }

  async function refreshInvitations() {
    if (!selectedCondominiumId) {
      return;
    }

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
    const link = buildInvitationLink(invitation.token);
    await copyLink(link);
  }

  async function copyLink(link: string) {
    try {
      await navigator.clipboard.writeText(link);
      setSuccessMessage("Link do convite copiado.");
    } catch {
      setSuccessMessage(`Copie o link manualmente: ${link}`);
    }
  }

  async function handleCreated(invitation: InvitationResponse) {
    const link = buildInvitationLink(invitation.token);

    await refreshInvitations();
    setGeneratedLink(link);
    setSuccessMessage("Convite criado com sucesso. O link já está disponível abaixo.");
    void copyLink(link);
  }

  const isLoading = isLoadingCondominiums || isLoadingInvitations;

  return (
    <>
      <section className="rounded-[2rem] border border-[#E5E7EB] bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-[#111827]">
              Convites de Admin
            </h1>
            <p className="mt-1 text-sm font-semibold text-[#6B7280]">
              Convide administradores para assumirem a operação dos condomínios.
            </p>
            {selectedCondominium && (
              <p className="mt-2 text-sm font-bold text-[#16A34A]">
                Condomínio selecionado: {selectedCondominium.name}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-3 lg:items-end">
            <select
              value={selectedCondominiumId ?? ""}
              onChange={(event) => {
                setGeneratedLink("");
                setSuccessMessage("");
                setSelectedCondominiumId(Number(event.target.value));
              }}
              disabled={condominiums.length === 0}
              className="h-11 min-w-full cursor-pointer rounded-2xl border border-[#E5E7EB] bg-white px-4 text-sm font-bold text-[#111827] outline-none transition focus:border-[#22C55E] focus:ring-4 focus:ring-[#86EFAC]/30 disabled:cursor-not-allowed disabled:opacity-70 sm:min-w-72"
            >
              {condominiums.length === 0 ? (
                <option value="">Nenhum condomínio disponível</option>
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
              className="h-11 cursor-pointer rounded-2xl bg-[#16A34A] px-5 text-sm font-extrabold text-white shadow-sm shadow-[#16A34A]/30 transition hover:-translate-y-0.5 hover:bg-[#0B3D2E] disabled:cursor-not-allowed disabled:opacity-70"
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

        {errorMessage && <FeedbackMessage variant="danger" message={errorMessage} />}
        {successMessage && <FeedbackMessage variant="success" message={successMessage} />}

        {generatedLink && (
          <div className="mt-5 rounded-3xl border border-[#BBF7D0] bg-[#F0FDF4] p-4">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#16A34A]">
              Link gerado
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
                setStatusFilter(value === "all" ? "all" : (Number(value) as InvitationStatus));
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
                searchTerm || statusFilter !== "all"
                  ? "Nenhum convite encontrado."
                  : "Nenhum convite criado."
              }
              helper="Convide um Admin para o condomínio selecionado."
            />
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-[#E5E7EB] bg-white">
              <table className="w-full min-w-[900px] border-collapse text-left text-sm">
                <thead className="bg-[#DCFCE7] text-xs uppercase tracking-wide text-[#0B3D2E]">
                  <tr>
                    <th className="px-4 py-3 font-extrabold">Admin</th>
                    <th className="px-4 py-3 font-extrabold">E-mail</th>
                    <th className="px-4 py-3 font-extrabold">Condomínio</th>
                    <th className="px-4 py-3 font-extrabold">Status</th>
                    <th className="px-4 py-3 font-extrabold">Expira em</th>
                    <th className="px-4 py-3 font-extrabold">Ações</th>
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
                          label={getStatusLabel(invitation.invitationStatus)}
                          variant={getStatusVariant(invitation.invitationStatus)}
                        />
                      </td>
                      <td className="px-4 py-4 font-semibold text-[#6B7280]">
                        {formatDateTime(invitation.expiresAt)}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => setGeneratedLink(buildInvitationLink(invitation.token))}
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

      {isCreateOpen && selectedCondominium && (
        <CreateAdminInvitationModal
          condominiumId={selectedCondominium.id}
          condominiumName={selectedCondominium.name}
          onClose={() => setIsCreateOpen(false)}
          onCreated={handleCreated}
        />
      )}
    </>
  );
}

type CreateAdminInvitationModalProps = {
  condominiumId: number;
  condominiumName: string;
  onClose: () => void;
  onCreated: (invitation: InvitationResponse) => Promise<void>;
};

function CreateAdminInvitationModal({
  condominiumId,
  condominiumName,
  onClose,
  onCreated,
}: CreateAdminInvitationModalProps) {
  const [form, setForm] = useState<AdminInvitationForm>(emptyForm);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  function updateField(field: keyof AdminInvitationForm, value: string) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));

    if (fieldErrors[field]) {
      setFieldErrors((currentErrors) => {
        const nextErrors = { ...currentErrors };
        delete nextErrors[field];
        return nextErrors;
      });
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setFieldErrors({});

    const validationErrors = validateForm(form);

    if (Object.keys(validationErrors).length > 0) {
      setFieldErrors(validationErrors);
      setErrorMessage("Revise os campos destacados antes de continuar.");
      return;
    }

    try {
      setIsSubmitting(true);

      const createdPerson = await createPerson({
        name: form.name.trim(),
        cpf: onlyDigits(form.cpf),
        phoneNumber: onlyDigits(form.phoneNumber),
      });

      const invitation = await createInvitation({
        condominiumId,
        personId: createdPerson.id,
        email: form.email.trim(),
        role: ADMIN_ROLE,
      });

      await onCreated(invitation);
      onClose();
    } catch (error) {
      setErrorMessage(getFriendlyErrorMessage(error, "Não foi possível criar o convite."));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <ModalShell title="Convidar Admin" onClose={onClose}>
      <form className="space-y-6" onSubmit={handleSubmit}>
        <div className="rounded-2xl border border-[#BBF7D0] bg-[#F0FDF4] px-4 py-3">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-[#16A34A]">
            Condomínio
          </p>
          <p className="mt-1 text-sm font-extrabold text-[#0B3D2E]">
            {condominiumName}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <Field
            label="Nome"
            value={form.name}
            error={fieldErrors.name}
            onChange={(value) => updateField("name", value)}
            placeholder="Nome completo"
          />
          <Field
            label="CPF"
            value={form.cpf}
            error={fieldErrors.cpf}
            maxLength={14}
            inputMode="numeric"
            onChange={(value) => updateField("cpf", value)}
            placeholder="000.000.000-00"
          />
          <Field
            label="Telefone"
            value={form.phoneNumber}
            error={fieldErrors.phoneNumber}
            maxLength={15}
            inputMode="tel"
            onChange={(value) => updateField("phoneNumber", value)}
            placeholder="(54) 99999-9999"
          />
          <Field
            label="E-mail de acesso"
            type="email"
            value={form.email}
            error={fieldErrors.email}
            onChange={(value) => updateField("email", value)}
            placeholder="admin@email.com"
          />
        </div>

        {errorMessage && <FeedbackMessage variant="danger" message={errorMessage} />}

        <button
          type="submit"
          disabled={isSubmitting}
          className="h-12 w-full cursor-pointer rounded-2xl bg-[#16A34A] text-sm font-extrabold text-white shadow-sm shadow-[#16A34A]/30 transition hover:bg-[#0B3D2E] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSubmitting ? "Criando convite..." : "Criar convite e gerar link"}
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0B3D2E]/30 px-4 py-8 backdrop-blur-sm">
      <div className="w-full max-w-3xl overflow-hidden rounded-[2rem] border border-[#E5E7EB] bg-white shadow-2xl shadow-[#0B3D2E]/20">
        <div className="flex items-center justify-between border-b border-[#E5E7EB] px-6 py-5">
          <div>
            <h2 className="text-2xl font-black text-[#111827]">{title}</h2>
            <p className="mt-1 text-sm font-semibold text-[#6B7280]">
              Cadastre o contato institucional e gere o link de aceite.
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

        <div className="max-h-[75vh] overflow-y-auto px-6 py-6">{children}</div>
      </div>
    </div>
  );
}

type FieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  error?: string;
  maxLength?: number;
  inputMode?: "email" | "numeric" | "tel" | "text";
  type?: "email" | "text";
};

function Field({
  label,
  value,
  onChange,
  placeholder,
  error,
  maxLength,
  inputMode = "text",
  type = "text",
}: FieldProps) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-extrabold text-[#111827]">
        {label}
      </span>
      <input
        type={type}
        value={value}
        maxLength={maxLength}
        inputMode={inputMode}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-invalid={!!error}
        className={`h-11 w-full rounded-2xl border bg-white px-4 text-sm font-bold text-[#111827] outline-none transition placeholder:text-[#9CA3AF] ${
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
    <div className="rounded-2xl border border-dashed border-[#D0D5DD] bg-white px-6 py-12 text-center">
      <p className="text-lg font-extrabold text-[#111827]">{message}</p>
      {helper && (
        <p className="mt-2 text-sm font-semibold text-[#6B7280]">{helper}</p>
      )}
    </div>
  );
}

function validateForm(form: AdminInvitationForm): FieldErrors {
  const errors: FieldErrors = {};

  if (!form.name.trim()) {
    errors.name = "Informe o nome do Admin.";
  } else if (form.name.trim().length < 3) {
    errors.name = "Use pelo menos 3 caracteres.";
  }

  if (!form.cpf.trim()) {
    errors.cpf = "Informe o CPF.";
  } else if (!isValidCpf(form.cpf)) {
    errors.cpf = "Informe um CPF válido com 11 dígitos.";
  }

  const phoneDigits = onlyDigits(form.phoneNumber);

  if (!phoneDigits) {
    errors.phoneNumber = "Informe o telefone.";
  } else if (phoneDigits.length < 10 || phoneDigits.length > 11) {
    errors.phoneNumber = "Informe um telefone válido com DDD.";
  }

  if (!form.email.trim()) {
    errors.email = "Informe o e-mail de acesso.";
  } else if (!isValidEmail(form.email)) {
    errors.email = "Informe um e-mail válido.";
  }

  return errors;
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

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
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

  const message = error.message;
  const normalizedMessage = message.toLowerCase();

  if (normalizedMessage.includes("cpf")) {
    return "Este CPF já está cadastrado ou não pôde ser aceito pela API.";
  }

  if (normalizedMessage.includes("email")) {
    return "Este e-mail já está cadastrado ou já possui usuário.";
  }

  if (normalizedMessage.includes("pending invitation")) {
    return "Já existe um convite pendente para esta pessoa.";
  }

  if (normalizedMessage.includes("forbidden")) {
    return "Seu usuário não tem permissão para criar este convite.";
  }

  return message || fallback;
}
