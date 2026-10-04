import { useState } from "react";
import { MercadoPagoPaymentModal } from "./MercadoPagoPaymentModal";

type PayWithMercadoPagoButtonProps = {
  chargeId: number;
  onPaid: () => void;
  className?: string;
};

export function PayWithMercadoPagoButton({
  chargeId,
  onPaid,
  className = "",
}: PayWithMercadoPagoButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [hasPaid, setHasPaid] = useState(false);

  // The page reloads its list only after the modal closes: reloading while it is open would
  // unmount this row (and the modal with it) before the payer sees the confirmation.
  function handleClose() {
    setIsOpen(false);

    if (hasPaid) {
      setHasPaid(false);
      onPaid();
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={`h-9 cursor-pointer rounded-xl bg-[#0284C7] px-3 text-xs font-extrabold text-white shadow-sm shadow-[#0284C7]/25 transition hover:bg-[#075985] ${className}`}
      >
        Pagar
      </button>

      {isOpen && (
        <MercadoPagoPaymentModal
          chargeId={chargeId}
          onClose={handleClose}
          onPaid={() => setHasPaid(true)}
        />
      )}
    </>
  );
}
