import { useEffect, useState, type ReactNode } from "react";
import { ChevronRight, MessageCircle } from "lucide-react";
import { Button } from "../../shared/components/Button";
import { Modal } from "../../shared/components/Modal";
import { MoraeMark } from "../../shared/components/MoraeMark";
import { useMediaQuery } from "../../shared/hooks/useMediaQuery";
import { PageHeader } from "../../shared/layout/PageHeader";
import { initialsOf } from "../../shared/lib/initials";
import { ContactDetails } from "./ContactDetails";
import { getLandingContacts, updateLandingContactStatus } from "./landingContactService";
import { arrivedLabel, CONTACT_STATUS, contactStatusInfo, contactStatuses, profileLabel, unitCountLabel } from "./landingContactModel";
import type { LandingContactResponse, LandingContactStatus } from "./types";

type Filter = LandingContactStatus | "all";

const filters: Array<{ key: Filter; label: string }> = [
  ...contactStatuses.map((status) => ({ key: status.value, label: status.tab })),
  { key: "all", label: "Todos" },
];

const LOAD_ERROR = "Não foi possível carregar os contatos.";

export function MasterContactsPage() {
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const [contacts, setContacts] = useState<LandingContactResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [filter, setFilter] = useState<Filter>(CONTACT_STATUS.new);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [saving, setSaving] = useState<{ id: number; status: LandingContactStatus } | null>(null);
  const [statusError, setStatusError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  async function load() {
    try {
      setIsLoading(true);
      setLoadError("");
      // Every contact at once: the filter counts come from the same list.
      setContacts(await getLandingContacts());
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : LOAD_ERROR);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    let isMounted = true;

    getLandingContacts()
      .then((data) => isMounted && setContacts(data))
      .catch((error) => isMounted && setLoadError(error instanceof Error ? error.message : LOAD_ERROR))
      .finally(() => isMounted && setIsLoading(false));

    return () => {
      isMounted = false;
    };
  }, []);

  const countFor = (key: Filter) => (key === "all" ? contacts.length : contacts.filter((contact) => contact.status === key).length);
  const visibleContacts = filter === "all" ? contacts : contacts.filter((contact) => contact.status === filter);
  const newCount = countFor(CONTACT_STATUS.new);

  // On desktop the panel always shows someone: the picked contact (even after it moved to another
  // filter) or the first one of the list. On the phone the details only open on a tap.
  const selectedContact =
    contacts.find((contact) => contact.id === selectedId) ?? (isDesktop ? visibleContacts[0] ?? null : null);

  function selectContact(id: number) {
    setSelectedId(id);
    setStatusError("");
    setSuccessMessage("");
  }

  async function changeStatus(contact: LandingContactResponse, status: LandingContactStatus) {
    if (status === contact.status || saving) return;

    try {
      setSaving({ id: contact.id, status });
      setStatusError("");
      setSuccessMessage("");
      const updated = await updateLandingContactStatus(contact.id, { status });
      setContacts((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      // Keeps the contact on screen even when it leaves the current filter.
      setSelectedId(updated.id);
      setSuccessMessage(`${firstName(updated.name)} agora está em "${contactStatusInfo(updated.status).label}".`);
    } catch (error) {
      setStatusError(error instanceof Error ? error.message : "Não foi possível mudar a situação. Tente de novo.");
    } finally {
      setSaving(null);
    }
  }

  const details = selectedContact && (
    <ContactDetails
      contact={selectedContact}
      savingStatus={saving?.id === selectedContact.id ? saving.status : null}
      error={statusError}
      onChangeStatus={(status) => void changeStatus(selectedContact, status)}
    />
  );

  return (
    <>
      <PageHeader
        overline={isLoading || loadError ? "Pessoas que pediram para ver o Moraê na landing" : overlineFor(contacts.length, newCount)}
        title="Contatos"
      />

      {successMessage && (
        <p role="status" className="mb-5 rounded-field bg-verde-suave px-4 py-3 text-sm font-medium text-verde-tinta">
          {successMessage}
        </p>
      )}

      {loadError ? (
        <div role="alert" className="flex flex-col items-start gap-3 rounded-card bg-vermelho-suave px-5 py-4 sm:flex-row sm:items-center">
          <p className="flex-1 text-sm font-medium text-vermelho">{loadError}</p>
          <Button size="sm" variant="quiet" onClick={() => void load()} className="bg-superficie hover:bg-campo">
            Tentar de novo
          </Button>
        </div>
      ) : (
        <>
          <div
            role="tablist"
            aria-label="Situação dos contatos"
            className="mb-4 inline-flex max-w-full overflow-x-auto rounded-block bg-menu p-1 [scrollbar-width:none]"
          >
            {filters.map((item) => (
              <button
                key={item.key}
                type="button"
                role="tab"
                aria-selected={filter === item.key}
                onClick={() => {
                  setFilter(item.key);
                  setSelectedId(null);
                  setStatusError("");
                }}
                className={`flex shrink-0 items-center gap-1.5 rounded-field px-3.5 py-1.5 text-sm font-semibold transition-colors ${
                  filter === item.key ? "bg-superficie text-tinta shadow-whisper" : "text-tinta-suave hover:text-tinta"
                }`}
              >
                {item.label}
                <span className="text-xs font-medium tabular-nums text-tinta-suave">{isLoading ? "" : countFor(item.key)}</span>
              </button>
            ))}
          </div>

          <div className="flex items-start gap-5">
            <ul className="min-w-0 flex-1 divide-y divide-linha overflow-hidden rounded-card bg-superficie shadow-whisper">
              {isLoading ? (
                <EmptyRow>
                  <span className="inline-flex items-center gap-2">
                    <MoraeMark size={18} motion="respiro" />
                    Carregando contatos…
                  </span>
                </EmptyRow>
              ) : visibleContacts.length === 0 ? (
                <EmptyRow>{emptyMessage(filter, contacts.length)}</EmptyRow>
              ) : (
                visibleContacts.map((contact) => (
                  <ContactRow
                    key={contact.id}
                    contact={contact}
                    showStatus={filter === "all"}
                    isSelected={isDesktop && selectedContact?.id === contact.id}
                    onSelect={() => selectContact(contact.id)}
                  />
                ))
              )}
            </ul>

            {isDesktop && selectedContact && (
              <aside
                aria-label={`Contato de ${selectedContact.name}`}
                className="sticky top-10 w-[380px] shrink-0 rounded-card bg-superficie p-6 shadow-whisper xl:w-[400px]"
              >
                <h2 className="font-display text-[26px] font-bold leading-[1.15] tracking-[-0.01em] text-tinta">{selectedContact.name}</h2>
                <p className="mb-5 mt-1 text-sm text-tinta-suave">
                  {profileLabel(selectedContact.profile)} · {unitCountLabel(selectedContact.unitCount)}
                </p>
                {details}
              </aside>
            )}
          </div>
        </>
      )}

      {!isDesktop && selectedContact && (
        <Modal
          title={selectedContact.name}
          description={`${profileLabel(selectedContact.profile)} · ${unitCountLabel(selectedContact.unitCount)}`}
          leading={<Initials name={selectedContact.name} />}
          onClose={() => {
            setSelectedId(null);
            setStatusError("");
          }}
        >
          {details}
        </Modal>
      )}
    </>
  );
}

function ContactRow({
  contact,
  showStatus,
  isSelected,
  onSelect,
}: {
  contact: LandingContactResponse;
  showStatus: boolean;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const status = contactStatusInfo(contact.status);

  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        aria-current={isSelected || undefined}
        className={`flex w-full items-center gap-3.5 px-4 py-3.5 text-left transition-colors sm:px-5 ${
          isSelected ? "bg-verde-suave/50" : "hover:bg-campo/60"
        }`}
      >
        <Initials name={contact.name} />
        <span className="min-w-0 flex-1">
          <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            <span className="truncate text-[15px] font-semibold text-tinta">{contact.name}</span>
            {contact.painLabel && (
              <span className="shrink-0 rounded-chip bg-ambar-suave px-2 py-0.5 text-xs font-semibold text-ambar">{contact.painLabel}</span>
            )}
          </span>
          <span className="mt-0.5 block truncate text-[13px] text-tinta-suave">
            {profileLabel(contact.profile)} · {unitCountLabel(contact.unitCount)} ·{" "}
            <span className="tabular-nums">{arrivedLabel(contact.createdAt)}</span>
          </span>
        </span>
        {showStatus && <span className={`shrink-0 rounded-chip px-2 py-0.5 text-xs font-semibold ${status.tone}`}>{status.label}</span>}
        <ChevronRight size={18} strokeWidth={1.8} aria-hidden className="shrink-0 text-tinta-suave lg:hidden" />
      </button>
    </li>
  );
}

function Initials({ name }: { name: string }) {
  return (
    <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-full bg-verde-suave text-[13px] font-bold text-verde-tinta">
      {initialsOf(name)}
    </span>
  );
}

function EmptyRow({ children }: { children: ReactNode }) {
  return <li className="px-5 py-10 text-center text-sm text-tinta-suave">{children}</li>;
}

function emptyMessage(filter: Filter, total: number): ReactNode {
  if (total === 0) {
    return (
      <span className="mx-auto flex max-w-sm flex-col items-center gap-3">
        <span aria-hidden className="grid size-11 place-items-center rounded-block bg-verde-suave text-verde-tinta">
          <MessageCircle size={20} strokeWidth={1.8} />
        </span>
        <span>
          <span className="block text-[15px] font-semibold text-tinta">Nenhum contato ainda</span>
          Quando alguém pedir para ver o Moraê na landing, o contato aparece aqui e você recebe um e-mail.
        </span>
      </span>
    );
  }

  if (filter === CONTACT_STATUS.new) return "Nenhum contato novo. Todo mundo já foi chamado.";
  if (filter === CONTACT_STATUS.inConversation) return "Nenhuma conversa em andamento.";
  if (filter === CONTACT_STATUS.closed) return "Nenhum contato fechado ainda.";
  if (filter === CONTACT_STATUS.notInterested) return "Nenhum contato marcado como sem interesse.";
  return "Nenhum contato.";
}

function overlineFor(total: number, newCount: number) {
  if (total === 0) return "Pessoas que pediram para ver o Moraê na landing";
  const totalText = `${total} contato${total === 1 ? "" : "s"} da landing`;
  return newCount ? `${totalText} · ${newCount} para chamar` : totalText;
}

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] ?? name;
}
