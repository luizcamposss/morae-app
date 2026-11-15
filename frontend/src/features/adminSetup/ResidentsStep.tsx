import { SelectField } from "../../shared/components/SelectField";
import { useMemo, useState, type InputHTMLAttributes, type ReactNode } from "react";
import { FileSpreadsheet, Plus, Trash2, Users } from "lucide-react";
import { Button, ButtonLink } from "../../shared/components/Button";
import { GroupedList, GroupedRow } from "../../shared/components/GroupedList";
import { FormFeedback } from "../settings/FormFeedback";
import { createPersonInCondominium } from "../persons/personService";
import { getPersonErrorMessage, onlyDigits, validatePersonForm } from "../persons/personForm";
import { linkPersonToUnit } from "../personUnits/personUnitService";
import { relationshipOptions } from "../units/unitForm";
import { emptyResidentDraft, errorText, isBlankResident, runInBatches, type ResidentDraft, type SetupData } from "./setupData";

type ResidentsStepProps = {
  data: SetupData;
  onSaved: () => void;
};

const INITIAL_ROWS = 3;
const inputClass = "min-h-11 w-full min-w-0 rounded-field bg-campo px-3 text-[15px] text-tinta outline-none placeholder:text-tinta-suave/70 focus:ring-2 focus:ring-verde";

