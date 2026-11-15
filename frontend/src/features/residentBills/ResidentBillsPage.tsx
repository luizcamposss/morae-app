import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Check, ChevronRight } from "lucide-react";
import { useCondominium } from "../../app/providers/useCondominium";
import { Button } from "../../shared/components/Button";
import { SelectField } from "../../shared/components/SelectField";
import { PageHeader } from "../../shared/layout/PageHeader";
import { formatCurrency } from "../../shared/lib/currency";
import { formatCalendarDate } from "../../shared/lib/date";
import { amountDue, hasLateFees, isOpenCharge } from "../adminPayments/chargeForm";
import { ChargeDetailsModal } from "../adminPayments/ChargeModals";
import { ChargeReceiptModal } from "../adminPayments/ChargeReceiptModal";
import { AGREEMENT_STATUS } from "../agreements/agreementMeta";
import { getMyAgreements } from "../agreements/agreementService";
import type { AgreementResponse } from "../agreements/types";
import { getMyCharges } from "../charges/chargeService";
import { PaymentProofChip } from "../charges/PaymentProofChip";
import { proofState } from "../charges/paymentProof";
import { CHARGE_STATUS } from "../charges/platformRevenue";
import type { ChargeResponse } from "../charges/types";
import { ChargeStatusChip } from "../masterPayments/ChargeStatus";
import { MercadoPagoPaymentModal } from "../mercadoPago/MercadoPagoPaymentModal";
import { ConsumptionCard } from "../consumption/ConsumptionCard";
import { useModuleEnabled } from "../modules/modules";
import { AgreementCard } from "./AgreementCard";
import { PixPaymentModal } from "./PixPaymentModal";
import { billPlace, sortBills, type BillsLocationState } from "./residentBills";

type LoadedBills = { charges: ChargeResponse[]; agreements: AgreementResponse[]; errorMessage: string };

