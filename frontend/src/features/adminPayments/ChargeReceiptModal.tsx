import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Printer } from "lucide-react";
import { Button } from "../../shared/components/Button";
import { Modal } from "../../shared/components/Modal";
import { formatCurrency } from "../../shared/lib/currency";
import { formatDateTime } from "../../shared/lib/date";
import { refundMercadoPagoPayment } from "../mercadoPago/mercadoPagoService";
import { getPaymentReceipt } from "../payments/paymentService";
import { paymentMethodLabels, type PaymentReceipt } from "../payments/types";

type ChargeReceiptModalProps = {
  chargeId: number;
  onClose: () => void;
  // Called once after a refund, so the page reloads its list when the modal closes.
  onRefunded: () => void;
};

function receiptRows(receipt: PaymentReceipt): Array<[string, string]> {
  const rows: Array<[string, string]> = [["Cobrança", receipt.description], ["Condomínio", receipt.condominiumName]];
  if (receipt.unitLabel) rows.push(["Unidade", receipt.unitLabel]);
  rows.push(
    ["Recebedor", receipt.receiverName],
    ["Forma de pagamento", paymentMethodLabels[receipt.paymentMethod] ?? "Outro"],
    ["Registrado por", receipt.registeredByName],
  );
  if (receipt.mercadoPagoPaymentId) rows.push(["ID Mercado Pago", String(receipt.mercadoPagoPaymentId)]);
  rows.push(["Código da cobrança", `#${receipt.chargeId}`]);
  return rows;
}

// The receipt itself: shown in the modal and, on print, alone on the page.
function ReceiptBody({ receipt }: { receipt: PaymentReceipt }) {
  return (
    <div>
      <p className="text-sm text-tinta-suave">Valor pago</p>
      <p className="mt-1 font-display text-[32px] font-bold leading-none tabular-nums text-tinta">{formatCurrency(receipt.amountPaid)}</p>
      <p className="mt-2 text-[13px] text-tinta-suave">Pago em {formatDateTime(receipt.paidAt)}</p>

      {receipt.lateFeesPaid > 0 && (
        <dl className="mt-4 divide-y divide-linha rounded-block bg-campo px-4 text-sm print:bg-transparent print:px-0">
          <div className="flex justify-between py-2">
            <dt className="text-tinta-suave">Valor original</dt>
            <dd className="tabular-nums text-tinta">{formatCurrency(receipt.originalValue)}</dd>
          </div>
          <div className="flex justify-between py-2">
            <dt className="text-tinta-suave">Multa e juros</dt>
            <dd className="tabular-nums text-tinta">+ {formatCurrency(receipt.lateFeesPaid)}</dd>
          </div>
        </dl>
      )}

      <dl className="mt-4 divide-y divide-linha text-sm">
        {receiptRows(receipt).map(([label, value]) => (
          <div key={label} className="flex justify-between gap-4 py-2.5">
            <dt className="text-tinta-suave">{label}</dt>
            <dd className="text-right font-semibold text-tinta [overflow-wrap:anywhere]">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

// Payment receipt with print/PDF (browser print of the receipt area) and the Mercado Pago refund.
export function ChargeReceiptModal({ chargeId, onClose, onRefunded }: ChargeReceiptModalProps) {
  const [receipt, setReceipt] = useState<PaymentReceipt | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [isConfirmingRefund, setIsConfirmingRefund] = useState(false);
  const [isRefunding, setIsRefunding] = useState(false);
  const [isRefunded, setIsRefunded] = useState(false);

  useEffect(() => {
    let isMounted = true;

    getPaymentReceipt(chargeId)
      .then((result) => isMounted && setReceipt(result))
      .catch((error) => isMounted && setErrorMessage(error instanceof Error ? error.message : "Não foi possível carregar o comprovante."));

    return () => {
      isMounted = false;
    };
  }, [chargeId]);

  async function handleRefund() {
    try {
      setIsRefunding(true);
      setErrorMessage("");
      await refundMercadoPagoPayment(chargeId);
      setIsRefunded(true);
      setIsConfirmingRefund(false);
      onRefunded();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Não foi possível estornar o pagamento.");
    } finally {
      setIsRefunding(false);
    }
  }

  const canRefund = Boolean(receipt?.canRefund) && !isRefunded;

  return (
    <Modal
      title="Comprovante"
      description={receipt ? `Cobrança #${receipt.chargeId}` : undefined}
      onClose={onClose}
      footer={
        receipt && !isRefunded ? (
          <>
            {canRefund && !isConfirmingRefund && (
              <button type="button" onClick={() => setIsConfirmingRefund(true)} className="mr-auto rounded-full px-2 text-sm font-semibold text-vermelho hover:underline">
                Estornar
              </button>
            )}
            <Button onClick={() => window.print()}>
              <Printer size={17} strokeWidth={1.8} aria-hidden />
              Imprimir ou salvar PDF
            </Button>
          </>
        ) : undefined
      }
    >
      {errorMessage && <p role="alert" className="mb-4 rounded-field bg-vermelho-suave px-4 py-3 text-sm font-medium text-vermelho">{errorMessage}</p>}
      {!receipt && !errorMessage && <div className="h-56 animate-pulse rounded-block bg-campo" aria-label="Carregando comprovante" />}

      {receipt && (
        <>
          {isRefunded && (
            <p role="status" className="mb-4 rounded-field bg-ambar-suave px-4 py-3 text-sm font-medium text-tinta">
              Pagamento estornado. O valor volta para quem pagou e a cobrança ficou em aberto de novo.
            </p>
          )}

          <div id="charge-receipt">
            <ReceiptBody receipt={receipt} />
          </div>

          {isConfirmingRefund && (
            <div className="mt-4 rounded-block bg-vermelho-suave px-4 py-4">
              <p className="text-sm text-tinta">
                {formatCurrency(receipt.amountPaid)} voltam inteiros para quem pagou, pelo Mercado Pago, e a cobrança fica em aberto de novo. Não dá para desfazer.
              </p>
              <div className="mt-3 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button variant="quiet" size="sm" onClick={() => setIsConfirmingRefund(false)} disabled={isRefunding}>
                  Manter pagamento
                </Button>
                <Button variant="danger" size="sm" onClick={() => void handleRefund()} isLoading={isRefunding} loadingText="Estornando…">
                  Confirmar estorno
                </Button>
              </div>
            </div>
          )}

          {/* Print-only copy outside the app root: on paper only the receipt shows. */}
          {createPortal(
            <div id="charge-receipt-print" className="hidden p-10 text-tinta print:block">
              <style>{"@media print { body > *:not(#charge-receipt-print) { display: none !important; } }"}</style>
              <p className="text-xs font-bold tracking-[0.2em] text-verde">MORAÊ</p>
              <h1 className="mb-6 mt-1 font-display text-xl font-bold">Comprovante de pagamento</h1>
              <ReceiptBody receipt={receipt} />
              <p className="mt-8 text-xs text-tinta-suave">Emitido em {formatDateTime(new Date().toISOString())}</p>
            </div>,
            document.body,
          )}
        </>
      )}
    </Modal>
  );
}
