import { useState } from "react";
import { Button } from "./Button";
import { Modal } from "./Modal";

export type ConfirmRequest = {
  title: string;
  description: string;
  confirmLabel: string;
  tone?: "default" | "danger";
  onConfirm: () => Promise<void> | void;
};

// Replaces window.confirm: explains the effect of the action before running it.
export function ConfirmDialog({ request, onClose }: { request: ConfirmRequest; onClose: () => void }) {
  const [isRunning, setIsRunning] = useState(false);

  async function handleConfirm() {
    setIsRunning(true);
    try {
      await request.onConfirm();
    } finally {
      setIsRunning(false);
      onClose();
    }
  }

  return (
    <Modal
      title={request.title}
      onClose={onClose}
      footer={
        <>
          <Button variant="quiet" onClick={onClose} disabled={isRunning}>
            Cancelar
          </Button>
          <Button
            onClick={() => void handleConfirm()}
            isLoading={isRunning}
            variant={request.tone === "danger" ? "danger" : "primary"}
          >
            {request.confirmLabel}
          </Button>
        </>
      }
    >
      <p className="text-[15px] leading-relaxed text-tinta-suave">{request.description}</p>
    </Modal>
  );
}
