import { useEffect, useState } from "react";
import { Button } from "../../shared/components/Button";
import { Modal } from "../../shared/components/Modal";
import { SelectField } from "../../shared/components/SelectField";
import { TextField } from "../../shared/components/TextField";
import { parseCurrencyInput, unitLabel, validateMoney } from "../adminPayments/chargeForm";
import { CHARGE_CATEGORIES, INVOICE_ITEM_CATEGORIES } from "../charges/chargeCategories";
import type { ChargeCategory, ChargeItem } from "../charges/types";
import { monthLabel } from "../expenses/expenseMeta";
import { getPeopleByUnit } from "../personUnits/personUnitService";
import type { PersonUnitResponse } from "../personUnits/types";
import { relationshipOptions } from "../units/unitForm";
import type { UnitResponse } from "../units/types";
import { FormFeedback } from "../settings/FormFeedback";
import { addInvoiceItem, updateInvoiceItem } from "./invoiceService";

type InvoiceItemModalProps = {
  condominiumId: number;
  month: string;
  units: UnitResponse[];
  // Editing an item of a draft; without it, a new item (the bill is found or created by the API).
  item?: ChargeItem;
  // New item for a bill that already exists: unit and payer are fixed.
  preset?: { unitId: number; recipientPersonId: number | null };
  onClose: () => void;
  onSaved: () => void;
};

const TENANT = 3;
const relationshipLabel = (type: number) => relationshipOptions.find((option) => option.value === type)?.label ?? "Vinculado";

export function InvoiceItemModal({ condominiumId, month, units, item, preset, onClose, onSaved }: InvoiceItemModalProps) {
  const isEdit = Boolean(item);
  const [unitId, setUnitId] = useState(preset ? String(preset.unitId) : "");
  const [recipientId, setRecipientId] = useState(preset?.recipientPersonId ? String(preset.recipientPersonId) : "");
  const [people, setPeople] = useState<{ unitId: string; list: PersonUnitResponse[] } | null>(null);
  const [category, setCategory] = useState<ChargeCategory>(item?.category ?? 2);
  const [description, setDescription] = useState(item?.description ?? "");
  const [amount, setAmount] = useState(item ? item.amount.toFixed(2).replace(".", ",") : "");
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (isEdit || !unitId) return;
    let isMounted = true;
    getPeopleByUnit(Number(unitId))
      .then((list) => isMounted && setPeople({ unitId, list }))
      .catch(() => isMounted && setPeople({ unitId, list: [] }));
    return () => {
      isMounted = false;
    };
  }, [isEdit, unitId]);

  const unitPeople = people?.unitId === unitId ? people.list : [];

  function chooseUnit(value: string) {
    setUnitId(value);
    setRecipientId("");
  }

  function chooseCategory(value: ChargeCategory) {
    setCategory(value);
    // Rent usually goes to the tenant alone.
    const tenant = unitPeople.find((person) => person.relationshipType === TENANT);
    if (!preset && value === 2 && tenant && !recipientId) setRecipientId(String(tenant.personId));
  }

  async function handleSave() {
    const moneyError = validateMoney(amount, "o valor");
    if (!isEdit && !unitId) return setErrorMessage("Escolha a unidade.");
    if (moneyError) return setErrorMessage(moneyError);

    setIsSaving(true);
    setErrorMessage("");
    const text = description.trim() || CHARGE_CATEGORIES[category].label;

    try {
      if (item) {
        await updateInvoiceItem(item.id, { category, description: text, amount: parseCurrencyInput(amount) });
      } else {
        await addInvoiceItem(condominiumId, {
          unitId: Number(unitId),
          recipientPersonId: recipientId ? Number(recipientId) : null,
          month,
          category,
          description: text,
          amount: parseCurrencyInput(amount),
        });
      }
      onSaved();
      onClose();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Não foi possível salvar o item.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Modal
      title={isEdit ? "Editar item" : "Adicionar à conta"}
      description={isEdit ? "A conta ainda é um rascunho: o morador só vê depois de enviada." : `Entra na conta de ${monthLabel(month)} da unidade.`}
      onClose={onClose}
      footer={
        <>
          <Button variant="quiet" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={() => void handleSave()} isLoading={isSaving} loadingText="Salvando…">
            {isEdit ? "Salvar" : "Adicionar"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <FormFeedback errorMessage={errorMessage} successMessage="" />

        {!isEdit && (
          <>
            <SelectField
              label="Unidade"
              value={unitId}
              disabled={Boolean(preset)}
              onChange={(event) => chooseUnit(event.target.value)}
              placeholder="Escolha a unidade"
              options={units.map((unit) => ({ value: String(unit.id), label: unitLabel(unit) }))}
            />
            {unitId && (
              <SelectField
                label="Quem paga"
                value={recipientId}
                disabled={Boolean(preset)}
                onChange={(event) => setRecipientId(event.target.value)}
                options={[
                  { value: "", label: "Todos da unidade" },
                  ...unitPeople.map((person) => ({ value: String(person.personId), label: `Só ${person.personName} · ${relationshipLabel(person.relationshipType)}` })),
                ]}
              />
            )}
          </>
        )}

        <div>
          <p className="mb-2 text-sm font-semibold text-tinta">O que é</p>
          <div className="flex flex-wrap gap-2">
            {INVOICE_ITEM_CATEGORIES.map((value) => {
              const info = CHARGE_CATEGORIES[value];
              const isActive = value === category;
              return (
                <button
                  key={value}
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => chooseCategory(value)}
                  className={`flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-semibold transition-colors ${
                    isActive ? "bg-tinta text-white" : "bg-campo text-tinta-suave hover:text-tinta"
                  }`}
                >
                  <info.icon size={15} strokeWidth={1.8} aria-hidden />
                  {info.cardLabel}
                </button>
              );
            })}
          </div>
        </div>

        <TextField
          label="Descrição"
          value={description}
          onChange={(event) => setDescription(event.target.value.slice(0, 150))}
          placeholder={category === 3 ? "Água (18 m³)" : CHARGE_CATEGORIES[category].label}
          hint="É o que o morador vê na conta. Em branco, usa o nome do item."
        />
        <TextField label="Valor (R$)" value={amount} onChange={(event) => setAmount(event.target.value)} inputMode="decimal" placeholder="0,00" />
      </div>
    </Modal>
  );
}
