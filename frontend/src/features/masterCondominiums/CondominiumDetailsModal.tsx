import type { ReactNode } from "react";
import { Building2, Clock, Copy, Mail, MapPin, RotateCw, X, type LucideIcon } from "lucide-react";
import { Button } from "../../shared/components/Button";
import { Modal } from "../../shared/components/Modal";
import { formatCurrency } from "../../shared/lib/currency";
import { formatCalendarDate, formatDate, formatDateTime } from "../../shared/lib/date";
import type { CondominiumResponse } from "../condominiums/types";
import type { InvitationResponse } from "../invitations/types";
import type { MasterUserResponse } from "../masterUsers/types";
import { EXPIRED_INVITATION_STATUS, type CondominiumBilling, type Situation } from "./condominiumBilling";
import { ACTIVE_STATUS, formatCepInput, formatCnpj, formatLocation, getAccessStatusLabel } from "./condominiumForm";
import { SituationChip, SituationTile } from "./SituationBadge";

type CondominiumDetailsModalProps = {
  condominium: CondominiumResponse;
  situation: Situation;
  billing?: CondominiumBilling;
  admins: MasterUserResponse[];
  invitations: InvitationResponse[];
  notice?: { tone: "success" | "danger"; text: string };
  onClose: () => void;
  onEdit: () => void;
  onToggleStatus: () => void;
  onDelete: () => void;
  onCopyInvitationLink: (invitation: InvitationResponse) => void;
  onRenewInvitation: (invitation: InvitationResponse) => void;
  onCancelInvitation: (invitation: InvitationResponse) => void;
};

