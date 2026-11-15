import { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import { useCondominium } from "../../app/providers/useCondominium";
import { Button } from "../../shared/components/Button";
import { PageHeader } from "../../shared/layout/PageHeader";
import { formatCurrency } from "../../shared/lib/currency";
import { formatCalendarDate } from "../../shared/lib/date";
import { ChargeStatusChip } from "../masterPayments/ChargeStatus";
import type { ChargeResponse } from "../charges/types";
import { getMyUnits } from "../me/meService";
import type { MeUnitResponse } from "../me/types";
import { MercadoPagoConnectionPanel } from "../mercadoPago/MercadoPagoConnectionPanel";
import { StatusChip } from "../settings/StatusChip";
import { RentalContractModal } from "./RentalContractModal";
import { RentSummary } from "./RentSummary";
import { AdjustModal, EndModal, type RentalsLocationState } from "./RentalsPage";
import { RENTAL_STATUS, adjustmentLabel, describeIncludes, getOwnedRentalContracts, getRentReceivedAsOwner, type RentalContract } from "./rentalService";

const OWNER = 1;

type Dialog = { kind: "new"; unitId?: number } | { kind: "edit" | "adjust" | "end"; contract: RentalContract } | null;

// "Meus aluguéis": a unit owner rents out their own unit and receives the rent in their own
// Mercado Pago account. The condominium's management never sees these values.
export function OwnerRentalsPage() {
  const { activeCondominium, activeCondominiumId, refreshCondominiums } = useCondominium();
  const [contracts, setContracts] = useState<RentalContract[] | null>(null);
  const [bills, setBills] = useState<ChargeResponse[]>([]);
  const [units, setUnits] = useState<MeUnitResponse[]>([]);
  const [error, setError] = useState("");
  const location = useLocation();
  const navigate = useNavigate();
  // Opened from "Alugar este apartamento" (Minha unidade) with the unit already chosen.
  const [dialog, setDialog] = useState<Dialog>(() => {
    const unitId = (location.state as RentalsLocationState)?.rentUnitId;
    return unitId ? { kind: "new", unitId } : null;
  });
  const [reloadKey, setReloadKey] = useState(0);
  // A new contract may be the first one: the menu then gains "Meus aluguéis".
  const reload = useCallback(() => {
    setReloadKey((value) => value + 1);
    void refreshCondominiums();
  }, [refreshCondominiums]);

  useEffect(() => {
    // Forget the router state, so a refresh does not open the form again.
    if ((location.state as RentalsLocationState)?.rentUnitId) navigate(location.pathname, { replace: true, state: null });
  }, [location.state, location.pathname, navigate]);

  useEffect(() => {
    let isMounted = true;
    Promise.all([getOwnedRentalContracts(), getRentReceivedAsOwner(), getMyUnits()])
      .then(([contractList, billList, unitList]) => {
        if (!isMounted) return;
        setContracts(contractList);
        setBills(billList);
        setUnits(unitList);
        setError("");
      })
      .catch((loadError) => isMounted && setError(loadError instanceof Error ? loadError.message : "Não foi possível carregar seus aluguéis."));
    return () => {
      isMounted = false;
    };
  }, [reloadKey]);

  const ownedUnits = units
    .filter((unit) => unit.relationshipType === OWNER && unit.condominiumId === activeCondominiumId)
    .map((unit) => ({ id: unit.unitId, buildingName: unit.buildingName, number: unit.unitNumber }));
  const shown = (contracts ?? []).filter((contract) => contract.condominiumId === activeCondominiumId);
  const shownBills = bills.filter((bill) => bill.condominiumId === activeCondominiumId);

  return (
    <>
      <PageHeader overline={activeCondominium?.condominiumName} title="Meus aluguéis">
        {ownedUnits.length > 0 && (
          <Button variant="accent" size="sm" onClick={() => setDialog({ kind: "new" })}>
            <Plus size={16} strokeWidth={2} aria-hidden />
            Alugar unidade
          </Button>
        )}
      </PageHeader>

      {error && (
        <p role="alert" className="mb-6 rounded-field bg-vermelho-suave px-4 py-3 text-sm font-medium text-vermelho">
          {error}
        </p>
      )}

      <RentSummary bills={shownBills} activeContracts={shown.filter((contract) => contract.status === RENTAL_STATUS.active).length} isLoading={contracts === null} />

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-6">
          <section>
            <h2 className="mb-3 px-1 text-sm font-semibold text-tinta-suave">Contratos</h2>
            {contracts && shown.length === 0 ? (
              <div className="rounded-card bg-campo px-6 py-8 text-center text-sm text-tinta-suave">
                Nenhum contrato ainda. Cadastre o inquilino e o valor: a conta do aluguel chega para ele 10 dias antes de vencer, e o dinheiro cai na
                sua conta.
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {shown.map((contract) => {
                  const isActive = contract.status === RENTAL_STATUS.active;
                  return (
                    <article key={contract.id} className={`rounded-card bg-superficie p-5 shadow-whisper ${isActive ? "" : "opacity-70"}`}>
                      <header className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="font-semibold text-tinta">
                            {contract.buildingName} · {contract.unitNumber}
                          </h3>
                          <p className="truncate text-[13px] text-tinta-suave">{contract.tenantName}</p>
                        </div>
                        <StatusChip tone={isActive ? "success" : "neutral"}>{isActive ? "Ativo" : "Encerrado"}</StatusChip>
                      </header>
                      <p className="mt-3 font-display text-2xl font-bold tabular-nums text-tinta">{formatCurrency(contract.monthlyRent)}</p>
                      <p className="mt-1 text-[13px] text-tinta-suave">
                        Vence todo dia {contract.dueDay} · {describeIncludes(contract)}
                        {contract.nextAdjustmentDate ? ` · reajuste (${adjustmentLabel(contract.adjustmentIndex)}) em ${formatCalendarDate(contract.nextAdjustmentDate)}` : ""}
                      </p>
                      {isActive && (
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
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          <section>
            <h2 className="mb-3 flex items-baseline justify-between px-1 text-sm font-semibold text-tinta-suave">
              Contas do aluguel
            </h2>
            <ul className="divide-y divide-linha overflow-hidden rounded-card bg-superficie shadow-whisper">
              {shownBills.length === 0 ? (
                <li className="px-5 py-8 text-center text-sm text-tinta-suave">As contas aparecem aqui depois que saem para o inquilino.</li>
              ) : (
                shownBills.map((bill) => (
                  <li key={bill.id} className="flex items-center gap-3 px-5 py-3.5">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-semibold text-tinta">{bill.description}</span>
                      <span className="block text-[13px] text-tinta-suave">
                        {bill.buildingName} · {bill.unitNumber} · vence {formatCalendarDate(bill.dueDate)}
                      </span>
                    </span>
                    <span className="text-right">
                      <span className="block text-sm font-semibold tabular-nums text-tinta">{formatCurrency(bill.value)}</span>
                      <span className="mt-1 flex justify-end">
                        <ChargeStatusChip status={bill.status} />
                      </span>
                    </span>
                  </li>
                ))
              )}
            </ul>
          </section>
        </div>

        <section>
          <h2 className="mb-3 px-1 text-sm font-semibold text-tinta-suave">Onde o aluguel cai</h2>
          <div className="rounded-card bg-superficie p-5 shadow-whisper">
            <MercadoPagoConnectionPanel contextLabel="seus aluguéis" asOwner />
          </div>
          <p className="mt-3 px-1 text-[13px] text-tinta-suave">
            Sem conta conectada, as contas do aluguel esperam e não saem para o inquilino. Sem multa e juros automáticos.
          </p>
        </section>
      </div>

      {activeCondominiumId && (dialog?.kind === "new" || dialog?.kind === "edit") && (
        <RentalContractModal
          condominiumId={activeCondominiumId}
          units={ownedUnits}
          ownerMode
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
