import { useState } from "react";
import { Building2, Plus, Trash2 } from "lucide-react";
import { Button } from "../../shared/components/Button";
import { GroupedList, GroupedRow } from "../../shared/components/GroupedList";
import { TextField } from "../../shared/components/TextField";
import { FormFeedback } from "../settings/FormFeedback";
import { createBuilding } from "../buildings/buildingService";
import { emptyBuildingDraft, errorText, validateBuildingDraft, type BuildingDraft, type SetupData } from "./setupData";

type BuildingsStepProps = {
  data: SetupData;
  // Units per floor of each created building (by id), for the unit generator.
  onSaved: (unitsPerFloor: Record<number, number>) => void;
};

// Step 1: type every tower in a list and save them all at once.
export function BuildingsStep({ data, onSaved }: BuildingsStepProps) {
  const [drafts, setDrafts] = useState<BuildingDraft[]>(() => (data.buildings.length ? [] : [emptyBuildingDraft(0)]));
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const update = (id: string, patch: Partial<BuildingDraft>) => setDrafts((rows) => rows.map((row) => (row.id === id ? { ...row, ...patch } : row)));

  async function handleSave() {
    const existingCodes = data.buildings.map((building) => building.code.toUpperCase());
    const draftCodes = drafts.map((draft) => draft.code.trim().toUpperCase());
    const duplicated = draftCodes.find((code, index) => code && draftCodes.indexOf(code) !== index);
    const problem = duplicated ? `O código ${duplicated} aparece em mais de um prédio.` : drafts.map((draft) => validateBuildingDraft(draft, existingCodes)).find(Boolean);
    setSuccessMessage("");
    if (problem) {
      setErrorMessage(problem);
      return;
    }

    setIsSaving(true);
    setErrorMessage("");
    const perFloor: Record<number, number> = {};
    const failed: BuildingDraft[] = [];
    let lastError = "";
    // One at a time: there are only a few towers and the order matters for the list.
    for (const draft of drafts) {
      try {
        const building = await createBuilding(data.condominiumId, {
          name: draft.name.trim(),
          code: draft.code.trim(),
          buildingType: "Residencial",
          floorCount: Number(draft.floorCount),
          hasElevator: draft.hasElevator,
          notes: "",
        });
        perFloor[building.id] = Number(draft.unitsPerFloor);
      } catch (error) {
        failed.push(draft);
        lastError = errorText(error, "Não foi possível salvar o prédio.");
      }
    }
    setIsSaving(false);
    setDrafts(failed);
    const savedCount = drafts.length - failed.length;
    if (savedCount) setSuccessMessage(savedCount === 1 ? "1 prédio salvo." : `${savedCount} prédios salvos.`);
    if (failed.length) setErrorMessage(`${failed.length === 1 ? "1 prédio não foi salvo" : `${failed.length} prédios não foram salvos`}: ${lastError}`);
    if (savedCount) onSaved(perFloor);
  }

  return (
    <div className="mt-2">
      <p className="mb-6 max-w-2xl text-[15px] text-tinta-suave">
        Cadastre as torres ou blocos do condomínio. Andares e unidades por andar servem para gerar as unidades na próxima etapa.
      </p>

      {data.buildings.length > 0 && (
        <div className="mb-6">
          <GroupedList title="Já cadastrados">
            {data.buildings.map((building) => (
              <GroupedRow
                key={building.id}
                icon={Building2}
                tone="green"
                title={`${building.name} · ${building.code}`}
                subtitle={`${building.floorCount} ${building.floorCount === 1 ? "andar" : "andares"} · ${building.unitCount} ${building.unitCount === 1 ? "unidade" : "unidades"}`}
              />
            ))}
          </GroupedList>
        </div>
      )}

      <FormFeedback errorMessage={errorMessage} successMessage={successMessage} className="mb-4" />

      {drafts.length > 0 && (
        <ul className="mb-4 flex flex-col gap-3">
          {drafts.map((draft, index) => (
            <li key={draft.id} className="rounded-card bg-superficie p-4 shadow-whisper sm:p-5">
              <div className="mb-3 flex items-center justify-between gap-3">
                <span className="text-sm font-semibold text-tinta">Novo prédio {data.buildings.length + index + 1}</span>
                <button
                  type="button"
                  onClick={() => setDrafts((rows) => rows.filter((row) => row.id !== draft.id))}
                  className="grid size-9 place-items-center rounded-full text-tinta-suave transition-colors hover:bg-vermelho-suave hover:text-vermelho"
                  aria-label={`Remover ${draft.name || "prédio"}`}
                >
                  <Trash2 size={17} strokeWidth={1.8} aria-hidden />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto] lg:items-end">
                <TextField label="Nome" className="col-span-2 lg:col-span-1" maxLength={100} value={draft.name} onChange={(event) => update(draft.id, { name: event.target.value })} />
                <TextField label="Código" maxLength={30} value={draft.code} onChange={(event) => update(draft.id, { code: event.target.value })} />
                <TextField
                  label="Andares"
                  inputMode="numeric"
                  value={draft.floorCount}
                  onChange={(event) => update(draft.id, { floorCount: event.target.value.replace(/\D/g, "").slice(0, 3) })}
                />
                <TextField
                  label="Unid. por andar"
                  inputMode="numeric"
                  value={draft.unitsPerFloor}
                  onChange={(event) => update(draft.id, { unitsPerFloor: event.target.value.replace(/\D/g, "").slice(0, 2) })}
                />
                <label className="flex min-h-12 items-center gap-2.5 text-[15px] text-tinta">
                  <input
                    type="checkbox"
                    className="size-[18px] accent-verde"
                    checked={draft.hasElevator}
                    onChange={(event) => update(draft.id, { hasElevator: event.target.checked })}
                  />
                  Elevador
                </label>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap gap-3">
        <Button variant="quiet" onClick={() => setDrafts((rows) => [...rows, emptyBuildingDraft(data.buildings.length + rows.length)])}>
          <Plus size={18} strokeWidth={2} aria-hidden />
          Adicionar prédio
        </Button>
        {drafts.length > 0 && (
          <Button variant="accent" isLoading={isSaving} loadingText="Salvando…" onClick={handleSave}>
            {drafts.length === 1 ? "Salvar prédio" : `Salvar ${drafts.length} prédios`}
          </Button>
        )}
      </div>
    </div>
  );
}
