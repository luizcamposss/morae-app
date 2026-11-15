import { useEffect, useState } from "react";
import { Button } from "../../shared/components/Button";
import { Modal } from "../../shared/components/Modal";
import { Switch } from "../../shared/components/Switch";
import { TextField } from "../../shared/components/TextField";
import { formatCalendarDate, todayInputDate } from "../../shared/lib/date";
import { getBillingSettings, updateBillingSettings } from "../charges/billingService";
import type { BillingSettings } from "../charges/types";
import { FormFeedback } from "../settings/FormFeedback";
import { updateInvoiceDueDate } from "./invoiceService";

// When drafts go out on their own (Admin only: it is a billing rule of the condominium).
export function AutoSendModal({ condominiumId, onClose, onSaved }: { condominiumId: number; onClose: () => void; onSaved: () => void }) {
  const [settings, setSettings] = useState<BillingSettings | null>(null);
  const [isAuto, setIsAuto] = useState(false);
  const [days, setDays] = useState("10");
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isMounted = true;
    getBillingSettings(condominiumId)
      .then((data) => {
        if (!isMounted) return;
        setSettings(data);
        setIsAuto(data.invoiceAutoSendDaysBefore !== null);
        if (data.invoiceAutoSendDaysBefore !== null) setDays(String(data.invoiceAutoSendDaysBefore));
      })
      .catch((error) => isMounted && setErrorMessage(error instanceof Error ? error.message : "Não foi possível carregar o envio."));
    return () => {
      isMounted = false;
    };
  }, [condominiumId]);

  async function handleSave() {
    if (!settings) return;
    const daysBefore = Number(days);
    if (isAuto && (!Number.isInteger(daysBefore) || daysBefore < 0 || daysBefore > 28)) return setErrorMessage("Informe de 0 a 28 dias.");

    setIsSaving(true);
    setErrorMessage("");
    try {
      await updateBillingSettings(condominiumId, {
        billingDueDay: settings.billingDueDay,
        lateFeeEnabled: settings.lateFeeEnabled,
        finePercent: settings.finePercent,
        monthlyInterestPercent: settings.monthlyInterestPercent,
        invoiceAutoSend: isAuto,
        invoiceAutoSendDaysBefore: isAuto ? daysBefore : null,
      });
      onSaved();
      onClose();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Não foi possível salvar.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Modal
      title="Envio das contas"
      description="Quando as contas em rascunho chegam aos moradores."
      onClose={onClose}
      footer={
        <>
          <Button variant="quiet" onClick={onClose}>
            Cancelar
          </Button>
          {settings && (
            <Button onClick={() => void handleSave()} isLoading={isSaving} loadingText="Salvando…">
              Salvar
            </Button>
          )}
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <FormFeedback errorMessage={errorMessage} successMessage="" />
        <Switch
          label="Enviar sozinho"
          description="Desligado, as contas só saem quando você clicar em Enviar contas."
          checked={isAuto}
          onChange={setIsAuto}
          disabled={!settings}
        />
        {isAuto && (
          <TextField
            label="Dias antes do vencimento"
            value={days}
            onChange={(event) => setDays(event.target.value.replace(/\D/g, "").slice(0, 2))}
            inputMode="numeric"
            hint="Ex.: 10 = a conta que vence dia 10 sai no dia 1º, com o que tiver nela."
          />
        )}
      </div>
    </Modal>
  );
}

export function DueDateModal({ chargeId, dueDate, onClose, onSaved }: { chargeId: number; dueDate: string; onClose: () => void; onSaved: () => void }) {
  const [value, setValue] = useState(dueDate.slice(0, 10));
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSave() {
    if (!value || value < todayInputDate()) return setErrorMessage("Escolha hoje ou uma data futura.");
    setIsSaving(true);
    setErrorMessage("");
    try {
      await updateInvoiceDueDate(chargeId, value);
      onSaved();
      onClose();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Não foi possível mudar o vencimento.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Modal
      title="Vencimento da conta"
      description={`Hoje: ${formatCalendarDate(dueDate)}.`}
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
        <TextField label="Vence em" type="date" value={value} min={todayInputDate()} onChange={(event) => setValue(event.target.value)} />
      </div>
    </Modal>
  );
}
