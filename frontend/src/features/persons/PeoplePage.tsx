import { useEffect, useMemo, useState } from "react";
import { ChevronRight, Plus, Search, Users } from "lucide-react";
import { useCondominium } from "../../app/providers/useCondominium";
import { Button } from "../../shared/components/Button";
import { SelectField } from "../../shared/components/SelectField";
import { SummaryCard } from "../../shared/components/SummaryCard";
import { PageHeader } from "../../shared/layout/PageHeader";
import { CreateInvitationModal, InvitationStatusChip } from "../invitations/InvitationModals";
import { getInvitationsByCondominium } from "../invitations/invitationService";
import { invitationStatusLabel, invitationStatusOf, isOpenInvitation } from "../invitations/invitationStatus";
import type { InvitationResponse } from "../invitations/types";
import { createPersonInCondominium, getPersonsByCondominium, updatePersonInCondominium } from "./personService";
import { PERSON_FILTERS, accessRoleLabel, emptyPersonForm, formatCpf, formatPhone, matchesPersonFilter, toPersonForm, type PersonFilter } from "./personForm";
import { PersonAvatar, PersonDetailsModal, PersonFormModal } from "./PersonModals";
import type { PersonResponse } from "./types";

export function PeoplePage() {
  const {
    condominiums,
    activeCondominium,
    activeCondominiumId,
    isLoading: isLoadingCondominiums,
    errorMessage: condominiumErrorMessage,
    setActiveCondominiumId,
  } = useCondominium();

  const [people, setPeople] = useState<PersonResponse[]>([]);
  const [invitations, setInvitations] = useState<InvitationResponse[]>([]);
  const [isLoadingPeople, setIsLoadingPeople] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingPerson, setEditingPerson] = useState<PersonResponse | null>(null);
  const [viewingPersonId, setViewingPersonId] = useState<number | null>(null);
  const [invitingPerson, setInvitingPerson] = useState<PersonResponse | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState<PersonFilter>("all");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    if (!activeCondominiumId) return;
    let isMounted = true;

    Promise.all([getPersonsByCondominium(activeCondominiumId), getInvitationsByCondominium(activeCondominiumId)])
      .then(([peopleResult, invitationsResult]) => {
        if (!isMounted) return;
        setPeople(peopleResult);
        setInvitations(invitationsResult);
        setErrorMessage("");
      })
      .catch((error) => {
        if (!isMounted) return;
        setPeople([]);
        setInvitations([]);
        setErrorMessage(error instanceof Error ? error.message : "Não foi possível carregar os moradores.");
      })
      .finally(() => isMounted && setIsLoadingPeople(false));

    return () => {
      isMounted = false;
    };
  }, [activeCondominiumId]);

  async function refreshPeople() {
    if (!activeCondominiumId) return;
    const [peopleResult, invitationsResult] = await Promise.all([
      getPersonsByCondominium(activeCondominiumId),
      getInvitationsByCondominium(activeCondominiumId),
    ]);
    setPeople(peopleResult);
    setInvitations(invitationsResult);
  }

  // Invitations come newest first, so the first one per person is the latest.
  const latestInvitationByPerson = useMemo(() => {
    const map = new Map<number, InvitationResponse>();
    for (const invitation of invitations) {
      if (!map.has(invitation.personId)) map.set(invitation.personId, invitation);
    }
    return map;
  }, [invitations]);

  const blockedInvitationPersonIds = useMemo(
    () => new Set(invitations.filter(isOpenInvitation).map((invitation) => invitation.personId)),
    [invitations],
  );
  const canInvite = (person: PersonResponse) => !person.hasRegisteredUser && !blockedInvitationPersonIds.has(person.id);
  const invitablePeople = people.filter(canInvite);

  const visiblePeople = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return people.filter(
      (person) =>
        matchesPersonFilter(person, filter) &&
        (!term ||
          person.name.toLowerCase().includes(term) ||
          person.cpf.includes(term) ||
          person.phoneNumber.includes(term) ||
          person.mainUnit.toLowerCase().includes(term)),
    );
  }, [people, searchTerm, filter]);

  const linkedPeople = people.filter((person) => person.unitCount > 0).length;
  const totalUnitLinks = people.reduce((sum, person) => sum + person.unitCount, 0);
  const peopleWithAccess = people.filter((person) => person.hasRegisteredUser).length;
  const pendingInvitations = people.filter((person) => !person.hasRegisteredUser && blockedInvitationPersonIds.has(person.id)).length;

  const isLoading = isLoadingCondominiums || (Boolean(activeCondominiumId) && isLoadingPeople);
  const pageErrorMessage = condominiumErrorMessage || errorMessage;
  const viewingPerson = people.find((person) => person.id === viewingPersonId) ?? null;
  const countFor = (value: PersonFilter) => people.filter((person) => matchesPersonFilter(person, value)).length;

  function openCreate() {
    setSuccessMessage("");
    setIsCreateOpen(true);
  }

  return (
    <>
      <PageHeader overline={activeCondominium?.condominiumName} title="Moradores">
        <Button variant="accent" disabled={!activeCondominiumId} onClick={openCreate}>
          <Plus size={18} strokeWidth={2} aria-hidden />
          Novo morador
        </Button>
      </PageHeader>

      {condominiums.length > 1 && (
        <SelectField
          label="Condomínio"
          className="mb-6 lg:hidden"
          value={activeCondominiumId ?? ""}
          onChange={(event) => setActiveCondominiumId(Number(event.target.value))}
          options={condominiums.map((condominium) => ({ value: String(condominium.condominiumId), label: condominium.condominiumName }))}
        />
      )}

      {pageErrorMessage && (
        <p role="alert" className="mb-6 rounded-field bg-vermelho-suave px-4 py-3 text-sm font-medium text-vermelho">
          {pageErrorMessage}
        </p>
      )}
      {successMessage && (
        <p role="status" className="mb-6 rounded-field bg-verde-suave px-4 py-3 text-sm font-medium text-verde-tinta">
          {successMessage}
        </p>
      )}

      <SummaryCard
        items={[
          { label: "Pessoas", value: isLoading ? "–" : String(people.length), detail: "cadastradas no condomínio" },
          {
            label: "Com unidade",
            value: isLoading ? "–" : String(linkedPeople),
            detail: `${totalUnitLinks} vínculo${totalUnitLinks === 1 ? "" : "s"} com unidades`,
            tone: people.length > 0 && linkedPeople === people.length ? "good" : "neutral",
          },
          { label: "Sem unidade", value: isLoading ? "–" : String(people.length - linkedPeople), detail: "aguardando vínculo" },
          {
            label: "Com acesso ao app",
            value: isLoading ? "–" : String(peopleWithAccess),
            detail: pendingInvitations ? `${pendingInvitations} com convite pendente` : "nenhum convite pendente",
          },
        ]}
      />

      <div className="mb-4 mt-10 flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
        <div role="tablist" aria-label="Filtro" className="flex gap-1 self-start overflow-x-auto rounded-field bg-campo p-1 [scrollbar-width:none] max-lg:max-w-full">
          {PERSON_FILTERS.map((option) => (
            <button
              key={option.value}
              type="button"
              role="tab"
              aria-selected={filter === option.value}
              onClick={() => setFilter(option.value)}
              className={`flex shrink-0 items-center gap-1.5 rounded-field px-3.5 py-1.5 text-sm font-semibold transition-colors ${
                filter === option.value ? "bg-superficie text-tinta shadow-whisper" : "text-tinta-suave hover:text-tinta"
              }`}
            >
              {option.label}
              <span className="text-xs font-medium tabular-nums text-tinta-suave">{isLoading ? "–" : countFor(option.value)}</span>
            </button>
          ))}
        </div>
        <label className="relative lg:w-72">
          <span className="sr-only">Buscar morador</span>
          <Search size={17} strokeWidth={1.8} aria-hidden className="pointer-events-none absolute inset-y-0 left-3.5 my-auto text-tinta-suave" />
          <input
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Nome, CPF, telefone ou unidade"
            className="w-full rounded-full bg-superficie py-2.5 pl-10 pr-4 text-sm text-tinta shadow-whisper outline-none placeholder:text-tinta-suave/80 focus:ring-2 focus:ring-verde focus-visible:outline-none"
          />
        </label>
      </div>

      <ul className="divide-y divide-linha overflow-hidden rounded-card bg-superficie shadow-whisper">
        {visiblePeople.length === 0 ? (
          <li className="flex flex-col items-center px-5 py-12 text-center">
            {isLoading ? (
              <span className="text-sm text-tinta-suave">Carregando…</span>
            ) : people.length > 0 ? (
              <span className="text-sm text-tinta-suave">Nenhum morador encontrado com esses filtros.</span>
            ) : (
              <>
                <span className="grid size-12 place-items-center rounded-block bg-verde-suave text-verde-tinta">
                  <Users size={22} strokeWidth={1.8} aria-hidden />
                </span>
                <span className="mt-4 font-display text-lg font-bold text-tinta">Nenhum morador cadastrado</span>
                <span className="mt-1 max-w-sm text-sm text-tinta-suave">Cadastre a primeira pessoa antes de vincular unidades ou enviar convites.</span>
                {activeCondominiumId && (
                  <Button variant="quiet" size="sm" className="mt-5" onClick={openCreate}>
                    Cadastrar o primeiro morador
                  </Button>
                )}
              </>
            )}
          </li>
        ) : (
          visiblePeople.map((person) => {
            const invitation = latestInvitationByPerson.get(person.id);
            const invitationStatus = invitation ? invitationStatusOf(invitation) : null;
            const roleLabel = accessRoleLabel(person);
            const hasOpenInvitation = !person.hasRegisteredUser && invitationStatus && invitationStatus !== "Accepted";
            const accessText = person.hasRegisteredUser
              ? "Acesso ativo"
              : hasOpenInvitation
                ? `Convite ${invitationStatusLabel(invitationStatus).toLowerCase()}`
                : "Sem acesso";
            return (
              <li key={person.id}>
                <button
                  type="button"
                  onClick={() => {
                    setSuccessMessage("");
                    setViewingPersonId(person.id);
                  }}
                  className="flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-campo/60"
                >
                  <PersonAvatar name={person.name} isActive={person.hasRegisteredUser} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate text-[15px] font-semibold text-tinta">{person.name}</span>
                      {roleLabel === "Síndico" && <span className="shrink-0 rounded-chip bg-campo px-2 py-0.5 text-xs font-semibold text-tinta">Síndico</span>}
                    </span>
                    <span className="block truncate text-[13px] text-tinta-suave">
                      CPF {formatCpf(person.cpf)} · {formatPhone(person.phoneNumber)}
                    </span>
                    <span className="block truncate text-xs text-tinta-suave md:hidden">
                      <span className={`sm:hidden ${person.unitCount ? "" : "text-ambar"}`}>{person.mainUnit || "Sem unidade"} · </span>
                      {accessText}
                    </span>
                  </span>
                  <span className="hidden w-44 shrink-0 text-[13px] sm:block">
                    <span className={`block truncate font-semibold ${person.unitCount ? "text-tinta" : "text-ambar"}`}>{person.mainUnit || "Sem unidade"}</span>
                    <span className="block text-tinta-suave">
                      {person.unitCount > 1 ? `+${person.unitCount - 1} vínculo${person.unitCount > 2 ? "s" : ""}` : person.unitCount === 1 ? "1 vínculo" : "vincular em Unidades"}
                    </span>
                  </span>
                  <span className="hidden w-32 shrink-0 justify-end md:flex">
                    {person.hasRegisteredUser ? (
                      <span className="rounded-chip bg-verde-suave px-2 py-0.5 text-xs font-semibold text-verde-tinta">Acesso ativo</span>
                    ) : hasOpenInvitation ? (
                      <InvitationStatusChip status={invitationStatus} prefix="Convite" />
                    ) : (
                      <span className="rounded-chip bg-campo px-2 py-0.5 text-xs font-semibold text-tinta-suave">Sem acesso</span>
                    )}
                  </span>
                  <ChevronRight size={18} strokeWidth={1.8} aria-hidden className="shrink-0 text-tinta-suave" />
                </button>
              </li>
            );
          })
        )}
      </ul>

      {isCreateOpen && activeCondominiumId && (
        <PersonFormModal
          title="Novo morador"
          submitLabel="Cadastrar morador"
          initialForm={emptyPersonForm}
          onClose={() => setIsCreateOpen(false)}
          onSubmit={async (form) => {
            await createPersonInCondominium(activeCondominiumId, form);
            await refreshPeople();
            setSuccessMessage(`${form.name} cadastrado.`);
          }}
        />
      )}

      {editingPerson && activeCondominiumId && (
        <PersonFormModal
          title="Editar morador"
          submitLabel="Salvar alterações"
          initialForm={toPersonForm(editingPerson)}
          onClose={() => setEditingPerson(null)}
          onSubmit={async (form) => {
            await updatePersonInCondominium(activeCondominiumId, editingPerson.id, form);
            await refreshPeople();
            setSuccessMessage("Morador atualizado.");
          }}
        />
      )}

      {viewingPerson && (
        <PersonDetailsModal
          person={viewingPerson}
          invitation={latestInvitationByPerson.get(viewingPerson.id) ?? null}
          canInvite={canInvite(viewingPerson)}
          onClose={() => setViewingPersonId(null)}
          onEdit={() => {
            setEditingPerson(viewingPerson);
            setViewingPersonId(null);
          }}
          onInvite={() => {
            setInvitingPerson(viewingPerson);
            setViewingPersonId(null);
          }}
        />
      )}

      {invitingPerson && activeCondominiumId && (
        <CreateInvitationModal
          condominiumId={activeCondominiumId}
          people={invitablePeople}
          initialPersonId={invitingPerson.id}
          onClose={() => setInvitingPerson(null)}
          onCreated={async (invitation) => {
            await refreshPeople();
            setSuccessMessage(`Convite enviado para ${invitation.email}.`);
          }}
        />
      )}
    </>
  );
}
