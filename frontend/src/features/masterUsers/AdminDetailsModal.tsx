import { Building2, Copy, Mail } from "lucide-react";
import { Modal } from "../../shared/components/Modal";
import { formatDate } from "../../shared/lib/date";
import type { MasterUserResponse } from "./types";

const ACTIVE_STATUS = 1;

export type AdminGroup = {
  userId: number;
  personName: string;
  email: string;
  // One access per condominium the person administers.
  accesses: MasterUserResponse[];
};

type AdminDetailsModalProps = {
  admin: AdminGroup;
  notice?: { tone: "success" | "danger"; text: string };
  onClose: () => void;
  onCopyEmail: () => void;
  onSuspend: (access: MasterUserResponse) => void;
  onReactivate: (access: MasterUserResponse) => void;
  onRemove: (access: MasterUserResponse) => void;
};

export function AdminDetailsModal({ admin, notice, onClose, onCopyEmail, onSuspend, onReactivate, onRemove }: AdminDetailsModalProps) {
  const since = admin.accesses.map((access) => access.accessCreatedAt).sort()[0];

  return (
    <Modal
      size="lg"
      title={admin.personName}
      leading={<AdminInitials name={admin.personName} size="lg" />}
      description={`Administrador desde ${formatDate(since)} · ${admin.accesses.length} condomínio${admin.accesses.length > 1 ? "s" : ""}`}
      onClose={onClose}
    >
      {notice && (
        <p
          role={notice.tone === "danger" ? "alert" : "status"}
          className={`mb-4 rounded-field px-4 py-3 text-sm font-medium ${notice.tone === "danger" ? "bg-vermelho-suave text-vermelho" : "bg-verde-suave text-verde-tinta"}`}
        >
          {notice.text}
        </p>
      )}

      <div className="flex items-center gap-3 rounded-block bg-campo px-4 py-3">
        <Mail size={17} strokeWidth={1.7} aria-hidden className="shrink-0 text-tinta-suave" />
        <a href={`mailto:${admin.email}`} className="min-w-0 flex-1 truncate text-[15px] font-medium text-tinta hover:underline">
          {admin.email}
        </a>
        <button
          type="button"
          onClick={onCopyEmail}
          aria-label="Copiar e-mail"
          title="Copiar e-mail"
          className="grid size-8 place-items-center rounded-full text-tinta-suave transition-colors hover:bg-superficie hover:text-tinta"
        >
          <Copy size={16} strokeWidth={1.8} aria-hidden />
        </button>
      </div>

      <h3 className="mb-2 mt-6 text-[13px] font-semibold text-tinta-suave">Condomínios que administra</h3>
      <ul className="divide-y divide-linha rounded-block bg-campo">
        {admin.accesses.map((access) => {
          const isActive = access.status === ACTIVE_STATUS;
          return (
            <li key={access.condominiumId} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-[9px] bg-superficie text-tinta-suave">
                <Building2 size={17} strokeWidth={1.7} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-semibold text-tinta">{access.condominiumName}</span>
                <span className={`block text-[13px] ${isActive ? "text-tinta-suave" : "text-vermelho"}`}>
                  {isActive
                    ? `Ativo desde ${formatDate(access.accessCreatedAt)}`
                    : `Suspenso${access.suspendedAt ? ` em ${formatDate(access.suspendedAt)}` : ""}${access.suspensionReason ? ` · ${access.suspensionReason}` : ""}`}
                </span>
              </span>
              <span className="flex shrink-0 gap-2">
                {isActive ? (
                  <TextAction onClick={() => onSuspend(access)}>Suspender</TextAction>
                ) : (
                  <TextAction onClick={() => onReactivate(access)}>Reativar</TextAction>
                )}
                <TextAction tone="danger" onClick={() => onRemove(access)}>
                  Remover
                </TextAction>
              </span>
            </li>
          );
        })}
      </ul>
    </Modal>
  );
}

export function AdminInitials({ name, size = "md" }: { name: string; size?: "md" | "lg" }) {
  const words = name.trim().split(/\s+/);
  const initials = (words[0]?.[0] ?? "") + (words.length > 1 ? words[words.length - 1][0] : "");

  return (
    <span
      aria-hidden
      className={`grid shrink-0 place-items-center rounded-full bg-verde-suave font-bold text-verde-tinta ${size === "lg" ? "size-12 text-base" : "size-10 text-sm"}`}
    >
      {initials.toUpperCase()}
    </span>
  );
}

function TextAction({ children, onClick, tone = "default" }: { children: string; onClick: () => void; tone?: "default" | "danger" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-[13px] font-semibold transition-colors hover:bg-superficie ${tone === "danger" ? "text-vermelho" : "text-tinta"}`}
    >
      {children}
    </button>
  );
}
