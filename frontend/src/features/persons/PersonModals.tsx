import { useState, type FormEvent } from "react";
import { DoorClosed, KeyRound, Mail } from "lucide-react";
import { Button, ButtonLink } from "../../shared/components/Button";
import { Modal } from "../../shared/components/Modal";
import { TextField } from "../../shared/components/TextField";
import { formatDateTime } from "../../shared/lib/date";
import { InvitationStatusChip } from "../invitations/InvitationModals";
import { invitationRoleLabel, invitationStatusOf } from "../invitations/invitationStatus";
import type { InvitationResponse } from "../invitations/types";
import { accessRoleLabel, formatCpf, formatPhone, getPersonErrorMessage, initialsOf, onlyDigits, validatePersonForm } from "./personForm";
import type { CreatePersonRequest, PersonResponse } from "./types";

type PersonFormModalProps = {
  title: string;
  submitLabel: string;
  initialForm: CreatePersonRequest;
  onClose: () => void;
  onSubmit: (form: CreatePersonRequest) => Promise<void>;
};

export function PersonFormModal({ title, submitLabel, initialForm, onClose, onSubmit }: PersonFormModalProps) {
  const [form, setForm] = useState<CreatePersonRequest>(initialForm);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function updateField<K extends keyof CreatePersonRequest>(field: K, value: CreatePersonRequest[K]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const payload = { ...form, name: form.name.trim(), email: form.email?.trim() || null };
    const problem = validatePersonForm(payload);
    setErrorMessage(problem);
    if (problem) return;

    try {
      setIsSubmitting(true);
      await onSubmit(payload);
      onClose();
    } catch (error) {
      setErrorMessage(error instanceof Error ? getPersonErrorMessage(error.message) : "Não foi possível salvar o morador.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal
      title={title}
      description="Os vínculos com unidades ficam na tela Unidades."
      onClose={onClose}
      footer={
        <>
          <Button variant="quiet" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="person-form" isLoading={isSubmitting} loadingText="Salvando…">
            {submitLabel}
          </Button>
        </>
      }
    >
      <form id="person-form" onSubmit={handleSubmit} className="flex flex-col gap-5">
        {errorMessage && (
          <p role="alert" className="rounded-field bg-vermelho-suave px-4 py-3 text-sm font-medium text-vermelho">
            {errorMessage}
          </p>
        )}

        <TextField label="Nome" value={form.name} onChange={(event) => updateField("name", event.target.value)} placeholder="Nome completo" />
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField
            label="CPF"
            inputMode="numeric"
            value={form.cpf}
            onChange={(event) => updateField("cpf", onlyDigits(event.target.value, 11))}
            placeholder="Só números"
          />
          <TextField
            label="Telefone"
            inputMode="tel"
            value={form.phoneNumber}
            onChange={(event) => updateField("phoneNumber", onlyDigits(event.target.value, 20))}
            placeholder="Opcional"
          />
        </div>
        <TextField
          label="E-mail"
          type="email"
          value={form.email ?? ""}
          onChange={(event) => updateField("email", event.target.value)}
          placeholder="Opcional"
        />
      </form>
    </Modal>
  );
}

export function PersonAvatar({ name, isActive, size = "md" }: { name: string; isActive: boolean; size?: "md" | "lg" }) {
  return (
    <span
      aria-hidden
      className={`grid shrink-0 place-items-center rounded-full font-semibold ${size === "lg" ? "size-11 text-[15px]" : "size-10 text-sm"} ${
        isActive ? "bg-verde-suave text-verde-tinta" : "bg-campo text-tinta-suave"
      }`}
    >
      {initialsOf(name)}
    </span>
  );
}

type PersonDetailsModalProps = {
  person: PersonResponse;
  // Latest invitation of this person, when there is one.
  invitation: InvitationResponse | null;
  canInvite: boolean;
  onClose: () => void;
  onEdit: () => void;
  onInvite: () => void;
};

export function PersonDetailsModal({ person, invitation, canInvite, onClose, onEdit, onInvite }: PersonDetailsModalProps) {
  const roleLabel = accessRoleLabel(person);
  const invitationStatus = invitation ? invitationStatusOf(invitation) : null;

  return (
    <Modal
      title={person.name}
      description={person.hasRegisteredUser ? `${roleLabel || "Usuário"} com acesso ao app` : "Ainda sem acesso ao app"}
      leading={<PersonAvatar name={person.name} isActive={person.hasRegisteredUser} size="lg" />}
      onClose={onClose}
      footer={
        <Button variant="quiet" onClick={onEdit}>
          Editar dados
        </Button>
      }
    >
      <div className="flex flex-col gap-6">
        <dl className="grid grid-cols-2 gap-4 rounded-block bg-campo px-4 py-4 text-sm">
          <Info label="CPF" value={formatCpf(person.cpf)} />
          <Info label="Telefone" value={formatPhone(person.phoneNumber)} />
          {person.email && <Info label="E-mail" value={person.email} />}
        </dl>

        <section>
          <h3 className="mb-2 text-sm font-semibold text-tinta">Unidades</h3>
          <div className="flex flex-wrap items-center gap-3 rounded-block px-4 py-3 ring-1 ring-linha">
            <span className={`grid size-9 shrink-0 place-items-center rounded-[9px] ${person.unitCount ? "bg-verde-suave text-verde-tinta" : "bg-ambar-suave text-ambar"}`}>
              <DoorClosed size={17} strokeWidth={1.8} aria-hidden />
            </span>
            <span className="min-w-0 flex-1 basis-48">
              <span className="block truncate text-[15px] font-semibold text-tinta">{person.mainUnit || "Sem unidade vinculada"}</span>
              <span className="block text-[13px] text-tinta-suave">
                {person.unitCount > 1
                  ? `Unidade principal · ${person.unitCount} vínculos no total`
                  : person.unitCount === 1
                    ? "Único vínculo"
                    : "Proprietário, morador ou inquilino"}
              </span>
            </span>
            <ButtonLink to="/admin/units" variant="quiet" size="sm" className="shrink-0 max-sm:ml-12">
              Unidades
            </ButtonLink>
          </div>
        </section>

        <section>
          <h3 className="mb-2 text-sm font-semibold text-tinta">Acesso ao app</h3>
          <div className="flex flex-wrap items-center gap-3 rounded-block px-4 py-3 ring-1 ring-linha">
            <span className={`grid size-9 shrink-0 place-items-center rounded-[9px] ${person.hasRegisteredUser ? "bg-verde-suave text-verde-tinta" : "bg-campo text-tinta-suave"}`}>
              {person.hasRegisteredUser ? <KeyRound size={17} strokeWidth={1.8} aria-hidden /> : <Mail size={17} strokeWidth={1.8} aria-hidden />}
            </span>
            <span className="min-w-0 flex-1 basis-48">
              {person.hasRegisteredUser ? (
                <>
                  <span className="block text-[15px] font-semibold text-tinta">Acesso ativo{roleLabel ? ` como ${roleLabel.toLowerCase()}` : ""}</span>
                  <span className="block text-[13px] text-tinta-suave">Já entra no app com e-mail e senha.</span>
                </>
              ) : invitation && invitationStatus ? (
                <>
                  <span className="flex flex-wrap items-center gap-2 text-[15px] font-semibold text-tinta">
                    Convite de {invitationRoleLabel(invitation).toLowerCase()}
                    <InvitationStatusChip status={invitationStatus} />
                  </span>
                  <span className="block truncate text-[13px] text-tinta-suave">
                    {invitation.email} · enviado em {formatDateTime(invitation.createdAt)}
                  </span>
                </>
              ) : (
                <>
                  <span className="block text-[15px] font-semibold text-tinta">Sem convite</span>
                  <span className="block text-[13px] text-tinta-suave">Convide para pagar, ver avisos e votar pelo app.</span>
                </>
              )}
            </span>
            {canInvite ? (
              <Button size="sm" onClick={onInvite} className="shrink-0 max-sm:ml-12">
                {invitation ? "Convidar de novo" : "Convidar"}
              </Button>
            ) : (
              !person.hasRegisteredUser &&
              invitation && (
                <ButtonLink to="/admin/invitations" variant="quiet" size="sm" className="shrink-0 max-sm:ml-12">
                  Ver convites
                </ButtonLink>
              )
            )}
          </div>
        </section>
      </div>
    </Modal>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-tinta-suave">{label}</dt>
      <dd className="mt-0.5 truncate font-semibold tabular-nums text-tinta">{value}</dd>
    </div>
  );
}
