import { useEffect, useState, type FormEvent } from "react";
import { DoorClosed, UserRound, X } from "lucide-react";
import { Button } from "../../shared/components/Button";
import { Modal } from "../../shared/components/Modal";
import { SelectField } from "../../shared/components/SelectField";
import { TextAreaField } from "../../shared/components/TextAreaField";
import { TextField } from "../../shared/components/TextField";
import { getPeopleByUnit, linkPersonToUnit, removePersonUnit } from "../personUnits/personUnitService";
import type { PersonUnitResponse } from "../personUnits/types";
import { createPersonInCondominium, getPersonsByCondominium } from "../persons/personService";
import type { CreatePersonRequest, PersonResponse } from "../persons/types";
import { UNIT_FIELD_LIMITS, relationshipLabel, relationshipOptions, sanitizeUnitForm, unitTypeLabel, unitTypeOptions, validateUnitForm } from "./unitForm";
import type { CreateUnitRequest, UnitResponse } from "./types";

type UnitFormModalProps = {
  title: string;
  description?: string;
  submitLabel: string;
  initialForm: CreateUnitRequest;
  onClose: () => void;
  onSubmit: (form: CreateUnitRequest) => Promise<void>;
};

export function UnitFormModal({ title, description, submitLabel, initialForm, onClose, onSubmit }: UnitFormModalProps) {
  const [form, setForm] = useState<CreateUnitRequest>(initialForm);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function updateField<K extends keyof CreateUnitRequest>(field: K, value: CreateUnitRequest[K]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const payload = sanitizeUnitForm(form);
    const problem = validateUnitForm(payload);
    setErrorMessage(problem);
    if (problem) return;

    try {
      setIsSubmitting(true);
      await onSubmit(payload);
      onClose();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Não foi possível salvar a unidade.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal
      title={title}
      description={description}
      size="lg"
      onClose={onClose}
      footer={
        <>
          <Button variant="quiet" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="unit-form" isLoading={isSubmitting} loadingText="Salvando…">
            {submitLabel}
          </Button>
        </>
      }
    >
      <form id="unit-form" onSubmit={handleSubmit} className="flex flex-col gap-5">
        {errorMessage && (
          <p role="alert" className="rounded-field bg-vermelho-suave px-4 py-3 text-sm font-medium text-vermelho">
            {errorMessage}
          </p>
        )}

        <div className="grid gap-5 sm:grid-cols-2">
          <TextField
            label="Número"
            value={form.number}
            maxLength={UNIT_FIELD_LIMITS.number}
            onChange={(event) => updateField("number", event.target.value)}
            placeholder="101"
          />
          <SelectField
            label="Tipo"
            value={String(form.unitType)}
            onChange={(event) => updateField("unitType", Number(event.target.value))}
            options={unitTypeOptions.map((option) => ({ value: String(option.value), label: option.label }))}
          />
        </div>

        <div className="grid grid-cols-3 gap-3 sm:gap-5">
          <TextField
            label="Quartos"
            type="number"
            inputMode="numeric"
            min={0}
            max={UNIT_FIELD_LIMITS.rooms}
            value={form.rooms}
            onChange={(event) => updateField("rooms", Number(event.target.value))}
          />
          <TextField
            label="Banheiros"
            type="number"
            inputMode="numeric"
            min={0}
            max={UNIT_FIELD_LIMITS.bathrooms}
            value={form.bathrooms}
            onChange={(event) => updateField("bathrooms", Number(event.target.value))}
          />
          <TextField
            label="Área (m²)"
            type="number"
            inputMode="decimal"
            min={0}
            max={UNIT_FIELD_LIMITS.squareMeters}
            value={form.squareMeters}
            onChange={(event) => updateField("squareMeters", Number(event.target.value))}
          />
        </div>

        <TextAreaField
          label="Observações"
          value={form.observations}
          maxLength={UNIT_FIELD_LIMITS.observations}
          rows={3}
          onChange={(event) => updateField("observations", event.target.value)}
          placeholder="Ex.: vaga de garagem 12, unidade adaptada…"
        />
      </form>
    </Modal>
  );
}

type UnitDetailsModalProps = {
  unit: UnitResponse;
  condominiumId: number;
  onClose: () => void;
  onEdit: () => void;
  // Shown when the condominium uses the rentals module.
  onRent?: () => void;
  onDelete: () => void;
  onChanged: (message: string) => Promise<void>;
};

const emptyPerson: CreatePersonRequest = { name: "", cpf: "", phoneNumber: "" };

// Unit data plus who lives there: list, unlink and link (existing person or a new one).
export function UnitDetailsModal({ unit, condominiumId, onClose, onEdit, onRent, onDelete, onChanged }: UnitDetailsModalProps) {
  const [linkedPeople, setLinkedPeople] = useState<PersonUnitResponse[]>([]);
  const [availablePersons, setAvailablePersons] = useState<PersonResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [isLinking, setIsLinking] = useState(false);
  const [mode, setMode] = useState<"existing" | "new">("existing");
  const [selectedPersonId, setSelectedPersonId] = useState("");
  const [relationshipType, setRelationshipType] = useState(2);
  const [newPerson, setNewPerson] = useState<CreatePersonRequest>(emptyPerson);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [removingId, setRemovingId] = useState<number | null>(null);

  useEffect(() => {
    let isMounted = true;

    Promise.all([getPeopleByUnit(unit.id), getPersonsByCondominium(condominiumId)])
      .then(([people, persons]) => {
        if (!isMounted) return;
        setLinkedPeople(people);
        setAvailablePersons(persons);
      })
      .catch((error) => {
        if (isMounted) setErrorMessage(error instanceof Error ? error.message : "Não foi possível carregar os vínculos da unidade.");
      })
      .finally(() => isMounted && setIsLoading(false));

    return () => {
      isMounted = false;
    };
  }, [unit.id, condominiumId]);

  async function reloadPeople() {
    setLinkedPeople(await getPeopleByUnit(unit.id));
  }

  async function handleLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");

    if (mode === "existing" && !selectedPersonId) {
      setErrorMessage("Selecione uma pessoa para vincular.");
      return;
    }
    if (mode === "new" && (newPerson.name.trim().length < 2 || newPerson.cpf.length !== 11)) {
      setErrorMessage("Informe o nome e um CPF válido com 11 números.");
      return;
    }

    setIsSubmitting(true);
    try {
      let personId = Number(selectedPersonId);
      if (mode === "new") {
        const created = await createPersonInCondominium(condominiumId, { ...newPerson, name: newPerson.name.trim() });
        personId = created.id;
        setAvailablePersons(await getPersonsByCondominium(condominiumId));
      }

      await linkPersonToUnit(unit.id, { personId, relationshipType });
      await reloadPeople();
      await onChanged("Pessoa vinculada à unidade.");
      setIsLinking(false);
      setMode("existing");
      setSelectedPersonId("");
      setNewPerson(emptyPerson);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Não foi possível vincular a pessoa.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRemove(personUnitId: number) {
    setErrorMessage("");
    setRemovingId(personUnitId);
    try {
      await removePersonUnit(personUnitId);
      await reloadPeople();
      await onChanged("Pessoa desvinculada da unidade.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Não foi possível desvincular a pessoa.");
    } finally {
      setRemovingId(null);
    }
  }

  const isOccupied = isLoading ? unit.status === "Ocupada" : linkedPeople.length > 0;
  const linkedIds = new Set(linkedPeople.map((person) => person.personId));
  const candidates = availablePersons.filter((person) => !linkedIds.has(person.id));

  return (
    <Modal
      title={`Unidade ${unit.number}`}
      description={`${unit.buildingName} · ${unitTypeLabel(unit.unitType)}`}
      leading={
        <span className={`grid size-11 place-items-center rounded-block ${isOccupied ? "bg-verde-suave text-verde-tinta" : "bg-campo text-tinta-suave"}`}>
          <DoorClosed size={20} strokeWidth={1.8} aria-hidden />
        </span>
      }
      size="lg"
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onDelete} className="mr-auto rounded-full px-3 text-sm font-semibold text-vermelho hover:underline">
            Excluir unidade
          </button>
          <Button variant="quiet" onClick={onEdit}>
            Editar dados
          </Button>
          {onRent && <Button onClick={onRent}>Alugar esta unidade</Button>}
        </>
      }
    >
      <div className="flex flex-col gap-6">
        {errorMessage && (
          <p role="alert" className="rounded-field bg-vermelho-suave px-4 py-3 text-sm font-medium text-vermelho">
            {errorMessage}
          </p>
        )}

        <dl className="grid grid-cols-3 gap-3 rounded-block bg-campo px-4 py-4 text-sm">
          <Info label="Quartos" value={String(unit.rooms)} />
          <Info label="Banheiros" value={String(unit.bathrooms)} />
          <Info label="Área" value={unit.squareMeters ? `${unit.squareMeters} m²` : "–"} />
        </dl>

        {unit.observations && <p className="whitespace-pre-line text-sm leading-relaxed text-tinta">{unit.observations}</p>}

        <section>
          <div className="mb-2 flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-tinta">Quem mora aqui</h3>
            {!isLinking && (
              <Button size="sm" variant="quiet" onClick={() => setIsLinking(true)} disabled={isLoading}>
                Vincular pessoa
              </Button>
            )}
          </div>

          <ul className="divide-y divide-linha overflow-hidden rounded-block ring-1 ring-linha">
            {isLoading ? (
              <li className="px-4 py-5 text-center text-sm text-tinta-suave">Carregando…</li>
            ) : linkedPeople.length === 0 ? (
              <li className="px-4 py-5 text-center text-sm text-tinta-suave">Unidade vaga: ninguém vinculado ainda.</li>
            ) : (
              linkedPeople.map((person) => (
                <li key={person.id} className="flex items-center gap-3 px-4 py-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-verde-suave text-verde-tinta">
                    <UserRound size={16} strokeWidth={1.8} aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-semibold text-tinta">{person.personName}</span>
                    <span className="block text-[13px] text-tinta-suave">{relationshipLabel(person.relationshipType)}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => void handleRemove(person.id)}
                    disabled={removingId === person.id}
                    aria-label={`Desvincular ${person.personName}`}
                    className="grid size-8 shrink-0 place-items-center rounded-full text-tinta-suave transition-colors hover:bg-vermelho-suave hover:text-vermelho disabled:opacity-60"
                  >
                    <X size={16} strokeWidth={1.8} aria-hidden />
                  </button>
                </li>
              ))
            )}
          </ul>

          {isLinking && (
            <form onSubmit={handleLink} className="mt-4 flex flex-col gap-4 rounded-block bg-campo/60 p-4">
              <div role="tablist" aria-label="Como vincular" className="flex gap-1 self-start rounded-field bg-campo p-1">
                {(
                  [
                    ["existing", "Pessoa cadastrada"],
                    ["new", "Nova pessoa"],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    role="tab"
                    aria-selected={mode === value}
                    onClick={() => setMode(value)}
                    className={`rounded-field px-3 py-1.5 text-sm font-semibold transition-colors ${
                      mode === value ? "bg-superficie text-tinta shadow-whisper" : "text-tinta-suave hover:text-tinta"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {mode === "existing" ? (
                <SelectField
                  label="Pessoa"
                  value={selectedPersonId}
                  onChange={(event) => setSelectedPersonId(event.target.value)}
                  placeholder={candidates.length ? "Selecione" : "Nenhuma pessoa disponível"}
                  options={candidates.map((person) => ({ value: String(person.id), label: person.name }))}
                />
              ) : (
                <div className="grid gap-4 sm:grid-cols-3">
                  <TextField
                    label="Nome"
                    className="sm:col-span-3"
                    value={newPerson.name}
                    onChange={(event) => setNewPerson((current) => ({ ...current, name: event.target.value }))}
                    placeholder="Nome completo"
                  />
                  <TextField
                    label="CPF"
                    inputMode="numeric"
                    className="sm:col-span-2"
                    value={newPerson.cpf}
                    onChange={(event) => setNewPerson((current) => ({ ...current, cpf: event.target.value.replace(/\D/g, "").slice(0, 11) }))}
                    placeholder="Só números"
                  />
                  <TextField
                    label="Telefone"
                    inputMode="tel"
                    value={newPerson.phoneNumber}
                    onChange={(event) =>
                      setNewPerson((current) => ({ ...current, phoneNumber: event.target.value.replace(/\D/g, "").slice(0, 20) }))
                    }
                    placeholder="11999999999"
                  />
                </div>
              )}

              <SelectField
                label="Vínculo"
                value={String(relationshipType)}
                onChange={(event) => setRelationshipType(Number(event.target.value))}
                options={relationshipOptions.map((option) => ({ value: String(option.value), label: option.label }))}
              />

              <div className="flex justify-end gap-2">
                <Button size="sm" variant="quiet" onClick={() => setIsLinking(false)} disabled={isSubmitting}>
                  Cancelar
                </Button>
                <Button size="sm" type="submit" isLoading={isSubmitting} loadingText="Vinculando…">
                  Vincular
                </Button>
              </div>
            </form>
          )}
        </section>
      </div>
    </Modal>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-tinta-suave">{label}</dt>
      <dd className="mt-0.5 font-semibold tabular-nums text-tinta">{value}</dd>
    </div>
  );
}
