import { useEffect, useState } from "react";
import { Button } from "../../shared/components/Button";
import { Modal } from "../../shared/components/Modal";
import { SelectField } from "../../shared/components/SelectField";
import { Switch } from "../../shared/components/Switch";
import { TextField } from "../../shared/components/TextField";
import { todayInputDate } from "../../shared/lib/date";
import { parseCurrencyInput, unitLabel, validateMoney } from "../adminPayments/chargeForm";
import { getPeopleByUnit } from "../personUnits/personUnitService";
import type { PersonUnitResponse } from "../personUnits/types";
import { FormFeedback } from "../settings/FormFeedback";
import { relationshipOptions } from "../units/unitForm";
import type { UnitResponse } from "../units/types";
import { adjustmentOptions, createRentalContract, updateRentalContract, type RentAdjustmentIndex, type RentalContract } from "./rentalService";

type Props = {
  condominiumId: number;
  units: UnitResponse[];
  // Editing: unit, tenant, start and rent stay (the rent changes through "Reajustar").
  contract?: RentalContract;
  initialUnitId?: number | null;
  onClose: () => void;
  onSaved: () => void;
};

const TENANT = 3;
const money = (value: number | null | undefined) => (value == null ? "" : value.toFixed(2).replace(".", ","));
const relationshipLabel = (type: number) => relationshipOptions.find((option) => option.value === type)?.label ?? "Vinculado";

