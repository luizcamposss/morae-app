import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { initMercadoPago, Payment } from "@mercadopago/sdk-react";
import { CircleCheck, Copy, ExternalLink, Lock } from "lucide-react";
import { Button, ButtonLink } from "../../shared/components/Button";
import { Modal } from "../../shared/components/Modal";
import { formatCurrency } from "../../shared/lib/currency";
import {
  createMercadoPagoPayment,
  getMercadoPagoPaymentSetup,
  getMercadoPagoPaymentStatus,
} from "./mercadoPagoService";
import type { MercadoPagoPaymentResult, MercadoPagoPaymentSetup } from "./types";
import { formatDate, formatDateTime } from "../../shared/lib/date";

type MercadoPagoPaymentModalProps = {
  chargeId: number;
  onClose: () => void;
  // Called once when the charge becomes paid.
  onPaid: () => void;
};

type View = "loading" | "error" | "form" | "result";

const PIX_STATUS_POLL_INTERVAL_MS = 5000;
const CHARGE_STATUS_PAID = 2;
// Same face as the app, also inside the Brick's secure card fields.
const BRICK_FONT_URL = "https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@500;600&display=swap";

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
      visual: {
        font: BRICK_FONT_URL,
        style: { theme: "flat" as const, customVariables: brickStyleVariables() },
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

  function retry() {
    setResult(null);
    setSubmitError("");
    setView("form");
  }

  return (
    <Modal
      title="Pagar cobrança"
      description={setup?.description}
      onClose={onClose}
      footer={
        view === "result" && result ? (
          <ResultActions result={result} isPaid={isPaid} onRetry={retry} onClose={onClose} />
        ) : undefined
      }
    >
      {setup && (
        <div className="mb-5 flex items-baseline justify-between gap-4 border-b border-linha pb-4">
          <p className="text-[15px] text-tinta-suave">Total</p>
          <p className="font-display text-[32px] font-bold leading-none tracking-[-0.015em] tabular-nums text-tinta">
            {formatCurrency(setup.amount)}
          </p>
        </div>
      )}

      {view === "loading" && <div className="h-64 animate-pulse rounded-block bg-campo" aria-label="Carregando pagamento" />}

      {view === "error" && <ErrorNotice>{errorMessage}</ErrorNotice>}

      {view === "form" && setup && (
        <div className="flex flex-col gap-4">
          {submitError && <ErrorNotice>{submitError}</ErrorNotice>}
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

      {view === "result" && result && <PaymentResultView result={result} isPaid={isPaid} />}

      {setup && (
        <p className="mt-5 flex items-center gap-2 text-[13px] text-tinta-suave">
          <Lock size={14} strokeWidth={1.8} aria-hidden className="shrink-0" />
          Pagamento processado pelo Mercado Pago
        </p>
      )}
    </Modal>
  );
}

type ResultProps = {
  result: MercadoPagoPaymentResult;
  isPaid: boolean;
};

function isRejected(result: MercadoPagoPaymentResult) {
  return result.status === "rejected" || result.status === "cancelled";
}

function PaymentResultView({ result, isPaid }: ResultProps) {
  if (isPaid) {
    return (
      <div role="status" className="flex flex-col items-center px-2 py-4 text-center">
        <span aria-hidden className="grid size-12 place-items-center rounded-full bg-verde-suave text-verde-tinta">
          <CircleCheck size={24} strokeWidth={1.8} />
        </span>
        <h3 className="mt-3 font-display text-[19px] font-bold text-tinta">Pagamento aprovado</h3>
        <p className="mt-1 max-w-sm text-sm text-tinta-suave">A cobrança já consta como paga.</p>
      </div>
    );
  }

  if (isRejected(result)) {
    return <ErrorNotice>{getRejectionMessage(result.statusDetail)}</ErrorNotice>;
  }

  if (result.pix) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex flex-col items-center gap-5 rounded-block bg-campo p-4 sm:flex-row sm:items-start">
          {result.pix.qrCodeBase64 && (
            <img
              src={`data:image/png;base64,${result.pix.qrCodeBase64}`}
              alt="QR Code do Pix"
              className="size-44 shrink-0 rounded-field bg-superficie p-2"
            />
          )}
          <div className="flex w-full min-w-0 flex-col gap-3">
            {result.pix.qrCodeBase64 ? (
              <div>
                <h3 className="text-[15px] font-semibold text-tinta">Escaneie o QR Code no app do seu banco</h3>
                <p className="mt-1 text-[13px] text-tinta-suave">Ou copie o código abaixo e cole na opção Pix copia e cola.</p>
              </div>
            ) : (
              <h3 className="text-[15px] font-semibold text-tinta">Copie o código e cole na opção Pix copia e cola do seu banco</h3>
            )}
            <CopyField label="Pix copia e cola" value={result.pix.qrCode} />
            {result.pix.expiresAt && (
              <p className="text-[13px] tabular-nums text-tinta-suave">Válido até {formatDateTime(result.pix.expiresAt)}</p>
            )}
          </div>
        </div>

        <Waiting>Pague o Pix pelo app do seu banco. Esta tela atualiza sozinha quando o pagamento for confirmado.</Waiting>
      </div>
    );
  }

  if (result.boleto) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2 rounded-block bg-campo p-4">
          <CopyField label="Linha digitável" value={result.boleto.digitableLine} />
          {result.boleto.expiresAt && (
            <p className="text-[13px] tabular-nums text-tinta-suave">Vence em {formatDate(result.boleto.expiresAt)}</p>
          )}
        </div>
        <Waiting>
          Boleto gerado. A compensação leva de 1 a 3 dias úteis; a cobrança será atualizada automaticamente depois disso.
        </Waiting>
      </div>
    );
  }

  return (
    <Waiting>
      O pagamento está em análise pelo Mercado Pago. Você será notificado quando ele for aprovado ou recusado.
    </Waiting>
  );
}

