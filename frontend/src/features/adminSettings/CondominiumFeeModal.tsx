import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "../../shared/components/Button";
import { Modal } from "../../shared/components/Modal";
import { SelectField } from "../../shared/components/SelectField";
import { Switch } from "../../shared/components/Switch";
import { TextField } from "../../shared/components/TextField";
import { apiRequest } from "../../shared/lib/api/apiClient";
import { getCondominiumFee, type CondominiumFee } from "./condominiumFee";
import { parseCurrencyInput, unitLabel, validateMoney } from "../adminPayments/chargeForm";
import { getBuildingsByCondominium } from "../buildings/buildingService";
import { FormFeedback } from "../settings/FormFeedback";
import { getUnitsByBuilding } from "../units/unitService";
import type { UnitResponse } from "../units/types";

const toText = (value: number) => value.toFixed(2).replace(".", ",");

// The condominium fee of every month (#211): one value per unit, with exceptions (0 = exempt).
// It goes into each unit's bill of the month on its own.
export function CondominiumFeeModal({ condominiumId, onClose, onSaved }: { condominiumId: number; onClose: () => void; onSaved: (fee: CondominiumFee) => void }) {
  const [fee, setFee] = useState<CondominiumFee | null>(null);
  const [enabled, setEnabled] = useState(true);
  const [amount, setAmount] = useState("");
  const [exceptions, setExceptions] = useState<Array<{ unitId: string; amount: string }>>([]);
  const [units, setUnits] = useState<UnitResponse[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isMounted = true;
    Promise.all([
      getCondominiumFee(condominiumId),
      getBuildingsByCondominium(condominiumId).then((buildings) => Promise.all(buildings.map((building) => getUnitsByBuilding(building.id)))),
    ])
      .then(([loaded, lists]) => {
        if (!isMounted) return;
        setFee(loaded);
        setEnabled(loaded.enabled || loaded.amount === 0);
        setAmount(loaded.amount ? toText(loaded.amount) : "");
        setExceptions(loaded.exceptions.map((item) => ({ unitId: String(item.unitId), amount: toText(item.amount) })));
        setUnits(lists.flat());
      })
      .catch((error) => isMounted && setErrorMessage(error instanceof Error ? error.message : "Não foi possível carregar a taxa."));
    return () => {
      isMounted = false;
    };
  }, [condominiumId]);

  async function handleSave() {
    if (enabled) {
      const moneyError = validateMoney(amount, "o valor da taxa");
      if (moneyError) return setErrorMessage(moneyError);
      if (exceptions.some((item) => !item.unitId)) return setErrorMessage("Escolha a unidade de cada exceção.");
      if (new Set(exceptions.map((item) => item.unitId)).size !== exceptions.length) return setErrorMessage("Cada unidade aparece uma vez só nas exceções.");
      if (exceptions.some((item) => item.amount.trim() && !(parseCurrencyInput(item.amount) >= 0))) return setErrorMessage("Confira os valores das exceções.");
    }

    setIsSaving(true);
    setErrorMessage("");
    try {
      const saved = await apiRequest<CondominiumFee>(`/api/condominiums/${condominiumId}/condominium-fee`, {
        method: "PUT",
        body: {
          enabled,
          amount: enabled ? parseCurrencyInput(amount) : 0,
          exceptions: enabled ? exceptions.map((item) => ({ unitId: Number(item.unitId), amount: item.amount.trim() ? parseCurrencyInput(item.amount) : 0 })) : [],
        },
        auth: true,
      });
      onSaved(saved);
      onClose();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Não foi possível salvar a taxa.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Modal
      title="Taxa de condomínio"
      description={fee ? `Entra sozinha na conta de cada mês, com vencimento no dia ${fee.dueDay}.` : "O que cada unidade paga todo mês."}
      onClose={onClose}
      footer={
        <>
          <Button variant="quiet" onClick={onClose}>
            Cancelar
          </Button>
          {fee && (
            <Button onClick={() => void handleSave()} isLoading={isSaving} loadingText="Salvando…">
              Salvar
            </Button>
          )}
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <FormFeedback errorMessage={errorMessage} successMessage="" />
        {!fee ? (
          !errorMessage && <p className="py-6 text-center text-sm text-tinta-suave">Carregando…</p>
        ) : (
          <>
            <Switch label="Cobrar taxa de condomínio todo mês" checked={enabled} onChange={setEnabled} />
            {enabled && (
              <>
                <TextField label="Valor por unidade (R$)" value={amount} onChange={(event) => setAmount(event.target.value)} inputMode="decimal" placeholder="500,00" />
                <section>
                  <h3 className="text-sm font-semibold text-tinta">Exceções</h3>
                  <p className="text-[13px] text-tinta-suave">Unidades que pagam outro valor. 0 = isenta.</p>
                  <ul className="mt-2 flex flex-col gap-2">
                    {exceptions.map((item, index) => (
                      <li key={index} className="flex items-end gap-2">
                        <SelectField
                          label="Unidade"
                          className="flex-1"
                          value={item.unitId}
                          placeholder="Escolha"
                          onChange={(event) => setExceptions(exceptions.map((row, rowIndex) => (rowIndex === index ? { ...row, unitId: event.target.value } : row)))}
                          options={units.map((unit) => ({ value: String(unit.id), label: unitLabel(unit) }))}
                        />
                        <TextField
                          label="R$"
                          className="w-32"
                          value={item.amount}
                          inputMode="decimal"
                          placeholder="0,00"
                          onChange={(event) => setExceptions(exceptions.map((row, rowIndex) => (rowIndex === index ? { ...row, amount: event.target.value } : row)))}
                        />
                        <button
                          type="button"
                          aria-label="Tirar exceção"
                          onClick={() => setExceptions(exceptions.filter((_, rowIndex) => rowIndex !== index))}
                          className="mb-1 rounded-chip p-2.5 text-tinta-suave hover:bg-vermelho-suave hover:text-vermelho"
                        >
                          <Trash2 size={16} strokeWidth={1.8} aria-hidden />
                        </button>
                      </li>
                    ))}
                  </ul>
                  <Button variant="quiet" size="sm" className="mt-2" onClick={() => setExceptions([...exceptions, { unitId: "", amount: "" }])}>
                    <Plus size={14} strokeWidth={2} aria-hidden />
                    Exceção
                  </Button>
                </section>
                <p className="rounded-field bg-campo px-4 py-3 text-[13px] text-tinta-suave">Mudar o valor vale para as próximas contas; as que já foram montadas não mudam.</p>
              </>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}