// Boletos of the resident: what is open (with fine and interest), paying in the app and receipts.
export function ResidentBillsPage() {
  const { activeCondominium, activeCondominiumId, condominiums, setActiveCondominiumId } = useCondominium();
  const location = useLocation();
  const navigate = useNavigate();
  const [loaded, setLoaded] = useState<LoadedBills | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [selectedChargeId, setSelectedChargeId] = useState<number | null>(null);
  // The Início sends the charge to pay in the router state.
  const [payingChargeId, setPayingChargeId] = useState<number | null>(() => (location.state as BillsLocationState)?.payChargeId ?? null);
  const [hasPaidOnline, setHasPaidOnline] = useState(false);
  const [receiptChargeId, setReceiptChargeId] = useState<number | null>(null);
  // "Pagar tudo": the open charges still to pay, one payment each (they may go to different receivers).
  const [payQueue, setPayQueue] = useState<number[]>([]);
  const [ownerNotice, setOwnerNotice] = useState("");
  const hasBalance = useModuleEnabled("expenses");
  const hasConsumption = useModuleEnabled("consumption");

  useEffect(() => {
    // Forget the router state, so a refresh does not open the payment again.
    if ((location.state as BillsLocationState)?.payChargeId) navigate(location.pathname, { replace: true, state: null });
  }, [location.state, location.pathname, navigate]);

  useEffect(() => {
    let isMounted = true;

    Promise.all([getMyCharges(), getMyAgreements().catch(() => [] as AgreementResponse[])])
      .then(([charges, agreements]) => ({ charges, agreements, errorMessage: "" }))
      .catch((error) => ({ charges: [], agreements: [], errorMessage: error instanceof Error ? error.message : "Não foi possível carregar seus boletos." }))
      .then((result) => {
        if (isMounted) setLoaded(result);
      });

    return () => {
      isMounted = false;
    };
  }, [reloadKey]);

  const isLoading = !loaded;
  // /api/my/charges brings every condominium of the user: show the active one.
  const charges = useMemo(
    () => (loaded?.charges ?? []).filter((charge) => !activeCondominiumId || charge.condominiumId === activeCondominiumId),
    [loaded, activeCondominiumId],
  );
  const activeAgreements = (loaded?.agreements ?? []).filter(
    (agreement) => agreement.status === AGREEMENT_STATUS.active && (!activeCondominiumId || agreement.condominiumId === activeCondominiumId),
  );
  const openCharges = charges.filter(isOpenCharge);
  // Paid, cancelled or in an agreement: folded away, newest first.
  const pastCharges = charges.filter((charge) => !isOpenCharge(charge)).sort((a, b) => b.dueDate.localeCompare(a.dueDate));
  const hasOverdue = openCharges.some((charge) => charge.status === CHARGE_STATUS.overdue);
  const selectedCharge = charges.find((charge) => charge.id === selectedChargeId);
  // Without Mercado Pago the payment is a Pix to the condominium's key plus a receipt.
  const payingCharge = (loaded?.charges ?? []).find((charge) => charge.id === payingChargeId);
  const paysByPix = charges.length > 0 && !charges[0].onlinePaymentAvailable;
  const openTotal = openCharges.reduce((total, charge) => total + amountDue(charge), 0);


  function pay(charge: ChargeResponse) {
    // The owner's rent is paid online to the owner; never to the condominium's Pix key.
    if (charge.receiverPersonId && !charge.onlinePaymentAvailable) {
      setOwnerNotice(`O pagamento online de ${charge.description} está indisponível agora. Fale com ${charge.receiverName ?? "o proprietário"}.`);
      return;
    }
    setOwnerNotice("");
    setHasPaidOnline(false);
    setPayingChargeId(charge.id);
  }

  function payAll() {
    const [first, ...rest] = sortBills(openCharges).map((charge) => charge.id);
    setPayQueue(rest);
    setHasPaidOnline(false);
    setPayingChargeId(first);
  }

  function closePayment() {
    // Paid (or receipt sent) and more in the queue: open the next one right away.
    if (hasPaidOnline && payQueue.length > 0) {
      const [next, ...rest] = payQueue;
      setPayQueue(rest);
      setHasPaidOnline(false);
      setPayingChargeId(next);
      setReloadKey((key) => key + 1);
      return;
    }

    setPayQueue([]);
    setPayingChargeId(null);
    // Reload only after closing, so the payer sees the confirmation first.
    if (hasPaidOnline) {
      setSelectedChargeId(null);
      setReloadKey((key) => key + 1);
    }
  }

  return (
    <>
      <PageHeader overline={["Financeiro", activeCondominium?.condominiumName].filter(Boolean).join(" · ")} title="Minhas contas" />

      {condominiums.length > 1 && (
        <SelectField
          label="Condomínio"
          className="mb-6 lg:hidden"
          value={activeCondominiumId ?? ""}
          onChange={(event) => setActiveCondominiumId(Number(event.target.value))}
          options={condominiums.map((condominium) => ({ value: String(condominium.condominiumId), label: condominium.condominiumName }))}
        />
      )}

      {ownerNotice && (
        <p role="alert" className="mb-6 rounded-field bg-ambar-suave px-4 py-3 text-sm font-medium text-tinta">
          {ownerNotice}
        </p>
      )}

      {loaded?.errorMessage && (
        <p role="alert" className="mb-6 rounded-field bg-vermelho-suave px-4 py-3 text-sm font-medium text-vermelho">
          {loaded.errorMessage}
        </p>
      )}

      {/* What is due now, in one number, and one button to pay it all. */}
      <section className="rounded-card bg-superficie p-5 shadow-whisper sm:p-6">
        {isLoading ? (
          <p className="py-6 text-center text-sm text-tinta-suave">Carregando…</p>
        ) : openCharges.length === 0 ? (
          <div className="flex items-center gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-verde-suave text-verde-tinta">
              <Check size={20} strokeWidth={2} aria-hidden />
            </span>
            <div>
              <p className="font-semibold text-tinta">Tudo em dia</p>
              <p className="text-sm text-tinta-suave">Nenhuma conta para pagar agora.</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm text-tinta-suave">A pagar agora</p>
              <p className={`font-display text-[36px] font-bold leading-none tabular-nums ${hasOverdue ? "text-vermelho" : "text-tinta"}`}>{formatCurrency(openTotal)}</p>
              <p className="mt-1 text-[13px] text-tinta-suave">
                {openCharges.length === 1 ? "1 conta" : `${openCharges.length} contas`}
                {hasOverdue ? " · com atraso" : ""}
              </p>
            </div>
            <Button variant="accent" onClick={openCharges.length === 1 ? () => pay(openCharges[0]) : payAll}>
              {openCharges.length === 1 ? "Pagar" : "Pagar tudo"}
            </Button>
          </div>
        )}
      </section>

      {sortBills(openCharges).length > 0 && (
        <ul className="mt-4 flex flex-col gap-3">
          {sortBills(openCharges).map((charge) => {
            const isOverdue = charge.status === CHARGE_STATUS.overdue;
            return (
              <li key={charge.id} className="rounded-card bg-superficie p-5 shadow-whisper">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-[15px] font-semibold text-tinta">{charge.description}</p>
                    <p className="text-[13px] text-tinta-suave">Para {charge.receiverName ?? charge.condominiumName}</p>
                    <p className={`text-[13px] ${isOverdue ? "font-semibold text-vermelho" : "text-tinta-suave"}`}>
                      {isOverdue ? "Venceu" : "Vence"} {formatCalendarDate(charge.dueDate)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`text-lg font-bold tabular-nums ${isOverdue ? "text-vermelho" : "text-tinta"}`}>{formatCurrency(amountDue(charge))}</p>
                    {isOverdue && hasLateFees(charge) && <p className="text-xs tabular-nums text-tinta-suave">com multa e juros</p>}
                  </div>
                </div>
                {charge.items?.length > 0 && (
                  <ul className="mt-3 divide-y divide-linha border-y border-linha text-sm">
                    {charge.items.map((item) => (
                      <li key={item.id} className="flex justify-between gap-3 py-1.5">
                        <span className="min-w-0 truncate text-tinta-suave">{item.description}</span>
                        <span className="tabular-nums text-tinta">{formatCurrency(item.amount)}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {proofState(charge) && (
                  <div className="mt-3">
                    <PaymentProofChip charge={charge} />
                  </div>
                )}
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => pay(charge)}>
                    Pagar
                  </Button>
                  <Button variant="quiet" size="sm" onClick={() => setSelectedChargeId(charge.id)}>
                    Detalhes
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {activeAgreements.map((agreement) => (
        <AgreementCard key={agreement.id} agreement={agreement} />
      ))}

      {pastCharges.length > 0 && (
        <details className="mt-6 rounded-card bg-superficie shadow-whisper">
          <summary className="flex cursor-pointer items-center justify-between px-5 py-4 text-[15px] font-semibold text-tinta">
            Contas pagas
            <span className="text-sm font-normal tabular-nums text-tinta-suave">{pastCharges.length}</span>
          </summary>
          <ul className="divide-y divide-linha border-t border-linha">
            {pastCharges.map((charge) => (
              <li key={charge.id}>
                <button
                  type="button"
                  onClick={() => setSelectedChargeId(charge.id)}
                  className="flex w-full items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-campo/60"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-tinta">{charge.description}</span>
                    <span className="block text-[13px] text-tinta-suave">
                      Para {charge.receiverName ?? charge.condominiumName} · {formatCalendarDate(charge.dueDate)}
                    </span>
                  </span>
                  <span className="text-right">
                    <span className="block text-sm tabular-nums text-tinta">{formatCurrency(charge.value)}</span>
                    <span className="mt-0.5 flex justify-end">
                      <ChargeStatusChip status={charge.status} />
                    </span>
                  </span>
                  <ChevronRight size={16} strokeWidth={1.8} aria-hidden className="shrink-0 text-tinta-suave" />
                </button>
              </li>
            ))}
          </ul>
        </details>
      )}

      <p className="mt-6 px-1 text-[13px] text-tinta-suave">
        {paysByPix
          ? "O condomínio recebe por Pix: pague pela chave no app do seu banco e envie o comprovante. A gestão confere e dá baixa."
          : "Pague com Pix ou cartão pelo app. Com Pix, a conta fica paga em instantes."}
      </p>

      {hasConsumption && <ConsumptionCard />}

      {hasBalance && (
        <Link to="/resident/balance" className="mt-4 flex items-center justify-between gap-3 rounded-card bg-superficie px-5 py-4 shadow-whisper transition-colors hover:bg-campo/60">
          <span>
            <span className="block text-[15px] font-semibold text-tinta">Prestação de contas</span>
            <span className="block text-[13px] text-tinta-suave">Quanto o condomínio recebeu e gastou em cada mês</span>
          </span>
          <ChevronRight size={18} strokeWidth={1.8} aria-hidden className="shrink-0 text-tinta-suave" />
        </Link>
      )}

      {selectedCharge && !payingChargeId && !receiptChargeId && (
        <ChargeDetailsModal
          charge={selectedCharge}
          place={billPlace(selectedCharge)}
          onClose={() => setSelectedChargeId(null)}
          extra={
            proofState(selectedCharge) ? (
              <p className={`mt-4 rounded-field px-4 py-3 text-sm ${proofState(selectedCharge) === "sent" ? "bg-verde-suave text-verde-tinta" : "bg-vermelho-suave text-vermelho"}`}>
                {proofState(selectedCharge) === "sent" ? (
                  "Comprovante enviado. A gestão vai conferir e dar baixa."
                ) : (
                  <>
                    <span className="font-semibold">Comprovante recusado:</span> {selectedCharge.latestProofRejectionReason || "sem motivo informado"}
                  </>
                )}
              </p>
            ) : undefined
          }
          footer={
            selectedCharge.status === CHARGE_STATUS.paid ? (
              <Button variant="quiet" onClick={() => setReceiptChargeId(selectedCharge.id)}>
                Ver comprovante
              </Button>
            ) : isOpenCharge(selectedCharge) ? (
              <Button variant="accent" onClick={() => pay(selectedCharge)}>
                {selectedCharge.onlinePaymentAvailable ? "Pagar com Pix ou cartão" : "Pagar com Pix"}
              </Button>
            ) : undefined
          }
        />
      )}

      {receiptChargeId && <ChargeReceiptModal chargeId={receiptChargeId} onClose={() => setReceiptChargeId(null)} />}

      {payingCharge &&
        (payingCharge.onlinePaymentAvailable ? (
          <MercadoPagoPaymentModal key={payingCharge.id} chargeId={payingCharge.id} onPaid={() => setHasPaidOnline(true)} onClose={closePayment} />
        ) : (
          <PixPaymentModal key={payingCharge.id} charge={payingCharge} onSent={() => setHasPaidOnline(true)} onClose={closePayment} />
        ))}
    </>
  );
}
