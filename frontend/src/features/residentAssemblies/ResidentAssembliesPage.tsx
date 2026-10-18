import { useEffect, useMemo, useState } from "react";
import { CalendarClock, CheckCheck, Vote, type LucideIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useCondominium } from "../../app/providers/useCondominium";
import { GroupedList, GroupedRow } from "../../shared/components/GroupedList";
import { MoraeMark } from "../../shared/components/MoraeMark";
import { SelectField } from "../../shared/components/SelectField";
import { PageHeader } from "../../shared/layout/PageHeader";
import { ASSEMBLY_PHASE, assemblyTypeLabel, describeVoting } from "../assemblies/assemblyMeta";
import { PhaseChip } from "../assemblies/AssemblyParts";
import { getAssemblies } from "../assemblies/assemblyService";
import type { AssemblyResponse } from "../assemblies/types";

type Group = { key: string; title: string; icon: LucideIcon; tone: "green" | "amber" | "neutral"; items: AssemblyResponse[] };

// The assemblies of the active condominium for the resident: vote in the open ones, see what
// is coming and read the results of the closed ones.
export function ResidentAssembliesPage() {
  const { condominiums, activeCondominium, activeCondominiumId, setActiveCondominiumId } = useCondominium();
  const navigate = useNavigate();
  const [loaded, setLoaded] = useState<{ key: number | null; assemblies: AssemblyResponse[]; errorMessage: string }>({
    key: null,
    assemblies: [],
    errorMessage: "",
  });

  useEffect(() => {
    if (!activeCondominiumId) return;
    let isMounted = true;

    getAssemblies(activeCondominiumId)
      .then((assemblies) => isMounted && setLoaded({ key: activeCondominiumId, assemblies, errorMessage: "" }))
      .catch(
        (error) =>
          isMounted &&
          setLoaded({
            key: activeCondominiumId,
            assemblies: [],
            errorMessage: error instanceof Error ? error.message : "Não foi possível carregar as assembleias.",
          }),
      );

    return () => {
      isMounted = false;
    };
  }, [activeCondominiumId]);

  const isLoading = loaded.key !== activeCondominiumId;

  const groups = useMemo<Group[]>(() => {
    const assemblies = isLoading ? [] : loaded.assemblies;
    const byPhase = (phases: number[]) => assemblies.filter((assembly) => phases.includes(assembly.phase));
    return [
      {
        key: "open",
        title: "Votação aberta",
        icon: Vote,
        tone: "green" as const,
        items: byPhase([ASSEMBLY_PHASE.open]).sort((a, b) => a.votingEndsAt.localeCompare(b.votingEndsAt)),
      },
      {
        key: "scheduled",
        title: "Agendadas",
        icon: CalendarClock,
        tone: "amber" as const,
        items: byPhase([ASSEMBLY_PHASE.scheduled]).sort((a, b) => a.votingStartsAt.localeCompare(b.votingStartsAt)),
      },
      {
        key: "closed",
        title: "Encerradas",
        icon: CheckCheck,
        tone: "neutral" as const,
        items: byPhase([ASSEMBLY_PHASE.closed, ASSEMBLY_PHASE.canceled]).sort((a, b) => b.votingEndsAt.localeCompare(a.votingEndsAt)),
      },
    ].filter((group) => group.items.length > 0);
  }, [loaded.assemblies, isLoading]);

  return (
    <>
      <PageHeader overline={activeCondominium?.condominiumName} title="Assembleias" />

      {condominiums.length > 1 && (
        <SelectField
          label="Condomínio"
          className="mb-6 lg:hidden"
          value={activeCondominiumId ? String(activeCondominiumId) : ""}
          onChange={(event) => setActiveCondominiumId(Number(event.target.value))}
          options={condominiums.map((condominium) => ({ value: String(condominium.condominiumId), label: condominium.condominiumName }))}
        />
      )}

      {loaded.errorMessage && (
        <p role="alert" className="mb-6 rounded-field bg-vermelho-suave px-4 py-3 text-sm font-medium text-vermelho">
          {loaded.errorMessage}
        </p>
      )}

      <div aria-busy={isLoading} className="flex max-w-3xl flex-col gap-6">
        {isLoading ? (
          <p className="flex items-center justify-center gap-2 rounded-card bg-superficie px-5 py-12 text-sm text-tinta-suave shadow-whisper">
            <MoraeMark size={18} motion="respiro" />
            Carregando assembleias…
          </p>
        ) : groups.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-card bg-superficie px-6 py-12 text-center shadow-whisper">
            <span aria-hidden className="grid size-12 place-items-center rounded-block bg-campo text-tinta-suave">
              <Vote size={22} strokeWidth={1.8} />
            </span>
            <p className="text-[15px] font-semibold text-tinta">Nenhuma assembleia por enquanto.</p>
            <p className="max-w-sm text-sm text-tinta-suave">
              Quando a gestão convocar uma assembleia, você recebe um aviso e vota por aqui, pelo celular.
            </p>
          </div>
        ) : (
          groups.map((group) => (
            <GroupedList key={group.key} title={group.title}>
              {group.items.map((assembly) => (
                <GroupedRow
                  key={assembly.id}
                  icon={group.icon}
                  tone={assembly.phase === ASSEMBLY_PHASE.canceled ? "neutral" : group.tone}
                  title={assembly.title}
                  subtitle={`${assemblyTypeLabel(assembly.type)} · ${describeVoting(assembly)}`}
                  trailing={group.key === "closed" ? <PhaseChip phase={assembly.phase} /> : undefined}
                  onClick={() => navigate(String(assembly.id))}
                />
              ))}
            </GroupedList>
          ))
        )}
      </div>
    </>
  );
}
