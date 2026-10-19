import { useState } from "react";
import { Trash2, Wand2 } from "lucide-react";
import { Button, ButtonLink } from "../../shared/components/Button";
import { SelectField } from "../../shared/components/SelectField";
import { TextField } from "../../shared/components/TextField";
import { FormFeedback } from "../settings/FormFeedback";
import { createUnit } from "../units/unitService";
import { UNIT_FIELD_LIMITS, unitTypeOptions, validateUnitForm } from "../units/unitForm";
import {
  defaultGeneration,
  errorText,
  generateUnits,
  numberingOptions,
  runInBatches,
  type GenerationSettings,
  type NumberingPattern,
  type SetupData,
  type UnitDraft,
} from "./setupData";

type UnitsStepProps = {
  data: SetupData;
  unitsPerFloor: Record<number, number>;
  onSaved: () => void;
};

const typeOptions = unitTypeOptions.map((option) => ({ value: String(option.value), label: option.label }));
const BATCH_SIZE = 5;

// Step 2: preview of the units (floor × position), editable line by line, then created in one go.
export function UnitsStep({ data, unitsPerFloor, onSaved }: UnitsStepProps) {
  const [settings, setSettings] = useState<GenerationSettings>(defaultGeneration);
  // Units per floor of each building: typed in step 1, guessed from saved units, or 4.
  const perFloorOf = (buildingId: number) => {
    const building = data.buildings.find((item) => item.id === buildingId);
    const saved = data.units.filter((unit) => unit.buildingId === buildingId).length;
    return String(unitsPerFloor[buildingId] ?? (saved && building?.floorCount ? Math.ceil(saved / building.floorCount) : 4));
  };
  const [perFloor, setPerFloor] = useState<Record<number, string>>(() => Object.fromEntries(data.buildings.map((building) => [building.id, perFloorOf(building.id)])));
  // With no units saved yet, the preview opens already generated with the defaults.
  const [drafts, setDrafts] = useState<UnitDraft[]>(() =>
    data.units.length
      ? []
      : data.buildings.flatMap((building) => generateUnits(building, Number(perFloorOf(building.id)), defaultGeneration, data.units)),
  );
  const [isSaving, setIsSaving] = useState(false);
  const [progress, setProgress] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const newDrafts = drafts.filter((draft) => !draft.exists);
  const set = (patch: Partial<GenerationSettings>) => setSettings((current) => ({ ...current, ...patch }));
  const update = (id: string, patch: Partial<UnitDraft>) => setDrafts((rows) => rows.map((row) => (row.id === id ? { ...row, ...patch } : row)));

  function handleGenerate() {
    setSuccessMessage("");
    const invalid = data.buildings.find((building) => {
      const value = Number(perFloor[building.id]);
      return !Number.isInteger(value) || value < 1 || value > 50;
    });
    if (invalid) {
      setErrorMessage(`${invalid.name}: informe de 1 a 50 unidades por andar.`);
      return;
    }
    const noFloors = data.buildings.filter((building) => building.floorCount < 1);
    setErrorMessage(noFloors.length ? `Sem andares cadastrados: ${noFloors.map((building) => building.name).join(", ")}. Ajuste em Prédios.` : "");
    setDrafts(data.buildings.flatMap((building) => generateUnits(building, Number(perFloor[building.id]), settings, data.units)));
  }

  async function handleCreate() {
    const numbers = new Set<string>();
    for (const draft of newDrafts) {
      const problem = validateUnitForm({ ...draft, number: draft.number.trim() });
      const key = `${draft.buildingId}:${draft.number.trim().toUpperCase()}`;
      if (problem || numbers.has(key)) {
        setErrorMessage(problem ? `Unidade ${draft.number || "sem número"}: ${problem}` : `A unidade ${draft.number} aparece duas vezes no mesmo prédio.`);
        return;
      }
      numbers.add(key);
    }

    setIsSaving(true);
    setErrorMessage("");
    setSuccessMessage("");
    let done = 0;
    const results = await runInBatches(newDrafts, BATCH_SIZE, async (draft) => {
      const { buildingId, number, unitType, rooms, bathrooms, squareMeters, observations } = draft;
      const unit = await createUnit(buildingId, { number: number.trim(), unitType, rooms, bathrooms, squareMeters, observations });
      done += 1;
      setProgress(`${done} de ${newDrafts.length}`);
      return unit;
    });
    setIsSaving(false);
    setProgress("");

    const failedIds = new Set(newDrafts.filter((_, index) => results[index].status === "rejected").map((draft) => draft.id));
    const createdCount = newDrafts.length - failedIds.size;
    const firstFailure = results.find((result) => result.status === "rejected");
    setDrafts((rows) => rows.filter((row) => failedIds.has(row.id)));
    if (createdCount) setSuccessMessage(createdCount === 1 ? "1 unidade criada." : `${createdCount} unidades criadas.`);
    if (firstFailure?.status === "rejected") {
      setErrorMessage(`${failedIds.size === 1 ? "1 unidade não foi criada" : `${failedIds.size} unidades não foram criadas`}: ${errorText(firstFailure.reason, "erro ao salvar")}`);
    }
    if (createdCount) onSaved();
  }

  if (data.buildings.length === 0) {
    return (
      <div className="mt-4 rounded-card bg-superficie px-5 py-8 text-center shadow-whisper">
        <p className="text-[15px] text-tinta-suave">Cadastre pelo menos um prédio na etapa anterior para gerar as unidades.</p>
      </div>
    );
  }

  return (
    <div className="mt-2">
      <p className="mb-6 max-w-2xl text-[15px] text-tinta-suave">
        Escolha o padrão e gere a prévia. Dá para mudar número, tipo e metragem de cada unidade, ou tirar as que não existem, antes de criar. Unidades já cadastradas são
        puladas.
      </p>

      <div className="mb-5 rounded-card bg-superficie p-4 shadow-whisper sm:p-5">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <SelectField label="Numeração" options={numberingOptions} value={settings.pattern} onChange={(event) => set({ pattern: event.target.value as NumberingPattern })} />
          <SelectField label="Tipo padrão" options={typeOptions} value={String(settings.unitType)} onChange={(event) => set({ unitType: Number(event.target.value) })} />
          <TextField
            label="Metragem padrão (m²)"
            inputMode="decimal"
            placeholder="Ex.: 65"
            value={settings.squareMeters}
            onChange={(event) => set({ squareMeters: event.target.value.replace(/[^\d.]/g, "").slice(0, 7) })}
          />
          <div className="grid grid-cols-2 gap-3">
            <TextField label="Quartos" inputMode="numeric" value={settings.rooms} onChange={(event) => set({ rooms: event.target.value.replace(/\D/g, "").slice(0, 2) })} />
            <TextField label="Banheiros" inputMode="numeric" value={settings.bathrooms} onChange={(event) => set({ bathrooms: event.target.value.replace(/\D/g, "").slice(0, 2) })} />
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {data.buildings.map((building) => (
            <TextField
              key={building.id}
              label={`${building.name}: unid. por andar`}
              hint={`${building.floorCount} ${building.floorCount === 1 ? "andar" : "andares"}`}
              inputMode="numeric"
              value={perFloor[building.id] ?? ""}
              onChange={(event) => setPerFloor((current) => ({ ...current, [building.id]: event.target.value.replace(/\D/g, "").slice(0, 2) }))}
            />
          ))}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-3">
          <label className="flex items-center gap-2.5 text-[15px] text-tinta">
            <input type="checkbox" className="size-[18px] accent-verde" checked={settings.withCode} onChange={(event) => set({ withCode: event.target.checked })} />
            Começar com o código do prédio (ex.: A101)
          </label>
          <Button variant="quiet" size="sm" onClick={handleGenerate}>
            <Wand2 size={16} strokeWidth={2} aria-hidden />
            {drafts.length ? "Gerar de novo" : "Gerar prévia"}
          </Button>
        </div>
      </div>

      <FormFeedback errorMessage={errorMessage} successMessage={successMessage} className="mb-4" />

      {drafts.length > 0 && (
        <div className="mb-5 flex flex-col gap-3">
          {data.buildings.map((building) => {
            const rows = drafts.filter((draft) => draft.buildingId === building.id);
            if (!rows.length) return null;
            const skipped = rows.filter((row) => row.exists).length;
            return (
              <details key={building.id} open className="max-w-3xl overflow-hidden rounded-card bg-superficie shadow-whisper">
                <summary className="flex cursor-pointer list-none items-baseline justify-between gap-3 px-5 py-4">
                  <span className="text-[15px] font-semibold text-tinta">{building.name}</span>
                  <span className="text-[13px] tabular-nums text-tinta-suave">
                    {rows.length - skipped} novas{skipped ? ` · ${skipped} já existem` : ""}
                  </span>
                </summary>
                <ul className="divide-y divide-linha border-t border-linha">
                  {rows.map((row) => (
                    <li key={row.id} className={`grid grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_minmax(0,0.9fr)_auto] items-center gap-2 px-3 py-2 sm:px-5 ${row.exists ? "opacity-60" : ""}`}>
                      <input
                        aria-label="Número"
                        className="min-h-10 w-full rounded-field bg-campo px-3 text-[15px] font-semibold tabular-nums text-tinta outline-none focus:ring-2 focus:ring-verde"
                        maxLength={UNIT_FIELD_LIMITS.number}
                        disabled={row.exists}
                        value={row.number}
                        onChange={(event) => update(row.id, { number: event.target.value })}
                      />
                      {row.exists ? (
                        <span className="col-span-2 text-[13px] text-tinta-suave">Já cadastrada, será pulada</span>
                      ) : (
                        <>
                          <select
                            aria-label="Tipo"
                            className="min-h-10 w-full min-w-0 rounded-field bg-campo px-2 text-sm text-tinta outline-none focus:ring-2 focus:ring-verde"
                            value={row.unitType}
                            onChange={(event) => update(row.id, { unitType: Number(event.target.value) })}
                          >
                            {unitTypeOptions.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                          <input
                            aria-label="Metragem em m²"
                            inputMode="decimal"
                            placeholder="m²"
                            className="min-h-10 w-full rounded-field bg-campo px-3 text-sm tabular-nums text-tinta outline-none focus:ring-2 focus:ring-verde"
                            value={row.squareMeters || ""}
                            onChange={(event) => update(row.id, { squareMeters: Number(event.target.value.replace(/[^\d.]/g, "")) || 0 })}
                          />
                        </>
                      )}
                      <button
                        type="button"
                        onClick={() => setDrafts((current) => current.filter((item) => item.id !== row.id))}
                        className="grid size-9 place-items-center rounded-full text-tinta-suave transition-colors hover:bg-vermelho-suave hover:text-vermelho"
                        aria-label={`Remover unidade ${row.number}`}
                      >
                        <Trash2 size={16} strokeWidth={1.8} aria-hidden />
                      </button>
                    </li>
                  ))}
                </ul>
              </details>
            );
          })}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        {newDrafts.length > 0 && (
          <Button variant="accent" isLoading={isSaving} loadingText={progress ? `Criando ${progress}…` : "Criando…"} onClick={handleCreate}>
            {newDrafts.length === 1 ? "Criar 1 unidade" : `Criar ${newDrafts.length} unidades`}
          </Button>
        )}
        {data.units.length > 0 && (
          <ButtonLink to="/admin/units" variant="quiet">
            Ver as {data.units.length} unidades
          </ButtonLink>
        )}
      </div>
    </div>
  );
}
