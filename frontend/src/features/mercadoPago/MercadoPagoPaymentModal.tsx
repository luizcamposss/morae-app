import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { initMercadoPago, Payment } from "@mercadopago/sdk-react";
import {
  createMercadoPagoPayment,
  getMercadoPagoPaymentSetup,
  getMercadoPagoPaymentStatus,
} from "./mercadoPagoService";
import type { MercadoPagoPaymentResult, MercadoPagoPaymentSetup } from "./types";

type MercadoPagoPaymentModalProps = {
  chargeId: number;
  onClose: () => void;
  // Called once when the charge becomes paid.
  onPaid: () => void;
};

type View = "loading" | "error" | "form" | "result";

const PIX_STATUS_POLL_INTERVAL_MS = 5000;
const CHARGE_STATUS_PAID = 2;

export function MercadoPagoPaymentModal({ chargeId, onClose, onPaid }: MercadoPagoPaymentModalProps) {
  const [view, setView] = useState<View>("loading");
  const [setup, setSetup] = useState<MercadoPagoPaymentSetup | null>(null);
  const [result, setResult] = useState<MercadoPagoPaymentResult | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [submitError, setSubmitError] = useState("");
  const hasNotifiedPaid = useRef(false);

  useEffect(() => {
    let isMounted = true;

    getMercadoPagoPaymentSetup(chargeId)
      .then((loadedSetup) => {
        if (!isMounted) {
          return;
        }

        // The Brick must tokenize cards with the receiving account's public key.
        initMercadoPago(loadedSetup.publicKey, { locale: "pt-BR" });
        setSetup(loadedSetup);

        if (loadedSetup.pendingPayment) {
          setResult(loadedSetup.pendingPayment);
          setView("result");
        } else {
          setView("form");
        }
      })
      .catch((error: unknown) => {
        if (isMounted) {
          setErrorMessage(
            error instanceof Error ? error.message : "Não foi possível abrir o pagamento.",
          );
          setView("error");
        }
      });

    return () => {
      isMounted = false;
    };
  }, [chargeId]);

  const isPaid = result?.status === "approved" || result?.chargeStatus === CHARGE_STATUS_PAID;
  const isWaitingPix = Boolean(result?.pix) && !isPaid;

  useEffect(() => {
    if (isPaid && !hasNotifiedPaid.current) {
      hasNotifiedPaid.current = true;
      onPaid();
    }
  }, [isPaid, onPaid]);

  // A Pix is paid outside the platform; poll until the webhook settles the charge.
  useEffect(() => {
    if (!isWaitingPix) {
      return;
    }

    const interval = window.setInterval(() => {
      getMercadoPagoPaymentStatus(chargeId)
        .then((status) => {
          if (status.chargeStatus === CHARGE_STATUS_PAID) {
            setResult((current) =>
              current ? { ...current, status: "approved", chargeStatus: CHARGE_STATUS_PAID } : current,
            );
          }
        })
        .catch(() => {
          // Transient failures are fine: the next tick tries again.
        });
    }, PIX_STATUS_POLL_INTERVAL_MS);

    return () => window.clearInterval(interval);
  }, [chargeId, isWaitingPix]);

  // The payer's e-mail is not prefilled: the Brick then asks for it, so a login e-mail that
  // Mercado Pago rejects never leaves the payer stuck with a hidden, invalid field.
  const initialization = useMemo(() => ({ amount: setup?.amount ?? 0 }), [setup?.amount]);

  const customization = useMemo(
    () => ({
      paymentMethods: {
        creditCard: "all" as const,
        debitCard: "all" as const,
        ticket: "all" as const,
        bankTransfer: "all" as const,
        // Condominium and platform fees are paid in a single installment.
        maxInstallments: 1,
      },
    }),
    [],
  );

  async function handleSubmit({ formData }: { formData: unknown }) {
    setSubmitError("");

    try {
      const paymentResult = await createMercadoPagoPayment(chargeId, formData);
      setResult(paymentResult);
      setView("result");
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "Não foi possível processar o pagamento.",
      );
    }
  }

  return (
    <ModalShell title="Pagar cobrança" onClose={onClose}>
      {setup && (
        <div className="mb-5 flex flex-col gap-1 rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] px-5 py-4">
          <p className="text-sm font-bold text-[#6B7280]">{setup.description}</p>
          <p className="text-2xl font-black text-[#111827]">{formatCurrency(setup.amount)}</p>
        </div>
      )}

      {view === "loading" && (
        <div className="h-64 animate-pulse rounded-2xl bg-[#F3F4F6]" aria-label="Carregando pagamento" />
      )}

      {view === "error" && <Alert tone="error">{errorMessage}</Alert>}

      {view === "form" && setup && (
        <div className="space-y-4">
          {submitError && <Alert tone="error">{submitError}</Alert>}
          <Payment
            initialization={initialization}
            customization={customization}
            onSubmit={handleSubmit}
            onError={(error) => {
              console.error("Mercado Pago Payment Brick error", error);
            }}
          />
        </div>
      )}

      {view === "result" && result && (
        <PaymentResultView
          result={result}
          isPaid={isPaid}
          onRetry={() => {
            setResult(null);
            setSubmitError("");
            setView("form");
          }}
          onClose={onClose}
        />
      )}
    </ModalShell>
  );
}

