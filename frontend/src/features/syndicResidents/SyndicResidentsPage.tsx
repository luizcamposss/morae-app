import { useEffect, useMemo, useState } from "react";
import { Search, Users } from "lucide-react";
import { useCondominium } from "../../app/providers/useCondominium";
import { SummaryCard } from "../../shared/components/SummaryCard";
import { PageHeader } from "../../shared/layout/PageHeader";
import { formatPhone } from "../persons/personForm";
import { PersonAvatar } from "../persons/PersonModals";
import { getPersonsByCondominium } from "../persons/personService";
import type { PersonResponse } from "../persons/types";

// Read-only list for the syndic (residents.view); the API limits it to his buildings.
export function SyndicResidentsPage() {
  const { activeCondominium, activeCondominiumId } = useCondominium();
  const [people, setPeople] = useState<PersonResponse[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function loadPeople() {
      if (!activeCondominiumId) {
        setPeople([]);
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setErrorMessage("");
        setPeople(await getPersonsByCondominium(activeCondominiumId));
      } catch (error) {
        setPeople([]);
        setErrorMessage(error instanceof Error ? error.message : "Não foi possível carregar moradores.");
      } finally {
        setIsLoading(false);
      }
    }

    void loadPeople();
  }, [activeCondominiumId]);

  const filteredPeople = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    if (!normalizedSearch) return people;

    return people.filter((person) =>
      [person.name, person.phoneNumber, person.mainUnit, person.cpf].join(" ").toLowerCase().includes(normalizedSearch),
    );
  }, [people, searchTerm]);

  const linkedPeople = people.filter((person) => person.unitCount > 0).length;
  const totalUnitLinks = people.reduce((sum, person) => sum + person.unitCount, 0);

  return (
    <>
      <PageHeader overline={activeCondominium?.condominiumName} title="Moradores" />

      {errorMessage && (
        <p role="alert" className="mb-6 rounded-field bg-vermelho-suave px-4 py-3 text-sm font-medium text-vermelho">
          {errorMessage}
        </p>
      )}

      <SummaryCard
        items={[
          { label: "Pessoas", value: isLoading ? "–" : String(people.length), detail: "que você acompanha" },
          {
            label: "Com unidade",
            value: isLoading ? "–" : String(linkedPeople),
            detail: `${totalUnitLinks} vínculo${totalUnitLinks === 1 ? "" : "s"} com unidades`,
            tone: people.length > 0 && linkedPeople === people.length ? "good" : "neutral",
          },
          { label: "Sem unidade", value: isLoading ? "–" : String(people.length - linkedPeople), detail: "aguardando vínculo" },
        ]}
      />

      <div className="mb-4 mt-10 flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
        <h2 className="font-display text-[21px] font-bold leading-[1.2] tracking-[-0.01em] text-tinta">
          Todas as pessoas
          {!isLoading && searchTerm.trim() && (
            <span className="ml-2 font-sans text-sm font-medium tabular-nums text-tinta-suave">
              {filteredPeople.length} de {people.length}
            </span>
          )}
        </h2>
        <label className="relative lg:w-80">
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
        {filteredPeople.length === 0 ? (
          <li className="flex flex-col items-center px-5 py-12 text-center">
            {isLoading ? (
              <span className="text-sm text-tinta-suave">Carregando…</span>
            ) : people.length > 0 ? (
              <span className="text-sm text-tinta-suave">Nenhum morador encontrado com essa busca.</span>
            ) : (
              <>
                <span className="grid size-12 place-items-center rounded-block bg-verde-suave text-verde-tinta">
                  <Users size={22} strokeWidth={1.8} aria-hidden />
                </span>
                <span className="mt-4 font-display text-lg font-bold text-tinta">Nenhum morador por aqui</span>
                <span className="mt-1 max-w-sm text-sm text-tinta-suave">
                  Quando a administração cadastrar pessoas e vinculá-las às unidades, elas aparecem aqui.
                </span>
              </>
            )}
          </li>
        ) : (
          filteredPeople.map((person) => {
            const isLinked = person.unitCount > 0;
            return (
              <li key={person.id} className="flex items-center gap-4 px-5 py-4">
                <PersonAvatar name={person.name} isActive={person.hasRegisteredUser} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-semibold text-tinta">{person.name}</span>
                  <span className="block truncate text-[13px] tabular-nums text-tinta-suave">
                    {person.phoneNumber ? formatPhone(person.phoneNumber) : "Sem telefone"}
                    <span className={`sm:hidden ${isLinked ? "" : "text-ambar"}`}> · {person.mainUnit || "Sem unidade"}</span>
                  </span>
                </span>
                <span className="hidden w-44 shrink-0 text-[13px] sm:block">
                  <span className={`block truncate font-semibold ${isLinked ? "text-tinta" : "text-ambar"}`}>{person.mainUnit || "Sem unidade"}</span>
                  <span className="block tabular-nums text-tinta-suave">
                    {person.unitCount > 1
                      ? `+${person.unitCount - 1} vínculo${person.unitCount > 2 ? "s" : ""}`
                      : isLinked
                        ? "1 vínculo"
                        : "nenhum vínculo"}
                  </span>
                </span>
                <span className="hidden w-28 shrink-0 justify-end md:flex">
                  {isLinked ? (
                    <span className="rounded-chip bg-verde-suave px-2 py-0.5 text-xs font-semibold text-verde-tinta">Vinculado</span>
                  ) : (
                    <span className="rounded-chip bg-ambar-suave px-2 py-0.5 text-xs font-semibold text-ambar">Sem unidade</span>
                  )}
                </span>
              </li>
            );
          })
        )}
      </ul>
    </>
  );
}
