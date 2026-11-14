import { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { CalendarClock, KeyRound, Plus } from "lucide-react";
import { useCondominium } from "../../app/providers/useCondominium";
import { Button } from "../../shared/components/Button";
import { Modal } from "../../shared/components/Modal";
import { TextField } from "../../shared/components/TextField";
import { PageHeader } from "../../shared/layout/PageHeader";
import { formatCurrency } from "../../shared/lib/currency";
import { formatCalendarDate, todayInputDate } from "../../shared/lib/date";
import { parseCurrencyInput, validateMoney } from "../adminPayments/chargeForm";
import { getBuildingsByCondominium } from "../buildings/buildingService";
import { FormFeedback } from "../settings/FormFeedback";
import { StatusChip } from "../settings/StatusChip";
import { getUnitsByBuilding } from "../units/unitService";
import type { UnitResponse } from "../units/types";
import { RentalContractModal } from "./RentalContractModal";
import { RENTAL_STATUS, adjustRent, adjustmentLabel, describeIncludes, endRentalContract, getRentalContracts, type RentalContract } from "./rentalService";

// Opened from a unit ("Alugar esta unidade") with the unit already chosen.
export type RentalsLocationState = { rentUnitId?: number } | null;

type Dialog = { kind: "new"; unitId?: number | null } | { kind: "edit" | "adjust" | "end"; contract: RentalContract } | null;

export function RentalsPage() {
  const { activeCondominium, activeCondominiumId } = useCondominium();
  const location = useLocation();
  const navigate = useNavigate();
  const [contracts, setContracts] = useState<{ key: string; list: RentalContract[]; error: string } | null>(null);
  const [units, setUnits] = useState<UnitResponse[]>([]);
  const [dialog, setDialog] = useState<Dialog>(() => {
    const unitId = (location.state as RentalsLocationState)?.rentUnitId;
    return unitId ? { kind: "new", unitId } : null;
  });
  const [reloadKey, setReloadKey] = useState(0);
  const key = `${activeCondominiumId}-${reloadKey}`;
  const reload = useCallback(() => setReloadKey((value) => value + 1), []);

  useEffect(() => {
    // Forget the router state, so a refresh does not open the form again.
    if ((location.state as RentalsLocationState)?.rentUnitId) navigate(location.pathname, { replace: true, state: null });
  }, [location.state, location.pathname, navigate]);

  useEffect(() => {
    if (!activeCondominiumId) return;
    let isMounted = true;
    getRentalContracts(activeCondominiumId)
      .then((list) => isMounted && setContracts({ key, list, error: "" }))
      .catch((error) => isMounted && setContracts({ key, list: [], error: error instanceof Error ? error.message : "Não foi possível carregar os contratos." }));
    getBuildingsByCondominium(activeCondominiumId)
      .then((buildings) => Promise.all(buildings.map((building) => getUnitsByBuilding(building.id))))
      .then((lists) => isMounted && setUnits(lists.flat()))
      .catch(() => isMounted && setUnits([]));
    return () => {
      isMounted = false;
    };
  }, [activeCondominiumId, key]);

  const isLoading = contracts?.key !== key;
  const list = isLoading ? [] : (contracts?.list ?? []);
  const active = list.filter((contract) => contract.status === RENTAL_STATUS.active);
  const ended = list.filter((contract) => contract.status !== RENTAL_STATUS.active);
  const monthlyTotal = active.reduce((sum, contract) => sum + contract.monthlyRent, 0);

  return (
    <>
      <PageHeader overline={activeCondominium?.condominiumName} title="Aluguéis">
        <Button variant="accent" size="sm" onClick={() => setDialog({ kind: "new" })}>
          <Plus size={16} strokeWidth={2} aria-hidden />
          Alugar unidade
        </Button>
      </PageHeader>

      {contracts?.error && !isLoading && (
        <p role="alert" className="mb-6 rounded-field bg-vermelho-suave px-4 py-3 text-sm font-medium text-vermelho">
          {contracts.error}
        </p>
      )}

      {!isLoading && active.length > 0 && (
        <p className="mb-6 text-sm text-tinta-suave tabular-nums">
          {active.length === 1 ? "1 unidade alugada" : `${active.length} unidades alugadas`} · {formatCurrency(monthlyTotal)} de aluguel por mês
        </p>
      )}

      {!isLoading && list.length === 0 && !contracts?.error && (
        <div className="rounded-card bg-campo px-6 py-10 text-center">
          <KeyRound size={28} strokeWidth={1.6} aria-hidden className="mx-auto text-tinta-suave" />
          <p className="mt-3 font-semibold text-tinta">Nenhum contrato ainda</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-tinta-suave">
            Cadastre o inquilino e o valor uma vez: o aluguel entra sozinho na conta do mês dele, junto com água, luz e o que mais você marcar.
          </p>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {[...active, ...ended].map((contract) => {
          const isActive = contract.status === RENTAL_STATUS.active;
          const adjustmentSoon = isActive && contract.nextAdjustmentDate && contract.nextAdjustmentDate <= addDays(todayInputDate(), 30);
          return (
            <article key={contract.id} className={`flex flex-col rounded-card bg-superficie p-5 shadow-whisper ${isActive ? "" : "opacity-70"}`}>
              <header className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="font-semibold text-tinta">
                    {contract.buildingName} · {contract.unitNumber}
                  </h2>
                  <p className="truncate text-[13px] text-tinta-suave">{contract.tenantName}</p>
                </div>
                <StatusChip tone={isActive ? "success" : "neutral"}>{isActive ? (contract.endDate ? `Até ${formatCalendarDate(contract.endDate)}` : "Ativo") : "Encerrado"}</StatusChip>
              </header>

              <p className="mt-4 font-display text-[28px] font-bold leading-none tabular-nums text-tinta">{formatCurrency(contract.monthlyRent)}</p>
              <p className="mt-1 text-[13px] text-tinta-suave">
                Vence todo dia {contract.dueDay} · {describeIncludes(contract)}
                {contract.includesCondominiumFee && contract.condominiumFeeAmount ? ` (taxa ${formatCurrency(contract.condominiumFeeAmount)})` : ""}
              </p>

              {isActive && contract.nextAdjustmentDate && (
                <p className={`mt-3 flex items-center gap-1.5 text-[13px] ${adjustmentSoon ? "font-semibold text-ambar" : "text-tinta-suave"}`}>
                  <CalendarClock size={14} strokeWidth={1.8} aria-hidden />
                  Reajuste ({adjustmentLabel(contract.adjustmentIndex)}) em {formatCalendarDate(contract.nextAdjustmentDate)}
                </p>
              )}

              {contract.valueChanges.length > 1 && (
                <details className="mt-3 text-[13px] text-tinta-suave">
                  <summary className="cursor-pointer font-semibold text-tinta">Histórico de valores</summary>
                  <ul className="mt-2 space-y-1 tabular-nums">
                    {contract.valueChanges.map((change) => (
                      <li key={`${change.effectiveFrom}-${change.createdAt}`}>
                        {formatCurrency(change.newValue)} a partir de {formatCalendarDate(change.effectiveFrom)}
                        {change.previousValue != null ? ` (antes ${formatCurrency(change.previousValue)})` : ""}
                      </li>
                    ))}
                  </ul>
                </details>
              )}

              {isActive ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button variant="quiet" size="sm" onClick={() => setDialog({ kind: "adjust", contract })}>
                    Reajustar
                  </Button>
                  <Button variant="quiet" size="sm" onClick={() => setDialog({ kind: "edit", contract })}>
                    Editar
                  </Button>
                  <button type="button" onClick={() => setDialog({ kind: "end", contract })} className="ml-auto rounded-full px-2 text-sm font-semibold text-vermelho hover:underline">
                    Encerrar
                  </button>
                </div>
              ) : (
                contract.endReason && <p className="mt-3 text-[13px] text-tinta-suave">Motivo: {contract.endReason}</p>
              )}
            </article>
          );
        })}
      </div>

      {activeCondominiumId && (dialog?.kind === "new" || dialog?.kind === "edit") && (
        <RentalContractModal
          condominiumId={activeCondominiumId}
          units={units}
          contract={dialog.kind === "edit" ? dialog.contract : undefined}
          initialUnitId={dialog.kind === "new" ? dialog.unitId : undefined}
          onClose={() => setDialog(null)}
          onSaved={reload}
        />
      )}
      {dialog?.kind === "adjust" && <AdjustModal contract={dialog.contract} onClose={() => setDialog(null)} onSaved={reload} />}
      {dialog?.kind === "end" && <EndModal contract={dialog.contract} onClose={() => setDialog(null)} onSaved={reload} />}
    </>
  );
}

function addDays(date: string, days: number) {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function AdjustModal({ contract, onClose, onSaved }: { contract: RentalContract; onClose: () => void; onSaved: () => void }) {
  const [value, setValue] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSave() {
    const error = validateMoney(value, "o novo aluguel");
    if (error) return setErrorMessage(error);
    setIsSaving(true);
    setErrorMessage("");
    try {
      await adjustRent(contract.id, parseCurrencyInput(value));
      onSaved();
      onClose();
    } catch (saveError) {
      setErrorMessage(saveError instanceof Error ? saveError.message : "Não foi possível reajustar.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Modal
      title="Reajustar aluguel"
      description={`Hoje ${formatCurrency(contract.monthlyRent)}. O novo valor vale a partir do próximo mês que ainda não entrou numa conta.`}
      onClose={onClose}
      footer={
        <>
          <Button variant="quiet" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={() => void handleSave()} isLoading={isSaving} loadingText="Salvando…">
            Reajustar
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <FormFeedback errorMessage={errorMessage} successMessage="" />
        <TextField label="Novo aluguel (R$)" value={value} onChange={(event) => setValue(event.target.value)} inputMode="decimal" placeholder="0,00" />
      </div>
    </Modal>
  );
}

function EndModal({ contract, onClose, onSaved }: { contract: RentalContract; onClose: () => void; onSaved: () => void }) {
  const [endDate, setEndDate] = useState(todayInputDate());
  const [reason, setReason] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSave() {
    if (!endDate) return setErrorMessage("Informe o último dia do contrato.");
    setIsSaving(true);
    setErrorMessage("");
    try {
      await endRentalContract(contract.id, endDate, reason.trim());
      onSaved();
      onClose();
    } catch (saveError) {
      setErrorMessage(saveError instanceof Error ? saveError.message : "Não foi possível encerrar.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Modal
      title="Encerrar contrato"
      description="O aluguel para de entrar nas contas depois do mês do fim. As contas já geradas continuam."
      onClose={onClose}
      footer={
        <>
          <Button variant="quiet" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={() => void handleSave()} isLoading={isSaving} loadingText="Encerrando…">
            Encerrar
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <FormFeedback errorMessage={errorMessage} successMessage="" />
        <TextField label="Último dia" type="date" value={endDate} min={contract.startDate} onChange={(event) => setEndDate(event.target.value)} />
        <TextField label="Motivo (opcional)" value={reason} onChange={(event) => setReason(event.target.value.slice(0, 255))} placeholder="Ex.: fim do contrato, mudança" />
      </div>
    </Modal>
  );
}