type PaymentResultViewProps = {
  result: MercadoPagoPaymentResult;
  isPaid: boolean;
  onRetry: () => void;
  onClose: () => void;
};

function PaymentResultView({ result, isPaid, onRetry, onClose }: PaymentResultViewProps) {
  if (isPaid) {
    return (
      <div className="space-y-5">
        <Alert tone="success">
          Pagamento aprovado! A cobrança já consta como paga.
        </Alert>
        <PrimaryButton onClick={onClose}>Fechar</PrimaryButton>
      </div>
    );
  }

  if (result.status === "rejected" || result.status === "cancelled") {
    return (
      <div className="space-y-5">
        <Alert tone="error">{getRejectionMessage(result.statusDetail)}</Alert>
        <PrimaryButton onClick={onRetry}>Tentar novamente</PrimaryButton>
      </div>
    );
  }

  if (result.pix) {
    return (
      <div className="space-y-5">
        <Alert tone="warning">
          Pague o Pix pelo app do seu banco. Esta tela atualiza sozinha quando o pagamento for
          confirmado.
        </Alert>

        {result.pix.qrCodeBase64 && (
          <img
            src={`data:image/png;base64,${result.pix.qrCodeBase64}`}
            alt="QR Code do Pix"
            className="mx-auto size-56 rounded-2xl border border-[#E5E7EB] bg-white p-2"
          />
        )}

        <CopyField label="Pix copia e cola" value={result.pix.qrCode} />

        {result.pix.expiresAt && (
          <p className="text-center text-xs font-bold text-[#6B7280]">
            Válido até {formatDateTime(result.pix.expiresAt)}
          </p>
        )}

        <SecondaryButton onClick={onRetry}>Pagar de outra forma</SecondaryButton>
      </div>
    );
  }

  if (result.boleto) {
    return (
      <div className="space-y-5">
        <Alert tone="warning">
          Boleto gerado. A compensação leva de 1 a 3 dias úteis; a cobrança será atualizada
          automaticamente depois disso.
        </Alert>

        <CopyField label="Linha digitável" value={result.boleto.digitableLine} />

        {result.boleto.expiresAt && (
          <p className="text-center text-xs font-bold text-[#6B7280]">
            Vence em {formatDate(result.boleto.expiresAt)}
          </p>
        )}

        <a
          href={result.boleto.url}
          target="_blank"
          rel="noreferrer"
          className="flex h-12 w-full items-center justify-center rounded-2xl bg-[#16A34A] text-sm font-extrabold text-white shadow-lg shadow-[#16A34A]/20 transition hover:bg-[#0B3D2E]"
        >
          Abrir boleto
        </a>

        <SecondaryButton onClick={onRetry}>Pagar de outra forma</SecondaryButton>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <Alert tone="warning">
        O pagamento está em análise pelo Mercado Pago. Você será notificado quando ele for
        aprovado ou recusado.
      </Alert>
      <PrimaryButton onClick={onClose}>Fechar</PrimaryButton>
    </div>
  );
}

function CopyField({ label, value }: { label: string; value: string }) {
  const [isCopied, setIsCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setIsCopied(true);
      window.setTimeout(() => setIsCopied(false), 2000);
    } catch {
      setIsCopied(false);
    }
  }

  return (
    <div className="rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] p-4">
      <p className="text-xs font-black uppercase tracking-[0.14em] text-[#6B7280]">{label}</p>
      <p className="mt-2 break-all font-mono text-xs font-bold text-[#111827]">{value}</p>
      <button
        type="button"
        onClick={() => void handleCopy()}
        className="mt-3 h-9 cursor-pointer rounded-xl border border-[#BBF7D0] bg-white px-3 text-xs font-extrabold text-[#16A34A] transition hover:bg-[#F0FDF4]"
      >
        {isCopied ? "Copiado!" : "Copiar"}
      </button>
    </div>
  );
}

