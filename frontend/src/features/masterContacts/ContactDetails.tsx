import type { ReactNode } from "react";
import { MessageCircle } from "lucide-react";
import { MoraeMark } from "../../shared/components/MoraeMark";
import { arrivedLabel, contactStatuses, formatWhatsApp, readyMessage } from "./landingContactModel";
import type { LandingContactResponse, LandingContactStatus } from "./types";

type ContactDetailsProps = {
  contact: LandingContactResponse;
  // Status being saved right now, if any.
  savingStatus: LandingContactStatus | null;
  // Why the last status change failed, shown next to the switch.
  error?: string;
  onChangeStatus: (status: LandingContactStatus) => void;
};

// Body of a contact: facts, the ready message, the WhatsApp call and the status switch.
// Shown in the side panel (desktop) and inside a modal (phone).
export function ContactDetails({ contact, savingStatus, error, onChangeStatus }: ContactDetailsProps) {
  const message = readyMessage(contact);

  return (
    <div className="flex flex-col gap-4">
      <dl className="divide-y divide-linha overflow-hidden rounded-field bg-campo text-[13px]">
        <InfoRow label="WhatsApp">
          <a href={`tel:+${contact.whatsApp}`} className="tabular-nums underline-offset-2 hover:underline">
            {formatWhatsApp(contact.whatsApp)}
          </a>
        </InfoRow>
        <InfoRow label="Dor escolhida">{contact.painLabel ?? "Não escolheu"}</InfoRow>
        <InfoRow label="Chegou">
          <span className="tabular-nums">{arrivedLabel(contact.createdAt)}</span> · pela landing
        </InfoRow>
      </dl>

      {message && (
        <div>
          <p className="mb-2 text-[13px] font-semibold text-tinta-suave">Mensagem pronta</p>
          <p className="rounded-field bg-verde-suave px-3.5 py-3 text-sm leading-relaxed text-verde-tinta">{message}</p>
        </div>
      )}

      <a
        href={contact.whatsAppUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-verde px-6 text-[15px] font-semibold text-verde-tinta transition-colors duration-150 ease-out hover:bg-verde-forte"
      >
        <MessageCircle size={17} strokeWidth={2} aria-hidden />
        Chamar no WhatsApp
        <span className="sr-only">(abre em nova aba)</span>
      </a>

      <fieldset>
        <legend className="mb-2 text-[13px] font-semibold text-tinta-suave">Situação</legend>
        <div className="grid grid-cols-2 gap-1 rounded-block bg-menu p-1">
          {contactStatuses.map((option) => {
            const isCurrent = contact.status === option.value;
            const isSaving = savingStatus === option.value;
            return (
              <label
                key={option.value}
                className={`relative flex min-h-10 cursor-pointer items-center justify-center gap-1.5 rounded-field px-2 text-sm font-semibold transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-verde ${
                  isCurrent ? "bg-superficie text-tinta shadow-whisper" : "text-tinta-suave hover:text-tinta"
                } ${savingStatus ? "cursor-progress" : ""}`}
              >
                <input
                  type="radio"
                  name={`contact-status-${contact.id}`}
                  value={option.value}
                  checked={isCurrent}
                  disabled={savingStatus !== null}
                  onChange={() => onChangeStatus(option.value)}
                  className="sr-only"
                />
                {isSaving && <MoraeMark size={14} motion="respiro" />}
                {option.label}
              </label>
            );
          })}
        </div>
        {error && (
          <p role="alert" className="mt-2 text-[13px] font-medium text-vermelho">
            {error}
          </p>
        )}
      </fieldset>
    </div>
  );
}

function InfoRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 px-3.5 py-2.5">
      <dt className="shrink-0 text-tinta-suave">{label}</dt>
      <dd className="min-w-0 text-right font-semibold text-tinta">{children}</dd>
    </div>
  );
}
