import { useState } from "react";
import { createMercadoPagoCheckout } from "./mercadoPagoService";
import { saveCheckoutReturnPath } from "./returnPath";

type PayWithMercadoPagoButtonProps = {
  chargeId: number;
  className?: string;
};

export function PayWithMercadoPagoButton({ chargeId, className = "" }: PayWithMercadoPagoButtonProps) {
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handlePay() {
    try {
      setIsRedirecting(true);
      setErrorMessage("");

      const checkout = await createMercadoPagoCheckout(chargeId);
      saveCheckoutReturnPath();
      window.location.assign(checkout.checkoutUrl);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível abrir o pagamento no Mercado Pago.",
      );
      setIsRedirecting(false);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={() => void handlePay()}
        disabled={isRedirecting}
        className={`h-9 cursor-pointer rounded-xl bg-[#0284C7] px-3 text-xs font-extrabold text-white shadow-sm shadow-[#0284C7]/25 transition hover:bg-[#075985] disabled:cursor-not-allowed disabled:bg-[#9CA3AF] ${className}`}
      >
        {isRedirecting ? "Abrindo..." : "Pagar"}
      </button>
      {errorMessage && (
        <p role="alert" className="max-w-56 text-xs font-bold leading-5 text-[#B42318]">
          {errorMessage}
        </p>
      )}
    </div>
  );
}
