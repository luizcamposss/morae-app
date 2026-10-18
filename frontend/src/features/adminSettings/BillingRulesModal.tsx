import { useEffect, useState } from "react";
import { Button } from "../../shared/components/Button";
import { Modal } from "../../shared/components/Modal";
import { Switch } from "../../shared/components/Switch";
import { TextField } from "../../shared/components/TextField";
import { getBillingSettings, updateBillingSettings } from "../charges/billingService";
import type { BillingSettings } from "../charges/types";
import { FormFeedback } from "../settings/FormFeedback";
import { parsePercent, toBillingForm, validateBillingForm, type BillingForm } from "./billingRules";

// Due day and late fees of the condominium (only the Admin changes them).
export function BillingRulesModal({ condominiumId, onClose, onSaved }: { condominiumId: number; onClose: () => void; onSaved: (settings: BillingSettings) => void }) {
  const [settings, setSettings] = useState<BillingSettings | null>(null);
  const [form, setForm] = useState<BillingForm | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    getBillingSettings(condominiumId)
      .then((result) => {
        if (!isMounted) return;
        setSettings(result);
        setForm(toBillingForm(result));
      })
      .catch((error) => isMounted && setErrorMessage(error instanceof Error ? error.message : "Não foi possível carregar as regras de cobrança."));

    return () => {
      isMounted = false;
    };
  }, [condominiumId]);

  function change(next: Partial<BillingForm>) {
    if (!form) return;
    setErrorMessage("");
    setSuccessMessage("");
    setForm({ ...form, ...next });
  }

  async function handleSave() {
    if (!form || !settings) return;
    const validation = validateBillingForm(form, settings);

    if (validation) {
      setErrorMessage(validation);
      return;
    }

    try {
      setIsSaving(true);
      const saved = await updateBillingSettings(condominiumId, {
        billingDueDay: Number(form.billingDueDay),
        lateFeeEnabled: form.lateFeeEnabled,
        finePercent: form.lateFeeEnabled ? parsePercent(form.finePercent) : settings.finePercent,
        monthlyInterestPercent: form.lateFeeEnabled ? parsePercent(form.monthlyInterestPercent) : settings.monthlyInterestPercent,
      });
      setSettings(saved);
      setForm(toBillingForm(saved));
      setSuccessMessage("Regras de cobrança salvas. Elas valem para as próximas cobranças.");
      onSaved(saved);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Não foi possível salvar as regras de cobrança.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Modal
      title="Regras de cobrança"
      description="Dia de vencimento e multa e juros por atraso das cobranças do condomínio."
      onClose={onClose}
      footer={
        <>
          <Button variant="quiet" onClick={onClose}>
            Fechar
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
        <FormFeedback errorMessage={errorMessage} successMessage={successMessage} />

        {!form || !settings ? (
          !errorMessage && <p className="py-6 text-center text-sm text-tinta-suave">Carregando…</p>
        ) : (
          <>
            <TextField
              label="Dia do vencimento"
              value={form.billingDueDay}
              onChange={(event) => change({ billingDueDay: event.target.value.replace(/\D/g, "").slice(0, 2) })}
              inputMode="numeric"
              hint="De 1 a 31. Em mês mais curto, vence no último dia. Lotes e recorrências podem usar outro dia."
            />

            <div className="border-t border-linha">
              <Switch
                label="Cobrar multa e juros por atraso"
                description="Vale só para cobranças criadas depois de ligar."
                checked={form.lateFeeEnabled}
                onChange={(checked) => change({ lateFeeEnabled: checked })}
              />
            </div>

            {form.lateFeeEnabled && (
              <div className="grid gap-4 sm:grid-cols-2">
                <TextField
                  label="Multa (%)"
                  value={form.finePercent}
                  onChange={(event) => change({ finePercent: event.target.value })}
                  inputMode="decimal"
                  hint={`Uma vez, de 0 a ${settings.maxFinePercent}%.`}
                />
                <TextField
                  label="Juros ao mês (%)"
                  value={form.monthlyInterestPercent}
                  onChange={(event) => change({ monthlyInterestPercent: event.target.value })}
                  inputMode="decimal"
                  hint={`Por dia de atraso, de 0 a ${settings.maxMonthlyInterestPercent}%.`}
                />
                <p className="rounded-field bg-campo px-4 py-3 text-[13px] text-tinta-suave sm:col-span-2">
                  Limites do Código Civil. Ex.: taxa de R$ 500,00 paga 15 dias depois, com multa de 2% e juros de 1% ao mês, fica em R$ 512,50. Na baixa manual
                  você pode perdoar a multa e os juros.
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}
