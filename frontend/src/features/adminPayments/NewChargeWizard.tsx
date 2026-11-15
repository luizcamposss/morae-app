import { useState, type ReactNode } from "react";
import { Building, CalendarClock, Check, ClipboardList, Home, ListChecks, ReceiptText, Repeat, Rows3, User } from "lucide-react";
import { Button } from "../../shared/components/Button";
import { Modal } from "../../shared/components/Modal";
import { SelectField } from "../../shared/components/SelectField";
import { Switch } from "../../shared/components/Switch";
import { TextField } from "../../shared/components/TextField";
import { formatCalendarDate, todayInputDate } from "../../shared/lib/date";
import type { BuildingResponse } from "../buildings/types";
import { CHARGE_CATEGORIES, WIZARD_CATEGORIES } from "../charges/chargeCategories";
import type { ChargeCategory } from "../charges/types";
import { getPeopleByUnit } from "../personUnits/personUnitService";
import type { PersonUnitResponse } from "../personUnits/types";
import { relationshipOptions } from "../units/unitForm";
import type { UnitResponse } from "../units/types";
import { unitLabel } from "./chargeForm";
import {
  billedUnits,
  canRepeat,
  initialNewChargeForm,
  monthName,
  suggestedDescription,
  summarize,
  targetUnits,
  validateStep,
  type NewChargeForm,
  type WizardStep,
} from "./newChargeForm";

type NewChargeWizardProps = {
  units: UnitResponse[];
  buildings: BuildingResponse[];
  billingDueDay: number | null;
  // Opened from "Cobranças fixas": starts with "Todo mês" on.
  startRepeating?: boolean;
  isSubmitting: boolean;
  error: string;
  onClose: () => void;
  onSubmit: (form: NewChargeForm, recipientName?: string) => void;
};

// The bill months a charge can go into: this one and the next two.
function billMonthOptions() {
  const today = todayInputDate();
  const [year, month] = today.split("-").map(Number);
  return [0, 1, 2].map((offset) => {
    const date = new Date(Date.UTC(year, month - 1 + offset, 1));
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
  });
}

const stepTitles: Record<WizardStep, string> = {
  1: "O que você quer cobrar?",
  2: "De quem?",
  3: "Quanto e quando?",
  4: "Confira antes de criar",
};

const relationshipLabel = (type: number) => relationshipOptions.find((option) => option.value === type)?.label ?? "Vinculado";

