import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ChevronRight } from "lucide-react";
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
import { ChargeCategoryChip } from "../charges/ChargeCategoryChip";
import { PaymentProofChip } from "../charges/PaymentProofChip";
import { proofState } from "../charges/paymentProof";
import { CHARGE_STATUS } from "../charges/platformRevenue";
import type { ChargeResponse } from "../charges/types";
import { ChargeStatusChip, ChargeStatusTile } from "../masterPayments/ChargeStatus";
import { MercadoPagoPaymentModal } from "../mercadoPago/MercadoPagoPaymentModal";
import { ConsumptionCard } from "../consumption/ConsumptionCard";
import { useModuleEnabled } from "../modules/modules";
import { AgreementCard } from "./AgreementCard";
import { NextChargeCard } from "./NextChargeCard";
import { PixPaymentModal } from "./PixPaymentModal";
import { billPlace, billsTabs, filterBills, nextOpenCharge, sortBills, type BillsLocationState, type BillsTab } from "./residentBills";

type LoadedBills = { charges: ChargeResponse[]; agreements: AgreementResponse[]; errorMessage: string };

// Boletos of the resident: what is open (with fine and interest), paying in the app and receipts.
export function ResidentBillsPage() {
  const { activeCondominium, activeCondominiumId, condominiums, setActiveCondominiumId } = useCondominium();
  const location = useLocation();
  const navigate = useNavigate();
  const [loaded, setLoaded] = useState<LoadedBills | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [tab, setTab] = useState<BillsTab>("open");
  const [selectedChargeId, setSelectedChargeId] = useState<number | null>(null);
  // The Início sends the charge to pay in the router state.
  const [payingChargeId, setPayingChargeId] = useState<number | null>(() => (location.state as BillsLocationState)?.payChargeId ?? null);
  const [hasPaidOnline, setHasPaidOnline] = useState(false);
  const [receiptChargeId, setReceiptChargeId] = useState<number | null>(null);
  // "Pagar tudo": the open charges still to pay, one payment each (they may go to different receivers).
  const [payQueue, setPayQueue] = useState<number[]>([]);
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
  const nextCharge = nextOpenCharge(charges);
  const visibleCharges = sortBills(filterBills(charges, tab));
  const selectedCharge = charges.find((charge) => charge.id === selectedChargeId);
  // Without Mercado Pago the payment is a Pix to the condominium's key plus a receipt.
  const payingCharge = (loaded?.charges ?? []).find((charge) => charge.id === payingChargeId);
  const paysByPix = charges.length > 0 && !charges[0].onlinePaymentAvailable;
  const openTotal = openCharges.reduce((total, charge) => total + amountDue(charge), 0);

  function countFor(key: BillsTab) {
    return filterBills(charges, key).length;
  }

  function pay(charge: ChargeResponse) {
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

      {loaded?.errorMessage && (
        <p role="alert" className="mb-6 rounded-field bg-vermelho-suave px-4 py-3 text-sm font-medium text-vermelho">
          {loaded.errorMessage}
        </p>
      )}

      <NextChargeCard charge={nextCharge} isLoading={isLoading} otherOpenCount={Math.max(openCharges.length - 1, 0)} onPay={pay} onDetails={(charge) => setSelectedChargeId(charge.id)} />

      {openCharges.length > 1 && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 px-1">
          <p className="text-[13px] text-tinta-suave">
            Total em aberto hoje: <span className="font-semibold tabular-nums text-tinta">{formatCurrency(openTotal)}</span> em {openCharges.length} contas
          </p>
          <Button size="sm" onClick={payAll}>
            Pagar tudo
          </Button>
        </div>
      )}

      {activeAgreements.map((agreement) => (
        <AgreementCard key={agreement.id} agreement={agreement} />
      ))}

      <div className="-mx-4 mb-4 mt-8 overflow-x-auto px-4 [scrollbar-width:none] lg:mx-0 lg:px-0">
        <div role="tablist" aria-label="Situação das contas" className="inline-flex gap-1">
          {billsTabs.map((item) => (
            <button
              key={item.key}
              type="button"
              role="tab"
              aria-selected={tab === item.key}
              onClick={() => setTab(item.key)}
              className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors ${
                tab === item.key ? "bg-tinta text-white" : "text-tinta-suave hover:bg-menu hover:text-tinta"
              }`}
            >
              {item.label}
              <span className={`text-xs font-medium tabular-nums ${tab === item.key ? "text-white/75" : "text-tinta-suave"}`}>{isLoading ? "" : countFor(item.key)}</span>
            </button>
          ))}
        </div>
      </div>

      <ul className="divide-y divide-linha overflow-hidden rounded-card bg-superficie shadow-whisper">
        {visibleCharges.length === 0 ? (
          <li className="px-5 py-10 text-center text-sm text-tinta-suave">
            {isLoading ? "Carregando…" : tab === "open" ? "Nenhum boleto em aberto." : tab === "paid" ? "Nenhum boleto pago ainda." : "Nenhum boleto por aqui."}
          </li>
        ) : (
          visibleCharges.map((charge) => {
            const isOverdue = charge.status === CHARGE_STATUS.overdue;
            return (
              <li key={charge.id}>
                <button
                  type="button"
                  onClick={() => setSelectedChargeId(charge.id)}
                  className="flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-campo/60"
                >
                  <ChargeStatusTile status={charge.status} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-semibold text-tinta">{charge.description}</span>
                    <span className="block truncate text-[13px] text-tinta-suave">
                      {billPlace(charge)} · {isOverdue ? "venceu" : isOpenCharge(charge) ? "vence" : "vencimento"} {formatCalendarDate(charge.dueDate)}
                    </span>
                    <span className="mt-1.5 flex flex-wrap gap-1.5">
                      <ChargeCategoryChip category={charge.category} />
                      {proofState(charge) && <PaymentProofChip charge={charge} />}
                    </span>
                  </span>
                  <span className="text-right">
                    <span className={`block text-sm font-semibold tabular-nums ${isOverdue ? "text-vermelho" : "text-tinta"}`}>{formatCurrency(amountDue(charge))}</span>
                    {isOverdue && hasLateFees(charge) ? (
                      <span className="block text-xs tabular-nums text-tinta-suave">orig. {formatCurrency(charge.value)}</span>
                    ) : (
                      <span className="mt-1 flex justify-end">
                        <ChargeStatusChip status={charge.status} />
                      </span>
                    )}
                  </span>
                  <ChevronRight size={18} strokeWidth={1.8} aria-hidden className="shrink-0 text-tinta-suave" />
                </button>
              </li>
            );
          })
        )}
      </ul>

      <p className="mt-6 px-1 text-[13px] text-tinta-suave">
        {paysByPix
          ? "O condomínio recebe por Pix: pague pela chave no app do seu banco e envie o comprovante. A gestão confere e dá baixa."
          : "O pagamento é feito pelo Mercado Pago, direto para a conta do condomínio. Com Pix, a baixa acontece sozinha em instantes."}
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
