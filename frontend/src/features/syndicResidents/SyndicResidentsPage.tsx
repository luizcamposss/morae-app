import { useEffect, useMemo, useState } from "react";
import { useCondominium } from "../../app/providers/useCondominium";
import { MetricCard } from "../../shared/components/MetricCard";
import { StatusBadge } from "../../shared/components/StatusBadge";
import { getPersonsByCondominium } from "../persons/personService";
import type { PersonResponse } from "../persons/types";

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
        setErrorMessage(
          error instanceof Error ? error.message : "Não foi possível carregar moradores.",
        );
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
      [person.name, person.phoneNumber, person.mainUnit, person.cpf]
        .join(" ")
        .toLowerCase()
        .includes(normalizedSearch),
    );
  }, [people, searchTerm]);

  const linkedPeople = people.filter((person) => person.unitCount > 0);

  return (
    <section className="rounded-[2rem] border border-[#E5E7EB] bg-white p-6 shadow-sm">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-[#111827]">Moradores</h1>
        <p className="mt-1 text-sm font-semibold text-[#6B7280]">
          Consulta de pessoas cadastradas em {activeCondominium?.condominiumName ?? "seu condomínio"}.
        </p>
      </div>

      {errorMessage && (
        <div className="mt-5 rounded-2xl border border-[#FECACA] bg-[#FDECEC] px-4 py-3 text-sm font-bold text-[#B42318]">
          {errorMessage}
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <MetricCard
          label="Pessoas"
          value={people.length.toString()}
          helper="Cadastradas no condomínio"
        />
        <MetricCard
          label="Com unidade"
          value={linkedPeople.length.toString()}
          helper="Possuem vínculo"
        />
        <MetricCard
          label="Sem unidade"
          value={(people.length - linkedPeople.length).toString()}
          helper="Aguardando vínculo"
        />
      </div>

      <div className="mt-6 rounded-[1.5rem] border border-[#E5E7EB] bg-[#F3F4F6] p-4">
        <div className="mb-4 flex flex-col gap-3 md:flex-row">
          <div className="relative flex-1">
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Buscar morador, unidade, CPF ou telefone..."
              className="h-11 w-full rounded-2xl border border-[#E5E7EB] bg-white px-4 pr-12 text-sm font-semibold text-[#111827] outline-none transition placeholder:text-[#9CA3AF] focus:border-[#22C55E] focus:ring-4 focus:ring-[#86EFAC]/30"
            />

            {searchTerm && (
              <button
                type="button"
                aria-label="Limpar busca"
                onClick={() => setSearchTerm("")}
                className="absolute right-2 top-1/2 flex size-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full text-lg font-black leading-none text-[#6B7280] transition hover:bg-[#DCFCE7] hover:text-[#0B3D2E] focus:outline-none focus:ring-4 focus:ring-[#86EFAC]/30"
              >
                ×
              </button>
            )}
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-[#DCFCE7] text-xs uppercase tracking-wide text-[#0B3D2E]">
                <tr>
                  <th className="px-4 py-3 font-extrabold">Nome</th>
                  <th className="px-4 py-3 font-extrabold">Telefone</th>
                  <th className="px-4 py-3 font-extrabold">Unidade principal</th>
                  <th className="px-4 py-3 font-extrabold">Vínculos</th>
                  <th className="px-4 py-3 font-extrabold">Status</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-[#E5E7EB]">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center font-bold text-[#6B7280]">
                      Carregando moradores...
                    </td>
                  </tr>
                ) : filteredPeople.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center font-bold text-[#6B7280]">
                      Nenhum morador encontrado.
                    </td>
                  </tr>
                ) : (
                  filteredPeople.map((person) => (
                    <tr key={person.id} className="transition hover:bg-[#F3F4F6]">
                      <td className="px-4 py-4 font-extrabold text-[#111827]">{person.name}</td>
                      <td className="px-4 py-4 font-semibold text-[#6B7280]">
                        {person.phoneNumber || "-"}
                      </td>
                      <td className="px-4 py-4 font-semibold text-[#6B7280]">
                        {person.mainUnit || "Sem unidade"}
                      </td>
                      <td className="px-4 py-4 font-semibold text-[#6B7280]">
                        {person.unitCount}
                      </td>
                      <td className="px-4 py-4">
                        <StatusBadge
                          label={person.unitCount > 0 ? "Vinculado" : "Sem unidade"}
                          variant={person.unitCount > 0 ? "success" : "neutral"}
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}
