import { useCallback, useEffect, useState } from "react";
import { Check } from "lucide-react";
import { useCondominium } from "../../app/providers/useCondominium";
import { Button, ButtonLink } from "../../shared/components/Button";
import { SelectField } from "../../shared/components/SelectField";
import { PageHeader } from "../../shared/layout/PageHeader";
import { BuildingsStep } from "./BuildingsStep";
import { ReceivingStep } from "./ReceivingStep";
import { ResidentsStep } from "./ResidentsStep";
import { UnitsStep } from "./UnitsStep";
import { SETUP_STEPS, errorText, fetchSetupData, progressOf, type SetupData } from "./setupData";

type Loaded = { condominiumId: number; data: SetupData | null; error: string };

// "Montar o condomínio": buildings → generated units → residents → receiving and invitations.
// Each step saves on its own, so the admin can leave and come back where they stopped.
export function AdminSetupPage() {
  const { condominiums, activeCondominium, activeCondominiumId, setActiveCondominiumId } = useCondominium();
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  // Chosen step per condominium; null opens the first one still missing.
  const [chosenStep, setChosenStep] = useState<{ condominiumId: number; index: number } | null>(null);
  // Units per floor typed in step 1, used to prefill the generator in step 2.
  const [unitsPerFloor, setUnitsPerFloor] = useState<Record<number, number>>({});

  useEffect(() => {
    if (!activeCondominiumId) return;
    let isMounted = true;

    fetchSetupData(activeCondominiumId)
      .then((data) => isMounted && setLoaded({ condominiumId: activeCondominiumId, data, error: "" }))
      .catch(
        (error) =>
          isMounted && setLoaded({ condominiumId: activeCondominiumId, data: null, error: errorText(error, "Não foi possível carregar a configuração.") }),
      );

    return () => {
      isMounted = false;
    };
  }, [activeCondominiumId, refreshKey]);

  const reload = useCallback(() => setRefreshKey((key) => key + 1), []);
  const current = loaded && loaded.condominiumId === activeCondominiumId ? loaded : null;
  const data = current?.data ?? null;
  const progress = data ? progressOf(data) : null;
  const firstMissing = progress ? Math.max(0, SETUP_STEPS.findIndex((step) => !progress[step.key])) : 0;
  const stepIndex = chosenStep && chosenStep.condominiumId === activeCondominiumId ? chosenStep.index : firstMissing;
  const step = SETUP_STEPS[stepIndex];
  const goTo = (index: number) => activeCondominiumId && setChosenStep({ condominiumId: activeCondominiumId, index });
  // Stays on the current step after saving (the default would jump to the next missing one).
  const handleSaved = () => {
    goTo(stepIndex);
    reload();
  };

  return (
    <>
      <PageHeader overline={activeCondominium?.condominiumName} title="Montar o condomínio" />

      {condominiums.length > 1 && (
        <SelectField
          label="Condomínio"
          className="mb-6 lg:hidden"
          value={String(activeCondominiumId ?? "")}
          options={condominiums.map((item) => ({ value: String(item.condominiumId), label: item.condominiumName }))}
          onChange={(event) => setActiveCondominiumId(Number(event.target.value))}
        />
      )}

      {!activeCondominiumId ? (
        <p className="rounded-field bg-ambar-suave px-4 py-3 text-sm font-medium text-tinta">Nenhum condomínio ativo vinculado ao seu usuário.</p>
      ) : current?.error ? (
        <p role="alert" className="rounded-field bg-vermelho-suave px-4 py-3 text-sm font-medium text-vermelho">
          {current.error}
        </p>
      ) : !data || !progress ? (
        <p className="rounded-card bg-superficie px-5 py-10 text-center text-sm text-tinta-suave shadow-whisper">Carregando…</p>
      ) : (
        <>
          <nav aria-label="Etapas" className="mb-8">
            <div className="mb-3 flex items-baseline justify-between gap-3 text-[13px] text-tinta-suave">
              <span>
                Etapa {stepIndex + 1} de {SETUP_STEPS.length}
              </span>
              <span className="tabular-nums">
                {progress.doneCount} de {SETUP_STEPS.length} prontas
              </span>
            </div>
            <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-menu" aria-hidden>
              <div className="h-full rounded-full bg-verde transition-[width] duration-300" style={{ width: `${(progress.doneCount / SETUP_STEPS.length) * 100}%` }} />
            </div>
            <ol className="grid grid-cols-4 gap-2">
              {SETUP_STEPS.map((item, index) => {
                const isDone = progress[item.key];
                const isActive = index === stepIndex;
                return (
                  <li key={item.key}>
                    <button
                      type="button"
                      onClick={() => goTo(index)}
                      aria-current={isActive ? "step" : undefined}
                      className={`flex w-full items-center gap-2.5 rounded-field px-2 py-2 text-left transition-colors sm:px-3 ${
                        isActive ? "bg-superficie shadow-whisper" : "hover:bg-superficie/60"
                      }`}
                    >
                      <span
                        aria-hidden
                        className={`grid size-7 shrink-0 place-items-center rounded-full text-[13px] font-semibold ${
                          isDone ? "bg-verde text-verde-tinta" : isActive ? "bg-tinta text-white" : "bg-menu text-tinta-suave"
                        }`}
                      >
                        {isDone ? <Check size={15} strokeWidth={2.4} /> : index + 1}
                      </span>
                      <span className="hidden min-w-0 sm:block">
                        <span className={`block truncate text-sm font-semibold ${isActive ? "text-tinta" : "text-tinta-suave"}`}>{item.label}</span>
                        <span className="block truncate text-xs text-tinta-suave">{isDone ? "Pronto" : item.hint}</span>
                      </span>
                      <span className="sr-only sm:hidden">
                        {item.label}
                        {isDone ? " (pronto)" : ""}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </nav>

          <section aria-labelledby="setup-step-title">
            <h2 id="setup-step-title" className="font-display text-[24px] font-bold tracking-[-0.01em] text-tinta">
              {step.label}
            </h2>

            {step.key === "buildings" && (
              <BuildingsStep
                data={data}
                onSaved={(perFloor) => {
                  setUnitsPerFloor((currentMap) => ({ ...currentMap, ...perFloor }));
                  handleSaved();
                }}
              />
            )}
            {step.key === "units" && <UnitsStep data={data} unitsPerFloor={unitsPerFloor} onSaved={handleSaved} />}
            {step.key === "residents" && <ResidentsStep data={data} onSaved={handleSaved} />}
            {step.key === "receiving" && <ReceivingStep data={data} condominiumName={activeCondominium?.condominiumName ?? "condomínio"} onSaved={handleSaved} />}

            <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-linha pt-5">
              <Button variant="quiet" disabled={stepIndex === 0} onClick={() => goTo(stepIndex - 1)}>
                Voltar
              </Button>
              {stepIndex < SETUP_STEPS.length - 1 ? (
                <Button onClick={() => goTo(stepIndex + 1)}>{progress[step.key] ? "Próxima etapa" : "Pular por agora"}</Button>
              ) : (
                <ButtonLink to="/admin/dashboard" variant={progress.doneCount === SETUP_STEPS.length ? "accent" : "primary"}>
                  {progress.doneCount === SETUP_STEPS.length ? "Concluir" : "Voltar ao Início"}
                </ButtonLink>
              )}
            </div>
          </section>
        </>
      )}
    </>
  );
}
