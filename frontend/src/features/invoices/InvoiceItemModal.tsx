import { useState } from "react";
import { Button } from "../../shared/components/Button";
import { Modal } from "../../shared/components/Modal";
import { TextField } from "../../shared/components/TextField";
import { parseCurrencyInput, validateMoney } from "../adminPayments/chargeForm";
import { CHARGE_CATEGORIES, INVOICE_ITEM_CATEGORIES } from "../charges/chargeCategories";
import type { ChargeCategory, ChargeItem } from "../charges/types";
import { FormFeedback } from "../settings/FormFeedback";
import { updateInvoiceItem } from "./invoiceService";

type InvoiceItemModalProps = {
  item: ChargeItem;
  onClose: () => void;
  onSaved: () => void;
};

// Corrects an item of a bill that has not gone out yet (new items come from "Lançar cobrança").
export function InvoiceItemModal({ item, onClose, onSaved }: InvoiceItemModalProps) {
  // Items made elsewhere (rent, water…) keep their category; manual ones may switch among the manual ones.
  const canChangeCategory = INVOICE_ITEM_CATEGORIES.includes(item.category);
  const [category, setCategory] = useState<ChargeCategory>(item.category);
  const [description, setDescription] = useState(item.description);
  const [amount, setAmount] = useState(item.amount.toFixed(2).replace(".", ","));
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSave() {
    const moneyError = validateMoney(amount, "o valor");
    if (moneyError) return setErrorMessage(moneyError);

    setIsSaving(true);
    setErrorMessage("");
    try {
      await updateInvoiceItem(item.id, { category, description: description.trim() || CHARGE_CATEGORIES[category].label, amount: parseCurrencyInput(amount) });
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
      title="Corrigir item"
      description="A conta ainda não saiu: o morador só vê depois."
      onClose={onClose}
      footer={
        <>
          <Button variant="quiet" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={() => void handleSave()} isLoading={isSaving} loadingText="Salvando…">
            Salvar
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <FormFeedback errorMessage={errorMessage} successMessage="" />

        {canChangeCategory && (
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
                    onClick={() => setCategory(value)}
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
        )}

        <TextField label="Descrição" value={description} onChange={(event) => setDescription(event.target.value.slice(0, 150))} hint="É o que o morador vê na conta." />
        <TextField label="Valor (R$)" value={amount} onChange={(event) => setAmount(event.target.value)} inputMode="decimal" placeholder="0,00" />
      </div>
    </Modal>
  );
}