// Big option row/card used by every step: icon square, title and a short hint (also used by "Lançar despesa").
export function Choice({ selected, icon, title, hint, onClick, compact = false }: { selected: boolean; icon: ReactNode; title: string; hint?: string; onClick: () => void; compact?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-block px-3.5 text-left transition-colors ${compact ? "py-3" : "py-3.5 sm:flex-col sm:items-start sm:py-4"} ${
        selected ? "bg-superficie ring-2 ring-verde" : "bg-campo hover:bg-menu"
      }`}
    >
      <span aria-hidden className={`grid size-9 shrink-0 place-items-center rounded-field ${selected ? "bg-verde-suave text-verde-tinta" : "bg-superficie text-tinta"}`}>
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-[15px] font-semibold text-tinta">{title}</span>
        {hint && <span className="block text-[13px] leading-snug text-tinta-suave">{hint}</span>}
      </span>
    </button>
  );
}

export function MoneyInput({ label, value, placeholder, onChange, className = "w-24" }: { label: string; value: string; placeholder?: string; onChange: (value: string) => void; className?: string }) {
  return (
    <label className="shrink-0">
      <span className="sr-only">{label}</span>
      <input
        inputMode="decimal"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className={`${className} rounded-field bg-campo px-3 py-2 text-right text-sm tabular-nums text-tinta outline-none placeholder:text-tinta-suave/70 focus:bg-superficie focus:ring-2 focus:ring-verde focus-visible:outline-none`}
      />
    </label>
  );
}

// "Lançar cobrança" in three questions; the page decides where it goes (month's bills, now, every month).
export function NewChargeWizard({ units, buildings, billingDueDay, startRepeating = false, isSubmitting, error, onClose, onSubmit }: NewChargeWizardProps) {
  const [step, setStep] = useState<WizardStep>(1);
  const [form, setForm] = useState<NewChargeForm>(() => initialNewChargeForm(billingDueDay, startRepeating));
  const [stepError, setStepError] = useState("");
  const [people, setPeople] = useState<{ unitId: string; list: PersonUnitResponse[] } | null>(null);

  // Keeps the suggested description ("Água · nov/2026") in sync until the manager types their own.
  const update = (patch: Partial<NewChargeForm>) =>
    setForm((current) => {
      const next = { ...current, ...patch };
      if (!next.descriptionEdited) next.description = suggestedDescription(next);
      return next;
    });

  const category = form.category ? CHARGE_CATEGORIES[form.category] : null;
  const scoped = targetUnits(form, units);
  const unitPeople = people && people.unitId === form.unitId ? people.list : null;
  const recipient = form.onlyOnePerson ? unitPeople?.find((person) => String(person.personId) === form.recipientPersonId) : undefined;
  const repeat = form.repeat && canRepeat(form);
  const shownError = stepError || (step === 4 ? error : "");

  function chooseCategory(value: ChargeCategory) {
    // Rent and fines go to one unit; the rest usually to many. Readings only exist for water, power and gas.
    const target = value === 2 || value === 7 ? "unit" : "many";
    update({ category: value, target });
    setStepError("");
    setStep(2);
  }

  function chooseUnit(unitId: string) {
    update({ unitId, onlyOnePerson: false, recipientPersonId: "" });
    if (!unitId) return;
    getPeopleByUnit(Number(unitId))
      .then((list) => {
        setPeople({ unitId, list });
        // Rent goes to the tenant by default.
        const tenant = list.find((person) => person.relationshipType === 3);
        if (form.category === 2 && tenant) {
          setForm((current) => (current.unitId === unitId ? { ...current, onlyOnePerson: true, recipientPersonId: String(tenant.personId) } : current));
        }
      })
      .catch(() => setPeople({ unitId, list: [] }));
  }

  function next() {
    const validation = validateStep(step, form, units);
    if (validation) {
      setStepError(validation);
      return;
    }
    setStepError("");
    if (step === 4) onSubmit({ ...form, repeat }, recipient?.personName);
    else setStep((step + 1) as WizardStep);
  }

  function back() {
    setStepError("");
    if (step === 1) onClose();
    else setStep((step - 1) as WizardStep);
  }

  const billed = step >= 3 ? billedUnits(form, units) : [];
  const unitsWithoutPeople = billed.filter((item) => item.unit.residentCount === 0).length;

  return (
    <Modal
      size="lg"
      title="Lançar cobrança"
      description={
        <span className="flex items-center gap-2">
          <span className="tabular-nums">{step < 4 ? `Passo ${step} de 3` : "Resumo"}</span>
          <span aria-hidden>·</span>
          <span className="font-semibold text-tinta">{stepTitles[step]}</span>
        </span>
      }
      onClose={onClose}
      footer={
        <>
          <Button variant="quiet" onClick={back}>
            {step === 1 ? "Cancelar" : "Voltar"}
          </Button>
          {step > 1 && (
            <Button onClick={next} isLoading={isSubmitting} loadingText="Criando…">
              {step === 3 ? "Revisar" : step === 4 ? (repeat ? "Criar cobrança fixa" : form.destination === "bill" ? "Lançar" : "Criar cobrança") : "Continuar"}
            </Button>
          )}
        </>
      }
    >
      <div aria-hidden className="mb-5 flex gap-1.5">
        {[1, 2, 3].map((item) => (
          <span key={item} className={`h-1 flex-1 rounded-full ${item <= step ? "bg-tinta" : "bg-linha"}`} />
        ))}
      </div>

      {shownError && (
        <p role="alert" className="mb-4 rounded-field bg-vermelho-suave px-4 py-3 text-sm font-medium text-vermelho">
          {shownError}
        </p>
      )}

      {step === 1 && (
        <div className="grid grid-cols-1 gap-2 min-[400px]:grid-cols-2 sm:grid-cols-4">
          {WIZARD_CATEGORIES.map((value) => {
            const item = CHARGE_CATEGORIES[value];
            const Icon = item.icon;
            return <Choice key={value} selected={form.category === value} icon={<Icon size={18} strokeWidth={1.8} />} title={item.cardLabel} hint={item.hint} onClick={() => chooseCategory(value)} />;
          })}
        </div>
      )}

      {step === 2 && (
        <div className="grid gap-4">
          <div className="grid gap-2 sm:grid-cols-2">
            <Choice compact selected={form.target === "unit"} icon={<Home size={18} strokeWidth={1.8} />} title="Uma unidade" hint="Ex.: multa, taxa extra" onClick={() => update({ target: "unit" })} />
            <Choice compact selected={form.target === "many"} icon={<Rows3 size={18} strokeWidth={1.8} />} title="Várias unidades" hint="Condomínio todo, um prédio ou escolhidas" onClick={() => update({ target: "many" })} />
          </div>

          {form.target === "unit" ? (
            <>
              <SelectField
                label="Unidade"
                value={form.unitId}
                onChange={(event) => chooseUnit(event.target.value)}
                placeholder="Escolha a unidade"
                options={units.map((unit) => ({ value: String(unit.id), label: `${unitLabel(unit)}${unit.responsiblePersonName ? ` · ${unit.responsiblePersonName}` : ""}` }))}
              />
              {form.unitId && (
                <div className="rounded-block border border-linha px-4">
                  <Switch
                    label="Cobrar só de uma pessoa"
                    description={
                      unitPeople === null
                        ? "Carregando quem mora na unidade…"
                        : unitPeople.length === 0
                          ? "Ninguém vinculado que você possa ver. A cobrança vai para a unidade."
                          : "Só ela vê, paga e recebe o aviso. Sem isso, vai para todos da unidade."
                    }
                    checked={form.onlyOnePerson}
                    disabled={!unitPeople?.length}
                    onChange={(checked) => update({ onlyOnePerson: checked, recipientPersonId: checked ? form.recipientPersonId : "" })}
                  />
                  {form.onlyOnePerson && unitPeople && (
                    <SelectField
                      className="pb-4"
                      label="Pessoa"
                      value={form.recipientPersonId}
                      onChange={(event) => update({ recipientPersonId: event.target.value })}
                      placeholder="Escolha a pessoa"
                      options={unitPeople.map((person) => ({ value: String(person.personId), label: `${person.personName} · ${relationshipLabel(person.relationshipType)}` }))}
                    />
                  )}
                </div>
              )}
            </>
          ) : (
            <>
              <div className="grid gap-2">
                <Choice compact selected={form.manyScope === "all"} icon={<ClipboardList size={18} strokeWidth={1.8} />} title="Condomínio todo" hint={`${units.length} unidades`} onClick={() => update({ manyScope: "all" })} />
                <Choice compact selected={form.manyScope === "building"} icon={<Building size={18} strokeWidth={1.8} />} title="Um prédio" onClick={() => update({ manyScope: "building" })} />
                <Choice compact selected={form.manyScope === "pick"} icon={<ListChecks size={18} strokeWidth={1.8} />} title="Escolher unidades" hint="Ex.: só algumas unidades" onClick={() => update({ manyScope: "pick" })} />
              </div>
              {form.manyScope === "building" && (
                <SelectField
                  label="Prédio"
                  value={form.buildingId}
                  onChange={(event) => update({ buildingId: event.target.value })}
                  placeholder="Escolha o prédio"
                  options={buildings.map((building) => ({ value: String(building.id), label: `${building.name} · ${building.unitCount} unidades` }))}
                />
              )}
              {form.manyScope === "pick" && (
                <div className="rounded-block border border-linha">
                  <div className="flex items-center justify-between gap-3 border-b border-linha px-4 py-2.5 text-[13px] text-tinta-suave">
                    <span className="tabular-nums">{form.pickedUnitIds.length} de {units.length} escolhidas</span>
                    <button
                      type="button"
                      onClick={() => update({ pickedUnitIds: form.pickedUnitIds.length === units.length ? [] : units.map((unit) => unit.id) })}
                      className="font-semibold text-tinta hover:underline"
                    >
                      {form.pickedUnitIds.length === units.length ? "Desmarcar todas" : "Marcar todas"}
                    </button>
                  </div>
                  <ul className="max-h-64 divide-y divide-linha overflow-y-auto">
                    {units.map((unit) => {
                      const checked = form.pickedUnitIds.includes(unit.id);
                      return (
                        <li key={unit.id}>
                          <label className="flex cursor-pointer items-center gap-3 px-4 py-2.5">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => update({ pickedUnitIds: checked ? form.pickedUnitIds.filter((id) => id !== unit.id) : [...form.pickedUnitIds, unit.id] })}
                              className="size-4 accent-verde"
                            />
                            <span className="min-w-0">
                              <span className="block truncate text-sm font-semibold text-tinta">{unitLabel(unit)}</span>
                              <span className="block truncate text-xs text-tinta-suave">{unit.responsiblePersonName || "Sem responsável"}</span>
                            </span>
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {step === 3 && (
        <div className="grid gap-4">
          {form.target === "many" && (
            <div className="grid gap-2 sm:grid-cols-2">
              <Choice compact selected={form.pricing === "same"} icon={<Check size={18} strokeWidth={1.8} />} title="Mesmo valor" onClick={() => update({ pricing: "same" })} />
              <Choice compact selected={form.pricing === "perUnit"} icon={<Rows3 size={18} strokeWidth={1.8} />} title="Valor por unidade" onClick={() => update({ pricing: "perUnit" })} />
            </div>
          )}

          <TextField
            label={form.pricing === "perUnit" ? "Valor padrão (R$)" : form.target === "unit" ? "Valor (R$)" : "Valor por unidade (R$)"}
            value={form.value}
            onChange={(event) => update({ value: event.target.value })}
            placeholder="500,00"
            inputMode="decimal"
          />

          {form.pricing === "perUnit" && (
            <div className="rounded-block border border-linha">
              <p className="border-b border-linha px-4 py-2.5 text-[13px] text-tinta-suave">Em branco = valor padrão.</p>
              <ul className="max-h-64 divide-y divide-linha overflow-y-auto">
                {scoped.map((unit) => (
                  <li key={unit.id} className="flex items-center justify-between gap-3 px-4 py-2">
                    <span className="min-w-0 truncate text-sm font-semibold text-tinta">{unitLabel(unit)}</span>
                    <MoneyInput
                      label={`Valor de ${unitLabel(unit)}`}
                      value={form.unitValues[unit.id] ?? ""}
                      placeholder={form.value || "padrão"}
                      className="w-28"
                      onChange={(value) => update({ unitValues: { ...form.unitValues, [unit.id]: value } })}
                    />
                  </li>
                ))}
              </ul>
            </div>
          )}

          {canRepeat(form) && (
            <div className="rounded-block border border-linha px-4">
              <Switch
                label="Todo mês (cobrança fixa)"
                description="Entra sozinha na conta de cada mês, até você pausar."
                checked={form.repeat}
                onChange={(checked) => update({ repeat: checked })}
              />
            </div>
          )}

          {!repeat && (
            <div className="grid gap-2 sm:grid-cols-2">
              <Choice
                compact
                selected={form.destination === "bill"}
                icon={<ReceiptText size={18} strokeWidth={1.8} />}
                title="Na conta do mês"
                hint="Junto com o resto, um Pix só"
                onClick={() => update({ destination: "bill" })}
              />
              <Choice
                compact
                selected={form.destination === "now"}
                icon={<CalendarClock size={18} strokeWidth={1.8} />}
                title="Agora, separada"
                hint="Uma conta só disso, com vencimento próprio"
                onClick={() => update({ destination: "now" })}
              />
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            {repeat ? (
              <TextField
                label="Dia do vencimento"
                value={form.dueDay}
                onChange={(event) => update({ dueDay: event.target.value.replace(/\D/g, "").slice(0, 2) })}
                placeholder={billingDueDay ? String(billingDueDay) : "10"}
                inputMode="numeric"
                hint={billingDueDay ? `O do condomínio é dia ${billingDueDay}.` : undefined}
              />
            ) : form.destination === "bill" ? (
              <SelectField
                label="Conta de"
                value={form.billMonth}
                onChange={(event) => update({ billMonth: event.target.value })}
                options={billMonthOptions().map((month) => ({ value: month, label: monthName(month) }))}
              />
            ) : (
              <TextField label="Vencimento" type="date" min={todayInputDate()} value={form.dueDate} onChange={(event) => update({ dueDate: event.target.value })} />
            )}
            <TextField
              label="Descrição"
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value, descriptionEdited: true })}
              maxLength={255}
            />
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="grid gap-4">
          <div className="flex items-start gap-3 rounded-block bg-campo px-4 py-4">
            <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-field bg-superficie text-tinta">
              {repeat ? <Repeat size={18} strokeWidth={1.8} /> : category ? <category.icon size={18} strokeWidth={1.8} /> : null}
            </span>
            <p className="text-[15px] font-semibold leading-snug text-tinta">{summarize({ ...form, repeat }, units, recipient?.personName)}</p>
          </div>

          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            <div>
              <dt className="text-xs text-tinta-suave">Descrição</dt>
              <dd className="font-semibold text-tinta [overflow-wrap:anywhere]">{form.description}</dd>
            </div>
            <div>
              <dt className="text-xs text-tinta-suave">{repeat ? "Vence" : form.destination === "bill" ? "Entra na conta de" : "Vencimento"}</dt>
              <dd className="font-semibold tabular-nums text-tinta">
                {repeat ? `todo dia ${form.dueDay}` : form.destination === "bill" ? monthName(form.billMonth) : formatCalendarDate(form.dueDate)}
              </dd>
            </div>
            <div className="col-span-2">
              <dt className="text-xs text-tinta-suave">De quem</dt>
              <dd className="flex items-center gap-1.5 font-semibold text-tinta">
                {recipient && <User size={15} strokeWidth={1.8} aria-hidden className="shrink-0 text-tinta-suave" />}
                {form.target === "unit"
                  ? `${scoped[0] ? unitLabel(scoped[0]) : ""}${recipient ? ` · só ${recipient.personName}` : " · todos da unidade"}`
                  : `${billed.length} ${billed.length === 1 ? "unidade" : "unidades"}`}
              </dd>
            </div>
          </dl>

          {unitsWithoutPeople > 0 && (
            <p className="rounded-block bg-ambar-suave px-4 py-3 text-[13px] text-tinta">
              {unitsWithoutPeople > 0 && `${unitsWithoutPeople} sem ninguém vinculado ${unitsWithoutPeople === 1 ? "fica" : "ficam"} de fora.`}
            </p>
          )}
        </div>
      )}
    </Modal>
  );
}
