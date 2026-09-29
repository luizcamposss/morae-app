import { useEffect, useState, type ReactNode } from "react";
import { refundMercadoPagoPayment } from "../mercadoPago/mercadoPagoService";
import { getPaymentReceipt } from "./paymentService";
import { paymentMethodLabels, type PaymentReceipt } from "./types";
import { formatDateTime } from "../../shared/lib/date";

type PaymentReceiptModalProps = {
  chargeId: number;
  onClose: () => void;
  // Called once after a refund, so the page can reload its list when the modal closes.
  onRefunded: () => void;
};

export function PaymentReceiptModal({ chargeId, onClose, onRefunded }: PaymentReceiptModalProps) {
  const [receipt, setReceipt] = useState<PaymentReceipt | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [isConfirmingRefund, setIsConfirmingRefund] = useState(false);
  const [isRefunding, setIsRefunding] = useState(false);
  const [refundError, setRefundError] = useState("");
  const [isRefunded, setIsRefunded] = useState(false);

  useEffect(() => {
    let isMounted = true;

    getPaymentReceipt(chargeId)
      .then((result) => {
        if (isMounted) {
          setReceipt(result);
        }
      })
      .catch((error: unknown) => {
        if (isMounted) {
          setErrorMessage(
            error instanceof Error ? error.message : "Não foi possível carregar o comprovante.",
          );
        }
      });

    return () => {
      isMounted = false;
    };
  }, [chargeId]);

  async function handleRefund() {
    try {
      setIsRefunding(true);
      setRefundError("");
      await refundMercadoPagoPayment(chargeId);
      setIsRefunded(true);
      setIsConfirmingRefund(false);
      onRefunded();
    } catch (error) {
      setRefundError(error instanceof Error ? error.message : "Não foi possível estornar o pagamento.");
    } finally {
      setIsRefunding(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0B3D2E]/30 px-4 py-8 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Comprovante de pagamento"
        className="max-h-[calc(100vh-4rem)] w-full max-w-xl overflow-y-auto rounded-[2rem] border border-[#E5E7EB] bg-white shadow-2xl shadow-[#0B3D2E]/20"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#E5E7EB] bg-white px-6 py-5">
          <h2 className="text-2xl font-black text-[#111827]">Comprovante</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="flex size-10 cursor-pointer items-center justify-center rounded-full bg-[#F3F4F6] text-xl font-light text-[#6B7280] transition hover:bg-[#FDECEC] hover:text-[#B42318]"
          >
            ×
          </button>
        </div>

        <div className="space-y-5 px-5 py-6 sm:px-8">
          {errorMessage && <Alert tone="error">{errorMessage}</Alert>}

          {!receipt && !errorMessage && (
            <div className="h-64 animate-pulse rounded-2xl bg-[#F3F4F6]" aria-label="Carregando comprovante" />
          )}

          {receipt && (
            <>
              {isRefunded ? (
                <Alert tone="warning">
                  Pagamento estornado. O valor volta para quem pagou e a cobrança ficou em aberto novamente.
                </Alert>
              ) : (
                <div className="rounded-2xl border border-[#BBF7D0] bg-[#ECFDF5] px-5 py-4">
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-[#065F46]">Pago</p>
                  <p className="mt-1 text-3xl font-black text-[#111827]">{formatCurrency(receipt.amountPaid)}</p>
                  <p className="mt-1 text-sm font-semibold text-[#065F46]">{formatDateTime(receipt.paidAt)}</p>
                </div>
              )}

              <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {getReceiptRows(receipt).map(([label, value]) => (
                  <div key={label} className="rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] px-4 py-3">
                    <dt className="text-xs font-black uppercase tracking-[0.14em] text-[#6B7280]">{label}</dt>
                    <dd className="mt-1 break-words text-sm font-black text-[#111827]">{value}</dd>
                  </div>
                ))}
              </dl>

              {!isRefunded && (
                <button
                  type="button"
                  onClick={() => printReceipt(receipt)}
                  className="h-12 w-full cursor-pointer rounded-2xl bg-[#16A34A] text-sm font-extrabold text-white shadow-lg shadow-[#16A34A]/20 transition hover:bg-[#0B3D2E]"
                >
                  Imprimir / salvar PDF
                </button>
              )}

              {receipt.canRefund && !isRefunded && !isConfirmingRefund && (
                <button
                  type="button"
                  onClick={() => setIsConfirmingRefund(true)}
                  className="h-11 w-full cursor-pointer rounded-2xl border border-[#FECACA] bg-white text-sm font-black text-[#B42318] transition hover:bg-[#FDECEC]"
                >
                  Estornar pagamento
                </button>
              )}

              {isConfirmingRefund && (
                <div className="space-y-3 rounded-2xl border border-[#FECACA] bg-[#FFF5F5] px-4 py-4">
                  <p className="text-sm font-bold leading-6 text-[#7A271A]">
                    O valor de {formatCurrency(receipt.amountPaid)} será devolvido integralmente a quem pagou,
                    pelo Mercado Pago, e a cobrança voltará a ficar em aberto. Esta ação não pode ser desfeita.
                  </p>
                  {refundError && <Alert tone="error">{refundError}</Alert>}
                  <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        setIsConfirmingRefund(false);
                        setRefundError("");
                      }}
                      disabled={isRefunding}
                      className="h-10 cursor-pointer rounded-xl border border-[#E5E7EB] bg-white px-4 text-sm font-black text-[#6B7280] transition hover:bg-[#F3F4F6] disabled:cursor-not-allowed"
                    >
                      Manter pagamento
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleRefund()}
                      disabled={isRefunding}
                      className="h-10 cursor-pointer rounded-xl bg-[#B42318] px-4 text-sm font-black text-white transition hover:bg-[#7A271A] disabled:cursor-not-allowed disabled:bg-[#9CA3AF]"
                    >
                      {isRefunding ? "Estornando..." : "Confirmar estorno"}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function getReceiptRows(receipt: PaymentReceipt): [string, string][] {
  const rows: [string, string][] = [
    ["Cobrança", receipt.description],
    ["Condomínio", receipt.condominiumName],
  ];

  if (receipt.unitLabel) {
    rows.push(["Unidade", receipt.unitLabel]);
  }

  rows.push(
    ["Recebedor", receipt.receiverName],
    ["Forma de pagamento", paymentMethodLabels[receipt.paymentMethod] ?? "Outro"],
    ["Registrado por", receipt.registeredByName],
  );

  if (receipt.mercadoPagoPaymentId) {
    rows.push(["ID Mercado Pago", receipt.mercadoPagoPaymentId.toString()]);
  }

  rows.push(["Código da cobrança", `#${receipt.chargeId}`]);

  return rows;
}

// Prints from a standalone window so only the receipt ends up on paper/PDF.
function printReceipt(receipt: PaymentReceipt) {
  const printWindow = window.open("", "_blank", "width=720,height=900");

  if (!printWindow) {
    return;
  }

  const rows = getReceiptRows(receipt)
    .map(([label, value]) => `<tr><th>${escapeHtml(label)}</th><td>${escapeHtml(value)}</td></tr>`)
    .join("");

  printWindow.document.write(`<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<title>Comprovante MORAÊ #${receipt.chargeId}</title>
<style>
  body { font-family: system-ui, sans-serif; color: #111827; margin: 40px; }
  h1 { font-size: 20px; margin: 0; } .brand { color: #16A34A; font-weight: 800; letter-spacing: .2em; font-size: 12px; }
  .amount { font-size: 32px; font-weight: 800; margin: 24px 0 4px; } .muted { color: #6B7280; }
  table { width: 100%; border-collapse: collapse; margin-top: 24px; }
  th, td { text-align: left; padding: 10px 0; border-bottom: 1px solid #E5E7EB; font-size: 14px; }
  th { color: #6B7280; font-weight: 600; width: 45%; }
</style>
</head>
<body>
  <p class="brand">MORAÊ</p>
  <h1>Comprovante de pagamento</h1>
  <p class="amount">${escapeHtml(formatCurrency(receipt.amountPaid))}</p>
  <p class="muted">Pago em ${escapeHtml(formatDateTime(receipt.paidAt))}</p>
  <table>${rows}</table>
  <p class="muted" style="margin-top:32px;font-size:12px">Emitido em ${escapeHtml(formatDateTime(new Date().toISOString()))}</p>
</body>
</html>`);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function Alert({ tone, children }: { tone: "warning" | "error"; children: ReactNode }) {
  const styles = {
    warning: "border-[#FDE68A] bg-[#FFFBEB] text-[#92400E]",
    error: "border-[#FECACA] bg-[#FDECEC] text-[#B42318]",
  };

  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={`rounded-2xl border px-4 py-3 text-sm font-bold leading-6 ${styles[tone]}`}
    >
      {children}
    </div>
  );
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