// Step 3: quick table (cards on the phone) to register residents and link them to their units.
export function ResidentsStep({ data, onSaved }: ResidentsStepProps) {
  const unitOptions = useMemo(() => {
    const showBuilding = data.buildings.length > 1;
    return data.units.map((unit) => ({
      value: String(unit.id),
      label: showBuilding ? `${unit.buildingName} · ${unit.number}` : unit.number,
      isEmpty: unit.residentCount === 0,
    }));
  }, [data.buildings.length, data.units]);
  const [rows, setRows] = useState<ResidentDraft[]>(() => {
    const free = unitOptions.filter((option) => option.isEmpty);
    return Array.from({ length: INITIAL_ROWS }, (_, index) => emptyResidentDraft(free[index]?.value ?? ""));
  });
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const linked = data.people.filter((person) => person.unitCount > 0);
  const emptyUnits = data.units.filter((unit) => unit.residentCount === 0).length;
  const update = (id: string, patch: Partial<ResidentDraft>) => setRows((current) => current.map((row) => (row.id === id ? { ...row, ...patch, error: "" } : row)));

  function addRow() {
    const used = new Set(rows.map((row) => row.unitId));
    const next = unitOptions.find((option) => option.isEmpty && !used.has(option.value));
    setRows((current) => [...current, emptyResidentDraft(next?.value ?? "")]);
  }

  async function handleSave() {
    setSuccessMessage("");
    const filled = rows.filter((row) => !isBlankResident(row));
    if (!filled.length) {
      setErrorMessage("Preencha pelo menos um morador.");
      return;
    }

    const checked = filled.map((row) => {
      const problem = !row.unitId ? "Escolha a unidade." : validatePersonForm({ name: row.name, cpf: row.cpf, phoneNumber: row.phoneNumber, email: row.email.trim() });
      return { ...row, error: problem };
    });
    if (checked.some((row) => row.error)) {
      setRows((current) => current.map((row) => checked.find((item) => item.id === row.id) ?? row));
      setErrorMessage("Revise as linhas marcadas.");
      return;
    }

    setIsSaving(true);
    setErrorMessage("");
    const peopleByCpf = new Map(data.people.map((person) => [person.cpf, person.id]));
    const results = await runInBatches(checked, 3, async (row) => {
      // Someone already registered here (e.g. owner of two units) is only linked again.
      const personId =
        peopleByCpf.get(row.cpf) ??
        (
          await createPersonInCondominium(data.condominiumId, {
            name: row.name.trim(),
            cpf: row.cpf,
            phoneNumber: row.phoneNumber,
            email: row.email.trim() || null,
          })
        ).id;
      await linkPersonToUnit(Number(row.unitId), { personId, relationshipType: row.relationshipType });
    });
    setIsSaving(false);

    const failed = checked
      .map((row, index) => {
        const result = results[index];
        return result.status === "rejected" ? { ...row, error: getPersonErrorMessage(errorText(result.reason, "Não foi possível salvar.")) } : null;
      })
      .filter((row): row is ResidentDraft => row !== null);
    const savedCount = checked.length - failed.length;
    setRows(failed.length ? failed : [emptyResidentDraft()]);
    if (savedCount) setSuccessMessage(savedCount === 1 ? "1 morador cadastrado e vinculado." : `${savedCount} moradores cadastrados e vinculados.`);
    if (failed.length) setErrorMessage(failed.length === 1 ? "1 linha não foi salva. Veja o motivo nela." : `${failed.length} linhas não foram salvas. Veja o motivo em cada uma.`);
    // Reload even on failures: a person may have been created before the link failed.
    onSaved();
  }

  if (data.units.length === 0) {
    return (
      <div className="mt-4 rounded-card bg-superficie px-5 py-8 text-center shadow-whisper">
        <p className="text-[15px] text-tinta-suave">Crie as unidades na etapa anterior para vincular os moradores.</p>
      </div>
    );
  }

  return (
    <div className="mt-2">
      <p className="mb-6 max-w-2xl text-[15px] text-tinta-suave">
        Cadastre quem mora em cada unidade. Telefone e e-mail são opcionais; com e-mail, a pessoa pode receber o convite para o app na última etapa.
      </p>

      <div className="mb-6">
        <GroupedList>
          <GroupedRow
            icon={Users}
            tone={linked.length ? "green" : "neutral"}
            title={linked.length === 1 ? "1 morador vinculado" : `${linked.length} moradores vinculados`}
            subtitle={emptyUnits ? `${emptyUnits} ${emptyUnits === 1 ? "unidade ainda vaga" : "unidades ainda vagas"}` : "Todas as unidades têm morador"}
            trailing={
              linked.length > 0 && (
                <ButtonLink to="/admin/people" variant="quiet" size="sm">
                  Ver
                </ButtonLink>
              )
            }
          />
          <GroupedRow icon={FileSpreadsheet} title="Tem uma planilha?" subtitle="Importe moradores e vínculos de uma vez" trailing={<ButtonLink to="/admin/import" variant="quiet" size="sm">Importar</ButtonLink>} />
        </GroupedList>
      </div>

      <FormFeedback errorMessage={errorMessage} successMessage={successMessage} className="mb-4" />

      <div className="mb-4 overflow-hidden lg:rounded-card lg:bg-superficie lg:shadow-whisper">
        <div
          aria-hidden
          className="hidden grid-cols-[minmax(0,1.1fr)_minmax(0,1.7fr)_minmax(0,1.1fr)_minmax(0,1.1fr)_minmax(0,1.5fr)_minmax(0,1fr)_2.25rem] gap-2 border-b border-linha px-4 py-3 text-xs font-semibold uppercase tracking-[0.04em] text-tinta-suave lg:grid"
        >
          <span>Unidade</span>
          <span>Nome</span>
          <span>CPF</span>
          <span>Telefone</span>
          <span>E-mail</span>
          <span>Vínculo</span>
          <span />
        </div>
        <ul className="flex flex-col gap-3 lg:gap-0 lg:divide-y lg:divide-linha">
          {rows.map((row, index) => (
            <li key={row.id} className="rounded-card bg-superficie p-4 shadow-whisper lg:rounded-none lg:px-4 lg:py-2.5 lg:shadow-none">
              <div className="mb-3 flex items-center justify-between lg:hidden">
                <span className="text-sm font-semibold text-tinta">Morador {index + 1}</span>
                <RemoveButton onClick={() => setRows((current) => current.filter((item) => item.id !== row.id))} />
              </div>
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1.7fr)_minmax(0,1.1fr)_minmax(0,1.1fr)_minmax(0,1.5fr)_minmax(0,1fr)_2.25rem] lg:items-center lg:gap-2">
                <CellLabel label="Unidade">
                  <SelectField
                    label="Unidade"
                    hideLabel
                    variant="compact"
                    value={row.unitId}
                    placeholder="Escolha"
                    onChange={(event) => update(row.id, { unitId: event.target.value })}
                    options={unitOptions.map((option) => ({ value: String(option.value), label: option.label }))}
                  />
                </CellLabel>
                <CellLabel label="Vínculo" className="lg:order-6">
                  <SelectField
                    label="Vínculo"
                    hideLabel
                    variant="compact"
                    value={row.relationshipType}
                    onChange={(event) => update(row.id, { relationshipType: Number(event.target.value) })}
                    options={relationshipOptions.map((option) => ({ value: String(option.value), label: option.label }))}
                  />
                </CellLabel>
                <Cell label="Nome" className="col-span-2 lg:col-span-1" maxLength={150} value={row.name} onChange={(event) => update(row.id, { name: event.target.value })} />
                <Cell label="CPF" inputMode="numeric" placeholder="Só números" value={row.cpf} onChange={(event) => update(row.id, { cpf: onlyDigits(event.target.value, 11) })} />
                <Cell label="Telefone" inputMode="tel" placeholder="DDD + número" value={row.phoneNumber} onChange={(event) => update(row.id, { phoneNumber: onlyDigits(event.target.value, 11) })} />
                <Cell label="E-mail" type="email" className="col-span-2 lg:col-span-1" placeholder="Opcional" value={row.email} onChange={(event) => update(row.id, { email: event.target.value })} />
                <div className="hidden lg:order-7 lg:block">
                  <RemoveButton onClick={() => setRows((current) => current.filter((item) => item.id !== row.id))} />
                </div>
              </div>
              {row.error && (
                <p role="alert" className="mt-2 text-[13px] font-medium text-vermelho">
                  {row.error}
                </p>
              )}
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button variant="quiet" onClick={addRow}>
          <Plus size={18} strokeWidth={2} aria-hidden />
          Adicionar linha
        </Button>
        <Button variant="accent" isLoading={isSaving} loadingText="Salvando…" onClick={handleSave}>
          Salvar moradores
        </Button>
      </div>
    </div>
  );
}

// Label above the field on the phone; on the desktop the table header names the column.
function CellLabel({ label, className = "", children }: { label: string; className?: string; children: ReactNode }) {
  return (
    <label className={`flex min-w-0 flex-col gap-1.5 ${className}`}>
      <span className="text-[13px] font-medium text-tinta-suave lg:sr-only">{label}</span>
      {children}
    </label>
  );
}

function Cell({ label, className = "", ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <CellLabel label={label} className={className}>
      <input className={inputClass} {...props} />
    </CellLabel>
  );
}

function RemoveButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="grid size-9 place-items-center rounded-full text-tinta-suave transition-colors hover:bg-vermelho-suave hover:text-vermelho"
      aria-label="Remover linha"
    >
      <Trash2 size={16} strokeWidth={1.8} aria-hidden />
    </button>
  );
}
