import { useEffect, useState } from "react";
import { Download, FileText } from "lucide-react";
import { Button } from "../../shared/components/Button";
import { TextAreaField } from "../../shared/components/TextAreaField";
import { formatDateTime } from "../../shared/lib/date";
import { PAYMENT_PROOF_STATUS, PROOF_NOTE_MAX } from "../charges/paymentProof";
import { downloadPaymentProof, getPaymentProofBlob, getPaymentProofs, rejectPaymentProof } from "../charges/paymentProofService";
import type { PaymentProof } from "../charges/types";

type PaymentProofsPanelProps = {
  chargeId: number;
  // Open charge and the user may settle it: shows "Recusar" on the pending receipt.
  canReview: boolean;
  onRejected: () => void;
};

type LoadedProofs = { proofs: PaymentProof[]; errorMessage: string };

const statusChip: Record<PaymentProof["status"], { label: string; tone: string }> = {
  1: { label: "Aguardando conferência", tone: "bg-ambar-suave text-ambar" },
  2: { label: "Aceito", tone: "bg-verde-suave text-verde-tinta" },
  3: { label: "Recusado", tone: "bg-vermelho-suave text-vermelho" },
};

// Pix receipts sent by the payer, inside the charge details. Accepting = "Dar baixa" in the footer.
export function PaymentProofsPanel({ chargeId, canReview, onRejected }: PaymentProofsPanelProps) {
  const [loaded, setLoaded] = useState<LoadedProofs | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState("");
  const [isRejecting, setIsRejecting] = useState(false);
  const [actionError, setActionError] = useState("");

  useEffect(() => {
    let isMounted = true;

    getPaymentProofs(chargeId)
      .then((proofs) => ({ proofs, errorMessage: "" }))
      .catch((error) => ({ proofs: [], errorMessage: error instanceof Error ? error.message : "Não foi possível carregar os comprovantes." }))
      .then((result) => {
        if (isMounted) setLoaded(result);
      });

    return () => {
      isMounted = false;
    };
  }, [chargeId, reloadKey]);

  async function reject(proof: PaymentProof) {
    if (!reason.trim()) {
      setReasonError("Informe o motivo da recusa. O morador vai ver essa mensagem.");
      return;
    }

    try {
      setIsRejecting(true);
      setActionError("");
      await rejectPaymentProof(proof.id, reason.trim());
      setRejectingId(null);
      setReason("");
      setReloadKey((key) => key + 1);
      onRejected();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Não foi possível recusar o comprovante.");
    } finally {
      setIsRejecting(false);
    }
  }

  async function download(proof: PaymentProof) {
    try {
      setActionError("");
      await downloadPaymentProof(proof);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Não foi possível baixar o comprovante.");
    }
  }

  if (!loaded) return <div className="mt-4 h-24 animate-pulse rounded-block bg-campo" aria-label="Carregando comprovantes" />;

  return (
    <section aria-label="Comprovantes de Pix" className="mt-4">
      <h3 className="text-sm font-semibold text-tinta">Comprovantes de Pix</h3>
      {loaded.errorMessage && <p className="mt-2 text-sm font-medium text-vermelho">{loaded.errorMessage}</p>}
      {actionError && (
        <p role="alert" className="mt-2 rounded-field bg-vermelho-suave px-4 py-3 text-sm font-medium text-vermelho">
          {actionError}
        </p>
      )}

      <ul className="mt-2 flex flex-col gap-2">
        {loaded.proofs.map((proof) => {
          const chip = statusChip[proof.status];
          const isPending = proof.status === PAYMENT_PROOF_STATUS.pending;
          return (
            <li key={proof.id} className="rounded-block bg-campo p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className={`rounded-chip px-2 py-0.5 text-xs font-semibold ${chip.tone}`}>{chip.label}</span>
                <span className="text-xs tabular-nums text-tinta-suave">{formatDateTime(proof.createdAt)}</span>
              </div>
              <p className="mt-2 text-[13px] text-tinta-suave">
                Enviado por <span className="font-semibold text-tinta">{proof.uploadedByName}</span>
              </p>
              {proof.note && <p className="mt-1 text-sm text-tinta [overflow-wrap:anywhere]">“{proof.note}”</p>}

              {isPending && proof.contentType.startsWith("image/") && <ProofImage proofId={proof.id} fileName={proof.fileName} />}

              <button
                type="button"
                onClick={() => void download(proof)}
                className="mt-3 flex w-full items-center gap-3 rounded-field bg-superficie px-3 py-2.5 text-left shadow-whisper transition-colors hover:bg-menu"
              >
                <FileText size={18} strokeWidth={1.8} aria-hidden className="shrink-0 text-tinta-suave" />
                <span className="min-w-0 flex-1 truncate text-sm font-semibold text-tinta">{proof.fileName}</span>
                <Download size={17} strokeWidth={1.8} aria-hidden className="shrink-0 text-tinta-suave" />
                <span className="sr-only">Baixar</span>
              </button>

              {proof.status === PAYMENT_PROOF_STATUS.rejected && (
                <p className="mt-2 text-[13px] text-vermelho">
                  <span className="font-semibold">Motivo:</span> {proof.rejectionReason}
                  {proof.reviewedByName ? ` · ${proof.reviewedByName}` : ""}
                </p>
              )}
              {proof.status === PAYMENT_PROOF_STATUS.accepted && proof.reviewedByName && (
                <p className="mt-2 text-[13px] text-tinta-suave">Baixa por {proof.reviewedByName}{proof.reviewedAt ? ` em ${formatDateTime(proof.reviewedAt)}` : ""}</p>
              )}

              {isPending && canReview &&
                (rejectingId === proof.id ? (
                  <div className="mt-3 flex flex-col gap-3">
                    <TextAreaField
                      label="Motivo da recusa"
                      rows={2}
                      maxLength={PROOF_NOTE_MAX}
                      value={reason}
                      error={reasonError || undefined}
                      onChange={(event) => {
                        setReason(event.target.value);
                        setReasonError("");
                      }}
                      placeholder="Ex.: o valor do Pix é diferente do boleto"
                    />
                    <div className="flex justify-end gap-2">
                      <Button variant="quiet" size="sm" className="bg-superficie" onClick={() => setRejectingId(null)}>
                        Voltar
                      </Button>
                      <Button variant="danger" size="sm" isLoading={isRejecting} loadingText="Recusando…" onClick={() => void reject(proof)}>
                        Recusar comprovante
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-[13px] text-tinta-suave">Pix conferido? Use “Aceitar e dar baixa”.</p>
                    <button
                      type="button"
                      onClick={() => {
                        setRejectingId(proof.id);
                        setReason("");
                        setReasonError("");
                      }}
                      className="rounded-full px-2 text-sm font-semibold text-vermelho hover:underline"
                    >
                      Recusar
                    </button>
                  </div>
                ))}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

// Preview of an image receipt (the file is protected, so it comes as a blob).
function ProofImage({ proofId, fileName }: { proofId: number; fileName: string }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    let objectUrl: string | null = null;

    getPaymentProofBlob(proofId)
      .then((blob) => {
        objectUrl = URL.createObjectURL(blob);
        if (isMounted) setUrl(objectUrl);
      })
      .catch(() => undefined);

    return () => {
      isMounted = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [proofId]);

  if (!url) return null;

  return (
    <a href={url} target="_blank" rel="noreferrer" className="mt-3 block overflow-hidden rounded-field bg-superficie shadow-whisper">
      <img src={url} alt={`Comprovante ${fileName}`} className="max-h-64 w-full object-contain" />
    </a>
  );
}
