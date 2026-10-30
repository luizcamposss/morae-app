import { useState } from "react";
import { Button } from "../../shared/components/Button";
import { ChargeReceiptModal } from "../adminPayments/ChargeReceiptModal";

type PaymentReceiptButtonProps = {
  chargeId: number;
  onRefunded?: () => void;
};

export function PaymentReceiptButton({ chargeId, onRefunded }: PaymentReceiptButtonProps) {
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
      <Button variant="quiet" onClick={() => setIsOpen(true)}>
        Comprovante
      </Button>

      {isOpen && (
        <ChargeReceiptModal
          chargeId={chargeId}
          onClose={handleClose}
          onRefunded={() => setWasRefunded(true)}
        />
      )}
    </>
  );
}
