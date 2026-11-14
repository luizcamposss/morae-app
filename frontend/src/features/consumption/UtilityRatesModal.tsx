import { useEffect, useState } from "react";
import { Button } from "../../shared/components/Button";
import { Modal } from "../../shared/components/Modal";
import { Switch } from "../../shared/components/Switch";
import { TextField } from "../../shared/components/TextField";
import { FormFeedback } from "../settings/FormFeedback";
import { UTILITIES, getUtilityRates, saveUtilityRates, type Utility, type UtilityRate } from "./consumptionService";

type Form = Record<Utility, { enabled: boolean; price: string; minimum: string }>;
const toText = (value: number) => (value ? String(value).replace(".", ",") : "");
const toNumber = (value: string) => Number(value.trim().replace(/\./g, "").replace(",", ".") || 0);

// Admin: price per m³/kWh and minimum charge of each utility the condominium measures per unit.
export function UtilityRatesModal({ condominiumId, onClose, onSaved }: { condominiumId: number; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<Form | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isMounted = true;
    getUtilityRates(condominiumId)
      .then((rates) => {
        if (!isMounted) return;
        const byCategory = (category: Utility) => rates.find((rate) => rate.category === category);
        setForm(
          Object.fromEntries(
            UTILITIES.map((item) => {
              const rate = byCategory(item.value);
              return [item.value, { enabled: rate?.enabled ?? false, price: toText(rate?.pricePerUnit ?? 0), minimum: toText(rate?.minimumCharge ?? 0) }];
            }),
          ) as Form,
        );
      })
      .catch((error) => isMounted && setErrorMessage(error instanceof Error ? error.message : "Não foi possível carregar os preços."));
    return () => {
      isMounted = false;
    };
  }, [condominiumId]);

  async function handleSave() {
    if (!form) return;
    const rates: UtilityRate[] = UTILITIES.map((item) => ({
      category: item.value,
      enabled: form[item.value].enabled,
      pricePerUnit: toNumber(form[item.value].price),
      minimumCharge: toNumber(form[item.value].minimum),
    }));
    const invalid = rates.find((rate) => rate.enabled && !(rate.pricePerUnit > 0));
    if (invalid) return setErrorMessage(`Informe o preço de ${UTILITIES.find((item) => item.value === invalid.category)?.label.toLowerCase()}.`);

    setIsSaving(true);
    setErrorMessage("");
    try {
      await saveUtilityRates(condominiumId, rates);
      onSaved();
      onClose();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Não foi possível salvar os preços.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Modal
      title="Preços de consumo"
      description="Valem para as próximas leituras. Leituras já lançadas não mudam."
      onClose={onClose}
      footer={
        <>
          <Button variant="quiet" onClick={onClose}>
            Cancelar
          </Button>
          {form && (
            <Button onClick={() => void handleSave()} isLoading={isSaving} loadingText="Salvando…">
              Salvar
            </Button>
          )}
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <FormFeedback errorMessage={errorMessage} successMessage="" />
        {form &&
          UTILITIES.map((item) => (
            <section key={item.value} className="border-b border-linha pb-4 last:border-0">
              <Switch
                label={item.label}
                description={`Medida por unidade, em ${item.unit}`}
                checked={form[item.value].enabled}
                onChange={(enabled) => setForm({ ...form, [item.value]: { ...form[item.value], enabled } })}
              />
              {form[item.value].enabled && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <TextField
                    label={`R$ por ${item.unit}`}
                    value={form[item.value].price}
                    onChange={(event) => setForm({ ...form, [item.value]: { ...form[item.value], price: event.target.value } })}
                    inputMode="decimal"
                    placeholder="0,00"
                  />
                  <TextField
                    label="Mínimo por mês (R$)"
                    value={form[item.value].minimum}
                    onChange={(event) => setForm({ ...form, [item.value]: { ...form[item.value], minimum: event.target.value } })}
                    inputMode="decimal"
                    placeholder="0,00"
                    hint="Opcional"
                  />
                </div>
              )}
            </section>
          ))}
      </div>
    </Modal>
  );
}
