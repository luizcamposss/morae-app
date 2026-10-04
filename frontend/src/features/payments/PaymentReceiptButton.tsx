import { useState } from "react";
import { PaymentReceiptModal } from "./PaymentReceiptModal";

type PaymentReceiptButtonProps = {
  chargeId: number;
  onRefunded?: () => void;
  className?: string;
};

export function PaymentReceiptButton({ chargeId, onRefunded, className = "" }: PaymentReceiptButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [wasRefunded, setWasRefunded] = useState(false);

  // Reload the page's list only after closing, so the refund result stays visible.
  function handleClose() {
    setIsOpen(false);

    if (wasRefunded) {
      setWasRefunded(false);
      onRefunded?.();
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={`h-9 cursor-pointer rounded-xl border border-[#BBF7D0] bg-white px-3 text-xs font-extrabold text-[#16A34A] transition hover:bg-[#F0FDF4] hover:text-[#0B3D2E] ${className}`}
      >
        Comprovante
      </button>

      {isOpen && (
        <PaymentReceiptModal
          chargeId={chargeId}
          onClose={handleClose}
          onRefunded={() => setWasRefunded(true)}
        />
      )}
    </>
  );
}