export function CondominiumDetailsModal({
  condominium,
  situation,
  billing,
  admins,
  invitations,
  notice,
  onClose,
  onEdit,
  onToggleStatus,
  onDelete,
  onCopyInvitationLink,
  onRenewInvitation,
  onCancelInvitation,
}: CondominiumDetailsModalProps) {
  const isActive = condominium.status === ACTIVE_STATUS;

  return (
    <Modal
      size="lg"
      title={condominium.name}
      leading={<SituationTile name={condominium.name} situation={situation} size="lg" />}
      description={
        <span className="flex flex-wrap items-center gap-2">
          <SituationChip situation={situation} />
          Cliente desde {formatDate(condominium.createdAt)}
        </span>
      }
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onDelete} className="mr-auto rounded-full px-2 text-sm font-semibold text-vermelho hover:underline">
            Apagar condomínio
          </button>
          <Button variant="quiet" onClick={onToggleStatus}>
            {isActive ? "Inativar" : "Reativar"}
          </Button>
          <Button onClick={onEdit}>Editar</Button>
        </>
      }
    >
      {notice && (
        <p
          role={notice.tone === "danger" ? "alert" : "status"}
          className={`mb-4 rounded-field px-4 py-3 text-sm font-medium ${notice.tone === "danger" ? "bg-vermelho-suave text-vermelho" : "bg-verde-suave text-verde-tinta"}`}
        >
          {notice.text}
        </p>
      )}

      <dl className="grid grid-cols-3 divide-x divide-linha rounded-block bg-campo">
        <Stat label="Mensalidade" value={billing?.monthlyValue ? formatCurrency(billing.monthlyValue) : "–"} />
        <Stat label="Próximo vencimento" value={billing?.nextDue ? formatCalendarDate(billing.nextDue) : "–"} />
        <Stat
          label="Em atraso"
          value={formatCurrency(billing?.overdueValue ?? 0)}
          tone={billing && billing.overdueValue > 0 ? "danger" : "neutral"}
        />
      </dl>

      <ul className="mt-5 space-y-2.5 text-[15px] text-tinta">
        <InfoLine icon={Building2}>CNPJ {formatCnpj(condominium.cnpj)}</InfoLine>
        <InfoLine icon={Mail}>{condominium.emailContact}</InfoLine>
        <InfoLine icon={MapPin}>
          {formatLocation(condominium)}
          {condominium.cep && ` · CEP ${formatCepInput(condominium.cep)}`}
        </InfoLine>
      </ul>

      <h3 className="mb-2 mt-7 text-[13px] font-semibold text-tinta-suave">Administradores</h3>
      {admins.length === 0 && invitations.length === 0 ? (
        <p className="rounded-block bg-campo px-4 py-3 text-sm text-tinta-suave">
          Nenhum admin. Use <span className="font-semibold text-tinta">Editar</span> para convidar um.
        </p>
      ) : (
        <ul className="divide-y divide-linha rounded-block bg-campo">
          {admins.map((admin) => (
            <li key={`admin-${admin.userId}`} className="flex items-center gap-3 px-4 py-3">
              <Initials name={admin.personName} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-semibold text-tinta">{admin.personName}</span>
                <span className="block truncate text-[13px] text-tinta-suave">{admin.email}</span>
              </span>
              <span className="shrink-0 text-right text-[13px]">
                <span className={admin.status === ACTIVE_STATUS ? "font-semibold text-verde-tinta" : "font-semibold text-vermelho"}>
                  {getAccessStatusLabel(admin.status)}
                </span>
                <span className="block text-xs text-tinta-suave">desde {formatDate(admin.accessCreatedAt)}</span>
              </span>
            </li>
          ))}

          {invitations.map((invitation) => {
            const isExpired = invitation.invitationStatus === EXPIRED_INVITATION_STATUS;
            return (
              <li key={`invitation-${invitation.id}`} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <span
                  aria-hidden
                  className={`grid size-9 shrink-0 place-items-center rounded-full ${isExpired ? "bg-vermelho-suave text-vermelho" : "bg-ambar-suave text-ambar"}`}
                >
                  <Clock size={16} strokeWidth={1.8} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-semibold text-tinta">{invitation.personName || invitation.email}</span>
                  <span className={`block truncate text-[13px] ${isExpired ? "text-vermelho" : "text-ambar"}`}>
                    {isExpired ? `Convite vencido em ${formatDateTime(invitation.expiresAt)}` : `Convite pendente · vence ${formatDateTime(invitation.expiresAt)}`}
                  </span>
                </span>
                <span className="flex shrink-0 gap-1">
                  {isExpired ? (
                    <IconAction label="Reenviar convite com um novo link" icon={RotateCw} onClick={() => onRenewInvitation(invitation)} />
                  ) : (
                    <IconAction label="Copiar link do convite" icon={Copy} onClick={() => onCopyInvitationLink(invitation)} />
                  )}
                  <IconAction label="Cancelar convite" icon={X} onClick={() => onCancelInvitation(invitation)} />
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </Modal>
  );
}

function Stat({ label, value, tone = "neutral" }: { label: string; value: string; tone?: "neutral" | "danger" }) {
  return (
    <div className="px-4 py-3">
      <dt className="text-xs text-tinta-suave">{label}</dt>
      <dd className={`mt-0.5 font-display text-lg font-bold tabular-nums ${tone === "danger" ? "text-vermelho" : "text-tinta"}`}>{value}</dd>
    </div>
  );
}

function InfoLine({ icon: Icon, children }: { icon: LucideIcon; children: ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <Icon size={17} strokeWidth={1.7} aria-hidden className="mt-0.5 shrink-0 text-tinta-suave" />
      <span className="min-w-0">{children}</span>
    </li>
  );
}

function Initials({ name }: { name: string }) {
  const words = name.trim().split(/\s+/);
  const initials = (words[0]?.[0] ?? "") + (words.length > 1 ? words[words.length - 1][0] : "");
  return (
    <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-full bg-verde-suave text-xs font-bold text-verde-tinta">
      {initials.toUpperCase()}
    </span>
  );
}

function IconAction({ label, icon: Icon, onClick }: { label: string; icon: LucideIcon; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="grid size-8 place-items-center rounded-full text-tinta-suave transition-colors hover:bg-superficie hover:text-tinta"
    >
      <Icon size={16} strokeWidth={1.8} aria-hidden />
    </button>
  );
}
