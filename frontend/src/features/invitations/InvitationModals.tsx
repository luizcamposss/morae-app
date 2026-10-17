import { useState, type FormEvent } from "react";
import { Ban, CircleCheck, Clock, Copy, Mail, RotateCw } from "lucide-react";
import { Button } from "../../shared/components/Button";
import { Modal } from "../../shared/components/Modal";
import { SelectField } from "../../shared/components/SelectField";
import { TextField } from "../../shared/components/TextField";
import { formatDateTime } from "../../shared/lib/date";
import { formatCpf } from "../persons/personForm";
import type { PersonResponse } from "../persons/types";
import { getInvitationLink } from "./invitationLink";
import { createInvitation } from "./invitationService";
import {
  getInvitationErrorMessage,
  invitationRoleLabel,
  invitationRoleOptions,
  invitationStatusLabel,
  invitationStatusOf,
  type InvitationStatusKey,
} from "./invitationStatus";
import type { CreateInvitationRequest, InvitationResponse, InvitationRole } from "./types";

const statusTones: Record<InvitationStatusKey, { tile: string; chip: string; icon: typeof Clock }> = {
  Pending: { tile: "bg-ambar-suave text-ambar", chip: "bg-ambar-suave text-ambar", icon: Clock },
  Accepted: { tile: "bg-verde-suave text-verde-tinta", chip: "bg-verde-suave text-verde-tinta", icon: CircleCheck },
  Expired: { tile: "bg-vermelho-suave text-vermelho", chip: "bg-vermelho-suave text-vermelho", icon: Clock },
  Canceled: { tile: "bg-campo text-tinta-suave", chip: "bg-campo text-tinta-suave", icon: Ban },
  Refused: { tile: "bg-campo text-tinta-suave", chip: "bg-campo text-tinta-suave", icon: Ban },
};

export function InvitationStatusTile({ status, size = "md" }: { status: InvitationStatusKey; size?: "md" | "lg" }) {
  const { tile, icon: Icon } = statusTones[status];
  return (
    <span aria-hidden className={`grid shrink-0 place-items-center ${size === "lg" ? "size-11 rounded-block" : "size-10 rounded-full"} ${tile}`}>
      <Icon size={size === "lg" ? 20 : 17} strokeWidth={1.8} />
    </span>
  );
}

// "prefix" turns "Pendente" into e.g. "Convite pendente" where the context is not obvious.
export function InvitationStatusChip({ status, prefix }: { status: InvitationStatusKey; prefix?: string }) {
  const label = invitationStatusLabel(status);
  return (
    <span className={`shrink-0 rounded-chip px-2 py-0.5 text-xs font-semibold ${statusTones[status].chip}`}>
      {prefix ? `${prefix} ${label.toLowerCase()}` : label}
    </span>
  );
}

type CreateInvitationModalProps = {
  condominiumId: number;
  people: PersonResponse[];
  initialPersonId?: number;
  onClose: () => void;
  onCreated: (invitation: InvitationResponse) => Promise<void>;
};