function Alert({ tone, children }: { tone: "success" | "warning" | "error"; children: ReactNode }) {
  const styles = {
    success: "border-[#BBF7D0] bg-[#ECFDF5] text-[#065F46]",
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

function PrimaryButton({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="h-12 w-full cursor-pointer rounded-2xl bg-[#16A34A] text-sm font-extrabold text-white shadow-lg shadow-[#16A34A]/20 transition hover:bg-[#0B3D2E]"
    >
      {children}
    </button>
  );
}

function SecondaryButton({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="h-11 w-full cursor-pointer rounded-2xl border border-[#E5E7EB] bg-white text-sm font-black text-[#6B7280] transition hover:bg-[#F3F4F6] hover:text-[#111827]"
    >
      {children}
    </button>
  );
}

function ModalShell({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0B3D2E]/30 px-4 py-8 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="max-h-[calc(100vh-4rem)] w-full max-w-2xl overflow-y-auto rounded-[2rem] border border-[#E5E7EB] bg-white shadow-2xl shadow-[#0B3D2E]/20"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#E5E7EB] bg-white px-6 py-5">
          <h2 className="text-2xl font-black text-[#111827]">{title}</h2>

          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="flex size-10 cursor-pointer items-center justify-center rounded-full bg-[#F3F4F6] text-xl font-light text-[#6B7280] transition hover:bg-[#FDECEC] hover:text-[#B42318]"
          >
            ×
          </button>
        </div>

        <div className="px-5 py-6 sm:px-8">{children}</div>
      </div>
    </div>
  );
}

function getRejectionMessage(statusDetail: string) {
  const messages: Record<string, string> = {
    cc_rejected_insufficient_amount: "Saldo ou limite insuficiente no cartão.",
    cc_rejected_bad_filled_security_code: "O código de segurança do cartão está incorreto.",
    cc_rejected_bad_filled_date: "A data de validade do cartão está incorreta.",
    cc_rejected_bad_filled_card_number: "O número do cartão está incorreto.",
    cc_rejected_bad_filled_other: "Revise os dados do cartão e tente novamente.",
    cc_rejected_call_for_authorize: "O banco precisa autorizar este pagamento. Fale com o emissor do cartão.",
    cc_rejected_card_disabled: "O cartão está desativado. Ative-o com o emissor ou use outro.",
    cc_rejected_duplicated_payment: "Já existe um pagamento recente com este valor. Verifique antes de tentar de novo.",
    cc_rejected_high_risk: "O pagamento foi recusado por segurança. Use outra forma de pagamento.",
    cc_rejected_max_attempts: "Limite de tentativas atingido. Use outro cartão.",
  };

  return messages[statusDetail] ?? "O pagamento foi recusado. Tente outro cartão ou outra forma de pagamento.";
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR").format(new Date(value));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(
    new Date(value),
  );
}