function ResultActions({ result, isPaid, onRetry, onClose }: ResultProps & { onRetry: () => void; onClose: () => void }) {
  if (isPaid) {
    return <Button onClick={onClose}>Fechar</Button>;
  }

  if (isRejected(result)) {
    return <Button onClick={onRetry}>Tentar novamente</Button>;
  }

  if (result.pix || result.boleto) {
    return (
      <>
        <Button variant="quiet" onClick={onRetry}>
          Pagar de outra forma
        </Button>
        {result.boleto && (
          // An absolute URL: the router renders a plain link to Mercado Pago.
          <ButtonLink variant="accent" to={result.boleto.url} target="_blank" rel="noreferrer">
            <ExternalLink size={17} strokeWidth={1.8} aria-hidden />
            Abrir boleto
          </ButtonLink>
        )}
      </>
    );
  }

  return <Button onClick={onClose}>Fechar</Button>;
}

// The payment exists but is not settled yet.
function Waiting({ children }: { children: ReactNode }) {
  return (
    <p role="status" className="flex items-start gap-2.5 rounded-field bg-ambar-suave px-4 py-3 text-sm text-tinta">
      <span aria-hidden className="mt-[7px] size-2 shrink-0 rounded-full bg-ambar motion-safe:animate-pulse" />
      {children}
    </p>
  );
}

function ErrorNotice({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="rounded-field bg-vermelho-suave px-4 py-3 text-sm font-medium text-vermelho">
      {children}
    </p>
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
    <div className="rounded-field bg-superficie py-3 pl-4 pr-3">
      <p className="text-xs font-semibold text-tinta-suave">{label}</p>
      <div className="mt-1 flex items-center gap-3">
        <p className="line-clamp-2 min-w-0 flex-1 text-[13px] font-medium text-tinta [overflow-wrap:anywhere]" title={value}>
          {value}
        </p>
        <Button size="sm" variant={isCopied ? "accent" : "primary"} onClick={() => void handleCopy()} className="shrink-0">
          {isCopied ? <CircleCheck size={16} strokeWidth={2} aria-hidden /> : <Copy size={16} strokeWidth={2} aria-hidden />}
          {isCopied ? "Copiado" : "Copiar"}
        </Button>
      </div>
    </div>
  );
}

// The Brick takes plain CSS values, so they are read from the design tokens instead of repeating hex codes.
function brickStyleVariables() {
  const styles = getComputedStyle(document.documentElement);
  const token = (name: string) => styles.getPropertyValue(`--color-${name}`).trim();

  return {
    textPrimaryColor: token("tinta"),
    textSecondaryColor: token("tinta-suave"),
    inputBackgroundColor: token("campo"),
    formBackgroundColor: token("superficie"),
    baseColor: token("tinta"),
    baseColorFirstVariant: token("tinta-forte"),
    baseColorSecondVariant: token("menu"),
    errorColor: token("vermelho"),
    successColor: token("verde"),
    outlinePrimaryColor: token("verde"),
    outlineSecondaryColor: token("linha"),
    buttonTextColor: token("superficie"),
    fontSizeExtraSmall: "12px",
    fontSizeSmall: "13px",
    fontSizeMedium: "15px",
    fontSizeLarge: "17px",
    fontSizeExtraLarge: "21px",
    fontWeightNormal: "500",
    fontWeightSemiBold: "600",
    inputVerticalPadding: "13px",
    inputHorizontalPadding: "16px",
    inputFocusedBoxShadow: `0 0 0 2px ${token("verde")}`,
    inputErrorFocusedBoxShadow: `0 0 0 2px ${token("vermelho")}`,
    borderRadiusSmall: "6px",
    borderRadiusMedium: "10px",
    borderRadiusLarge: "14px",
    borderRadiusFull: "999px",
    formPadding: "0px",
  };
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
