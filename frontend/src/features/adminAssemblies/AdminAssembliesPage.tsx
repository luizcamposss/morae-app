import { useEffect, useState } from "react";
import { ChevronRight, Plus, Vote } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useCondominium } from "../../app/providers/useCondominium";
import { Button } from "../../shared/components/Button";
import { MoraeMark } from "../../shared/components/MoraeMark";
import { SelectField } from "../../shared/components/SelectField";
import { PageHeader } from "../../shared/layout/PageHeader";
import { assemblyTypeLabel, describeVoting } from "../assemblies/assemblyMeta";
import { createAssembly, getAssemblies } from "../assemblies/assemblyService";
import type { AssemblyResponse, SaveAssemblyRequest } from "../assemblies/types";
import { PhaseChip } from "../assemblies/AssemblyParts";
import { AssemblyFormModal } from "./AssemblyModals";
import { filterAssemblies, sortAssemblies, type AssemblyFilter } from "./assemblyList";

type LoadedAssemblies = { condominiumId: number | null; assemblies: AssemblyResponse[]; errorMessage: string };

const tabs: Array<{ value: AssemblyFilter; label: string }> = [
  { value: "all", label: "Todas" },
  { value: "active", label: "Em andamento" },
  { value: "draft", label: "Rascunhos" },
  { value: "closed", label: "Encerradas" },
  { value: "canceled", label: "Canceladas" },
];

