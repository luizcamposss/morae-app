import { useEffect, useState } from "react";
import { Building2, DoorClosed } from "lucide-react";
import { useAuth } from "../../app/providers/useAuth";
import { PageHeader } from "../../shared/layout/PageHeader";
import { getMyUnits } from "../me/meService";
import type { MeUnitResponse } from "../me/types";
import { initialsOf } from "../persons/personForm";
import { getPeopleByUnit } from "../personUnits/personUnitService";
import type { PersonUnitResponse } from "../personUnits/types";
import { relationshipLabel, unitTypeLabel } from "../units/unitForm";

// Who is linked to each unit; null when that list could not be loaded.
type PeopleByUnit = Record<number, PersonUnitResponse[] | null>;

export function ResidentUnitPage() {
  const { user } = useAuth();
  const [units, setUnits] = useState<MeUnitResponse[]>([]);
  const [peopleByUnit, setPeopleByUnit] = useState<PeopleByUnit>({});
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    getMyUnits()
      .then(async (result) => {
        if (!isMounted) return;
        setUnits(result);
        setIsLoading(false);

        const entries = await Promise.all(
          result.map(async (unit) => [unit.unitId, await getPeopleByUnit(unit.unitId).catch(() => null)] as const),
        );
        if (isMounted) setPeopleByUnit(Object.fromEntries(entries));
      })
      .catch((error) => {
        if (!isMounted) return;
        setErrorMessage(error instanceof Error ? error.message : "Não foi possível carregar suas unidades.");
        setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const condominiumNames = [...new Set(units.map((unit) => unit.condominiumName))];

  return (
    <>
      <PageHeader overline={condominiumNames.length === 1 ? condominiumNames[0] : "Área do morador"} title={units.length > 1 ? "Minhas unidades" : "Minha unidade"} />

      {errorMessage && (
        <p role="alert" className="mb-6 rounded-field bg-vermelho-suave px-4 py-3 text-sm font-medium text-vermelho">
          {errorMessage}
        </p>
      )}

      {isLoading ? (
        <p className="rounded-card bg-superficie px-5 py-12 text-center text-sm text-tinta-suave shadow-whisper">Carregando…</p>
      ) : units.length === 0 ? (
        !errorMessage && (
          <section className="flex flex-col items-center rounded-card bg-superficie px-5 py-12 text-center shadow-whisper">
            <span className="grid size-12 place-items-center rounded-block bg-verde-suave text-verde-tinta">
              <DoorClosed size={22} strokeWidth={1.8} aria-hidden />
            </span>
            <h2 className="mt-4 font-display text-lg font-bold text-tinta">Nenhuma unidade vinculada</h2>
            <p className="mt-1 max-w-sm text-sm text-tinta-suave">Quando a administração vincular você a uma unidade, ela aparece aqui.</p>
          </section>
        )
      ) : (
        <ul className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {units.map((unit) => (
            <li key={unit.unitId}>
              <UnitCard
                unit={unit}
                people={unit.unitId in peopleByUnit ? peopleByUnit[unit.unitId] : undefined}
                currentPersonId={user?.personId}
                showCondominium={condominiumNames.length > 1}
              />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

type UnitCardProps = {
  unit: MeUnitResponse;
  // undefined while loading, null when it failed.
  people: PersonUnitResponse[] | null | undefined;
  currentPersonId?: number;
  showCondominium: boolean;
};

function UnitCard({ unit, people, currentPersonId, showCondominium }: UnitCardProps) {
  return (
    <article className="overflow-hidden rounded-card bg-superficie shadow-whisper">
      <div className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <p className="flex min-w-0 items-center gap-1.5 text-[13px] text-tinta-suave">
            <Building2 size={15} strokeWidth={1.8} aria-hidden className="shrink-0" />
            <span className="truncate">{showCondominium ? `${unit.condominiumName} · ${unit.buildingName}` : unit.buildingName}</span>
          </p>
          <span className="shrink-0 rounded-chip bg-verde-suave px-2 py-0.5 text-xs font-semibold text-verde-tinta">{relationshipLabel(unit.relationshipType)}</span>
        </div>
        <p className="mt-3 font-display text-[44px] font-bold leading-none tracking-[-0.02em] tabular-nums text-tinta">{unit.unitNumber}</p>
        <p className="mt-2 text-sm text-tinta-suave">{unitTypeLabel(unit.unitType)}</p>
      </div>

      <div className="border-t border-linha px-5 py-4 sm:px-6">
        <h2 className="text-[13px] font-semibold text-tinta-suave">Quem mora aqui</h2>
        {people === undefined ? (
          <p className="py-3 text-sm text-tinta-suave">Carregando…</p>
        ) : people === null ? (
          <p className="py-3 text-sm text-tinta-suave">Não foi possível carregar quem mora aqui.</p>
        ) : people.length === 0 ? (
          <p className="py-3 text-sm text-tinta-suave">Ninguém vinculado ainda.</p>
        ) : (
          <ul className="mt-1 divide-y divide-linha">
            {people.map((person) => (
              <li key={person.id} className="flex items-center gap-3 py-3">
                <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-full bg-campo text-xs font-semibold text-tinta">
                  {initialsOf(person.personName)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-semibold text-tinta">{person.personName}</span>
                  <span className="block text-[13px] text-tinta-suave">{relationshipLabel(person.relationshipType)}</span>
                </span>
                {person.personId === currentPersonId && (
                  <span className="shrink-0 rounded-chip bg-campo px-2 py-0.5 text-xs font-semibold text-tinta-suave">Você</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </article>
  );
}