export function RentalContractModal({ condominiumId, units, contract, initialUnitId, onClose, onSaved }: Props) {
  const isEdit = Boolean(contract);
  const [unitId, setUnitId] = useState(String(contract?.unitId ?? initialUnitId ?? ""));
  const [tenantId, setTenantId] = useState(String(contract?.tenantPersonId ?? ""));
  const [people, setPeople] = useState<{ unitId: string; list: PersonUnitResponse[] } | null>(null);
  const [rent, setRent] = useState(money(contract?.monthlyRent));
  const [dueDay, setDueDay] = useState(String(contract?.dueDay ?? 10));
  const [startDate, setStartDate] = useState(contract?.startDate ?? todayInputDate());
  const [endDate, setEndDate] = useState(contract?.endDate ?? "");
  const [includes, setIncludes] = useState({
    water: contract?.includesWater ?? true,
    electricity: contract?.includesElectricity ?? true,
    gas: contract?.includesGas ?? false,
    fee: contract?.includesCondominiumFee ?? false,
  });
  const [feeAmount, setFeeAmount] = useState(money(contract?.condominiumFeeAmount));
  const [adjustment, setAdjustment] = useState<RentAdjustmentIndex>(contract?.adjustmentIndex ?? 1);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (isEdit || !unitId) return;
    let isMounted = true;
    getPeopleByUnit(Number(unitId))
      .then((list) => {
        if (!isMounted) return;
        setPeople({ unitId, list });
        // Picks the tenant linked to the unit, when there is one.
        const tenant = list.find((person) => person.relationshipType === TENANT);
        if (tenant) setTenantId((current) => current || String(tenant.personId));
      })
      .catch(() => isMounted && setPeople({ unitId, list: [] }));
    return () => {
      isMounted = false;
    };
  }, [isEdit, unitId]);

  const unitPeople = people?.unitId === unitId ? people.list : [];

  async function handleSave() {
    const day = Number(dueDay);
    if (!unitId) return setErrorMessage("Escolha a unidade.");
    if (!tenantId) return setErrorMessage("Escolha o inquilino. Ele precisa estar vinculado à unidade.");
    const rentError = isEdit ? "" : validateMoney(rent, "o aluguel");
    if (rentError) return setErrorMessage(rentError);
    if (!Number.isInteger(day) || day < 1 || day > 31) return setErrorMessage("O vencimento é um dia de 1 a 31.");
    if (!startDate) return setErrorMessage("Informe o início do contrato.");
    if (endDate && endDate < startDate) return setErrorMessage("O fim não pode ser antes do início.");
    const feeError = includes.fee ? validateMoney(feeAmount, "a taxa de condomínio") : "";
    if (feeError) return setErrorMessage(feeError);

    const data = {
      unitId: Number(unitId),
      tenantPersonId: Number(tenantId),
      monthlyRent: isEdit && contract ? contract.monthlyRent : parseCurrencyInput(rent),
      dueDay: day,
      startDate,
      endDate: endDate || null,
      includesWater: includes.water,
      includesElectricity: includes.electricity,
      includesGas: includes.gas,
      includesCondominiumFee: includes.fee,
      condominiumFeeAmount: includes.fee ? parseCurrencyInput(feeAmount) : null,
      adjustmentIndex: adjustment,
      nextAdjustmentDate: contract?.adjustmentIndex === adjustment ? contract.nextAdjustmentDate : null,
    };

    setIsSaving(true);
    setErrorMessage("");
    try {
      if (contract) await updateRentalContract(contract.id, data);
      else await createRentalContract(condominiumId, data);
      onSaved();
      onClose();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Não foi possível salvar o contrato.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Modal
      title={isEdit ? "Editar contrato" : "Alugar unidade"}
      description="O aluguel entra sozinho na conta do mês do inquilino, 20 dias antes do vencimento."
      onClose={onClose}
      footer={
        <>
          <Button variant="quiet" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={() => void handleSave()} isLoading={isSaving} loadingText="Salvando…">
            {isEdit ? "Salvar" : "Cadastrar contrato"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <FormFeedback errorMessage={errorMessage} successMessage="" />

        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField
            label="Unidade"
            value={unitId}
            disabled={isEdit}
            onChange={(event) => {
              setUnitId(event.target.value);
              setTenantId("");
            }}
            placeholder="Escolha a unidade"
            options={units.map((unit) => ({ value: String(unit.id), label: unitLabel(unit) }))}
          />
          <SelectField
            label="Inquilino"
            value={tenantId}
            disabled={isEdit || !unitId}
            onChange={(event) => setTenantId(event.target.value)}
            placeholder={unitId && unitPeople.length === 0 ? "Ninguém vinculado" : "Escolha"}
            options={
              isEdit && contract
                ? [{ value: String(contract.tenantPersonId), label: contract.tenantName }]
                : unitPeople.map((person) => ({ value: String(person.personId), label: `${person.personName} · ${relationshipLabel(person.relationshipType)}` }))
            }
          />
          <TextField
            label="Aluguel (R$)"
            value={rent}
            onChange={(event) => setRent(event.target.value)}
            inputMode="decimal"
            placeholder="0,00"
            disabled={isEdit}
            hint={isEdit ? "Para mudar o valor, use Reajustar (fica no histórico)." : undefined}
          />
          <TextField label="Vence todo dia" value={dueDay} onChange={(event) => setDueDay(event.target.value.replace(/\D/g, "").slice(0, 2))} inputMode="numeric" />
          <TextField label="Início" type="date" value={startDate} disabled={isEdit} onChange={(event) => setStartDate(event.target.value)} />
          <TextField label="Fim (opcional)" type="date" value={endDate} min={startDate} onChange={(event) => setEndDate(event.target.value)} />
        </div>

        <section>
          <h3 className="text-sm font-semibold text-tinta">Também entra na conta do inquilino</h3>
          <div className="divide-y divide-linha">
            <Switch label="Água" description="Pela leitura do mês" checked={includes.water} onChange={(water) => setIncludes({ ...includes, water })} />
            <Switch label="Luz" description="Pela leitura do mês" checked={includes.electricity} onChange={(electricity) => setIncludes({ ...includes, electricity })} />
            <Switch label="Gás" description="Pela leitura do mês" checked={includes.gas} onChange={(gas) => setIncludes({ ...includes, gas })} />
            <Switch label="Taxa de condomínio" description="Valor fixo todo mês" checked={includes.fee} onChange={(fee) => setIncludes({ ...includes, fee })} />
          </div>
          {includes.fee && <TextField label="Taxa de condomínio (R$)" value={feeAmount} onChange={(event) => setFeeAmount(event.target.value)} inputMode="decimal" placeholder="0,00" />}
        </section>

        <SelectField
          label="Reajuste anual"
          value={String(adjustment)}
          onChange={(event) => setAdjustment(Number(event.target.value) as RentAdjustmentIndex)}
          options={adjustmentOptions.map((option) => ({ value: String(option.value), label: option.label }))}
        />
        {adjustment !== 4 && (
          <p className="-mt-2 text-[13px] text-tinta-suave">A gestão recebe um aviso 30 dias antes do aniversário do contrato e informa o novo valor.</p>
        )}
      </div>
    </Modal>
  );
}