// Management view (Admin; reusable by the syndic with assemblies.manage): list by phase and
// create a draft. Each assembly opens its own page (the link used by notifications and e-mails).
export function AdminAssembliesPage() {
  const navigate = useNavigate();
  const { condominiums, activeCondominium, activeCondominiumId, setActiveCondominiumId } = useCondominium();
  const [loaded, setLoaded] = useState<LoadedAssemblies>({ condominiumId: null, assemblies: [], errorMessage: "" });
  const [filter, setFilter] = useState<AssemblyFilter>("all");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!activeCondominiumId) return;
    let isMounted = true;

    getAssemblies(activeCondominiumId)
      .then((assemblies) => isMounted && setLoaded({ condominiumId: activeCondominiumId, assemblies, errorMessage: "" }))
      .catch(
        (error) =>
          isMounted &&
          setLoaded({
            condominiumId: activeCondominiumId,
            assemblies: [],
            errorMessage: error instanceof Error ? error.message : "Não foi possível carregar as assembleias.",
          }),
      );

    return () => {
      isMounted = false;
    };
  }, [activeCondominiumId]);

  const isLoading = loaded.condominiumId !== activeCondominiumId;
  const assemblies = isLoading ? [] : sortAssemblies(loaded.assemblies);
  const visibleAssemblies = filterAssemblies(assemblies, filter);
  const shownError = isLoading ? "" : loaded.errorMessage;

  function openForm() {
    setFormError("");
    setIsFormOpen(true);
  }

  async function handleCreate(request: SaveAssemblyRequest) {
    if (!activeCondominiumId) return;
    setIsSubmitting(true);
    setFormError("");

    try {
      const created = await createAssembly(activeCondominiumId, request);
      navigate(String(created.id));
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Não foi possível criar a assembleia.");
      setIsSubmitting(false);
    }
  }

  const overline = [activeCondominium?.condominiumName, isLoading ? null : `${assemblies.length} ${assemblies.length === 1 ? "assembleia" : "assembleias"}`]
    .filter(Boolean)
    .join(" · ");

  return (
    <>
      <PageHeader overline={overline || undefined} title="Assembleias">
        <Button variant="accent" onClick={openForm} disabled={!activeCondominiumId} className="max-sm:px-4">
          <Plus size={18} strokeWidth={2} aria-hidden />
          <span className="max-sm:sr-only">Nova assembleia</span>
        </Button>
      </PageHeader>

      {condominiums.length > 1 && (
        <SelectField
          label="Condomínio"
          className="mb-6 lg:hidden"
          value={String(activeCondominiumId ?? "")}
          options={condominiums.map((item) => ({ value: String(item.condominiumId), label: item.condominiumName }))}
          onChange={(event) => setActiveCondominiumId(Number(event.target.value))}
        />
      )}

      {shownError && (
        <p role="alert" className="mb-6 rounded-field bg-vermelho-suave px-4 py-3 text-sm font-medium text-vermelho">
          {shownError}
        </p>
      )}

      <div className="-mx-4 mb-5 overflow-x-auto px-4 [scrollbar-width:none] lg:mx-0 lg:px-0">
        <div role="group" aria-label="Filtrar por situação" className="inline-flex gap-1 rounded-block bg-menu p-1">
          {tabs.map((tab) => {
            const isActive = filter === tab.value;
            const count = filterAssemblies(assemblies, tab.value).length;
            return (
              <button
                key={tab.value}
                type="button"
                aria-pressed={isActive}
                onClick={() => setFilter(tab.value)}
                className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-field px-3.5 py-2 text-sm font-semibold transition-colors ${
                  isActive ? "bg-superficie text-tinta shadow-whisper" : "text-tinta-suave hover:text-tinta"
                }`}
              >
                {tab.label}
                <span className={`text-xs tabular-nums ${isActive ? "text-tinta-suave" : "text-tinta-suave/80"}`}>{isLoading ? "" : count}</span>
              </button>
            );
          })}
        </div>
      </div>

      <ul className="divide-y divide-linha overflow-hidden rounded-card bg-superficie shadow-whisper">
        {visibleAssemblies.length === 0 ? (
          <li className="flex flex-col items-center px-5 py-12 text-center">
            {isLoading ? (
              <span className="flex items-center gap-2 text-sm text-tinta-suave">
                <MoraeMark size={18} motion="respiro" />
                Carregando assembleias…
              </span>
            ) : loaded.errorMessage ? (
              <span className="text-sm text-tinta-suave">Não foi possível mostrar as assembleias agora.</span>
            ) : (
              <>
                <span className="grid size-12 place-items-center rounded-block bg-verde-suave text-verde-tinta">
                  <Vote size={22} strokeWidth={1.8} aria-hidden />
                </span>
                <span className="mt-4 font-display text-lg font-bold text-tinta">
                  {filter === "all" ? "Nenhuma assembleia ainda" : "Nada por aqui"}
                </span>
                <span className="mt-1 max-w-sm text-sm text-tinta-suave">
                  {filter === "all"
                    ? "Monte as pautas, publique e os moradores votam pelo celular. O resultado sai com o quórum calculado."
                    : "As assembleias nesta situação aparecem aqui."}
                </span>
                {filter === "all" && (
                  <Button variant="quiet" size="sm" className="mt-5" onClick={openForm}>
                    Criar a primeira assembleia
                  </Button>
                )}
              </>
            )}
          </li>
        ) : (
          visibleAssemblies.map((assembly) => (
            <li key={assembly.id}>
              <button
                type="button"
                onClick={() => navigate(String(assembly.id))}
                className="flex w-full items-center gap-3 px-4 py-4 text-left transition-colors hover:bg-campo/60 sm:px-5"
              >
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate text-[15px] font-semibold text-tinta">{assembly.title}</span>
                    <PhaseChip phase={assembly.phase} />
                  </span>
                  <span className="mt-0.5 block text-[13px] tabular-nums text-tinta-suave">
                    {assemblyTypeLabel(assembly.type)} · {describeVoting(assembly)} · {assembly.itemsCount}{" "}
                    {assembly.itemsCount === 1 ? "pauta" : "pautas"}
                  </span>
                </span>
                <ChevronRight size={18} strokeWidth={1.8} aria-hidden className="shrink-0 text-tinta-suave" />
              </button>
            </li>
          ))
        )}
      </ul>

      {isFormOpen && (
        <AssemblyFormModal
          assembly={null}
          errorMessage={formError}
          isSubmitting={isSubmitting}
          onClose={() => setIsFormOpen(false)}
          onSubmit={handleCreate}
        />
      )}
    </>
  );
}