// Turns a registered person into an app user: picks the person, the role and the e-mail that gets the link.
export function CreateInvitationModal({ condominiumId, people, initialPersonId, onClose, onCreated }: CreateInvitationModalProps) {
  const [form, setForm] = useState<CreateInvitationRequest>({
    condominiumId,
    personId: initialPersonId && people.some((person) => person.id === initialPersonId) ? initialPersonId : (people[0]?.id ?? 0),
    email: "",
    role: 4,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    if (!form.email.trim()) {
      setErrorMessage("Informe o e-mail que vai receber o convite.");
      return;
    }

    setIsSubmitting(true);
    try {
      const invitation = await createInvitation({ ...form, email: form.email.trim() });
      await onCreated(invitation);
      onClose();
    } catch (error) {
      setErrorMessage(error instanceof Error ? getInvitationErrorMessage(error.message) : "Não foi possível criar o convite.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal
      title="Novo convite"
      description="A pessoa recebe um link por e-mail para criar a senha e entrar no app."
      onClose={onClose}
      footer={
        <>
          <Button variant="quiet" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="invitation-form" isLoading={isSubmitting} loadingText="Enviando…" disabled={!form.personId}>
            Enviar convite
          </Button>
        </>
      }
    >
      <form id="invitation-form" onSubmit={handleSubmit} className="flex flex-col gap-5">
        {errorMessage && (
          <p role="alert" className="rounded-field bg-vermelho-suave px-4 py-3 text-sm font-medium text-vermelho">
            {errorMessage}
          </p>
        )}

        <SelectField
          label="Pessoa"
          value={String(form.personId || "")}
          onChange={(event) => setForm((current) => ({ ...current, personId: Number(event.target.value) }))}
          placeholder={people.length ? undefined : "Nenhuma pessoa sem acesso"}
          options={people.map((person) => ({ value: String(person.id), label: `${person.name} · CPF ${formatCpf(person.cpf)}` }))}
        />

        <div className="grid gap-5 sm:grid-cols-[1fr_11rem]">
          <TextField
            label="E-mail"
            type="email"
            autoComplete="off"
            value={form.email}
            onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
            placeholder="morador@email.com"
          />
          <SelectField
            label="Papel"
            value={String(form.role)}
            onChange={(event) => setForm((current) => ({ ...current, role: Number(event.target.value) as InvitationRole }))}
            options={invitationRoleOptions.map((option) => ({ value: String(option.value), label: option.label }))}
          />
        </div>
      </form>
    </Modal>
  );
}

type InvitationDetailsModalProps = {
  invitation: InvitationResponse;
  onClose: () => void;
  onCopy: () => void;
  onRenew: () => void;
  onCancel: () => void;
};

export function InvitationDetailsModal({ invitation, onClose, onCopy, onRenew, onCancel }: InvitationDetailsModalProps) {
  const status = invitationStatusOf(invitation);
  const isPending = status === "Pending";
  const isExpired = status === "Expired";
  const dateLabel = status === "Accepted" ? "Aceito em" : isExpired ? "Venceu em" : "Vence em";
  const dateValue = status === "Accepted" && invitation.acceptedAt ? invitation.acceptedAt : invitation.expiresAt;

  return (
    <Modal
      title={invitation.personName || invitation.email}
      description={
        <span className="flex flex-wrap items-center gap-2">
          Convite de {invitationRoleLabel(invitation).toLowerCase()}
          <InvitationStatusChip status={status} />
        </span>
      }
      leading={<InvitationStatusTile status={status} size="lg" />}
      onClose={onClose}
      footer={
        isPending || isExpired ? (
          <>
            {isPending && (
              <button type="button" onClick={onCancel} className="mr-auto rounded-full px-3 text-sm font-semibold text-vermelho hover:underline">
                Cancelar convite
              </button>
            )}
            {isExpired ? (
              <Button onClick={onRenew}>
                <RotateCw size={16} strokeWidth={1.8} aria-hidden />
                Reenviar com novo link
              </Button>
            ) : (
              <Button variant="quiet" onClick={onCopy}>
                <Copy size={16} strokeWidth={1.8} aria-hidden />
                Copiar link
              </Button>
            )}
          </>
        ) : undefined
      }
    >
      <div className="flex flex-col gap-5">
        <dl className="grid grid-cols-2 gap-4 rounded-block bg-campo px-4 py-4 text-sm">
          <Info label="E-mail" value={invitation.email} />
          <Info label="Papel" value={invitationRoleLabel(invitation)} />
          <Info label="Enviado em" value={formatDateTime(invitation.createdAt)} />
          <Info label={dateLabel} value={formatDateTime(dateValue)} />
        </dl>

        {isPending && (
          <section>
            <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-tinta">
              <Mail size={16} strokeWidth={1.8} aria-hidden className="text-tinta-suave" />
              Link de aceite
            </h3>
            <p className="break-all rounded-block px-4 py-3 text-[13px] text-tinta-suave ring-1 ring-linha">{getInvitationLink(invitation.token)}</p>
            <p className="mt-2 text-[13px] text-tinta-suave">O link já foi enviado por e-mail. Copie se quiser mandar por outro canal.</p>
          </section>
        )}
        {isExpired && <p className="text-sm text-tinta-suave">Este link venceu. Reenvie para mandar um link novo ao mesmo e-mail.</p>}
      </div>
    </Modal>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-tinta-suave">{label}</dt>
      <dd className="mt-0.5 break-words font-semibold tabular-nums text-tinta">{value}</dd>
    </div>
  );
}
