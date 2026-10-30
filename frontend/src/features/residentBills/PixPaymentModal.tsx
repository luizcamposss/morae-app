import { useEffect, useId, useState, type DragEvent } from "react";
import { CircleCheck, Copy, FileCheck, FileUp, X } from "lucide-react";
import { Button } from "../../shared/components/Button";
import { Modal } from "../../shared/components/Modal";
import { TextAreaField } from "../../shared/components/TextAreaField";
import { formatCurrency } from "../../shared/lib/currency";
import { formatFileSize } from "../documents/documentMeta";
import { PROOF_ACCEPT, PROOF_NOTE_MAX, proofState, validateProofFile } from "../charges/paymentProof";
import { getChargePixInfo, sendPaymentProof } from "../charges/paymentProofService";
import { displayPixKey, pixKeyTypeLabels } from "../financialAccounts/pixKey";
import type { ChargePixInfo, ChargeResponse } from "../charges/types";

type PixPaymentModalProps = {
  charge: ChargeResponse;
  onSent: () => void;
  onClose: () => void;
};

type LoadedPix = { info: ChargePixInfo | null; errorMessage: string };

// Condominium without Mercado Pago: the resident pays to the Pix key in their bank app and
// sends the receipt; the management checks it and settles the charge.
export function PixPaymentModal({ charge, onSent, onClose }: PixPaymentModalProps) {
  const fileInputId = useId();
  const [loaded, setLoaded] = useState<LoadedPix | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [note, setNote] = useState("");
  const [fileError, setFileError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const state = proofState(charge);

  useEffect(() => {
    let isMounted = true;

    getChargePixInfo(charge.id)
      .then((info) => ({ info, errorMessage: "" }))
      .catch((error) => ({ info: null, errorMessage: error instanceof Error ? error.message : "Não foi possível carregar a chave Pix." }))
      .then((result) => {
        if (isMounted) setLoaded(result);
      });

    return () => {
      isMounted = false;
    };
  }, [charge.id]);

  const info = loaded?.info;

  async function copyKey() {
    if (!info) return;
    try {
      await navigator.clipboard.writeText(info.pixKey);
      setIsCopied(true);
      window.setTimeout(() => setIsCopied(false), 2000);
    } catch {
      setIsCopied(false);
    }
  }

  function pickFile(picked?: File) {
    if (!picked) return;
    const error = validateProofFile(picked);
    setFileError(error);
    setSubmitError("");
    if (!error) setFile(picked);
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setIsDragging(false);
    pickFile(event.dataTransfer.files?.[0]);
  }

  async function send() {
    if (!file) {
      setFileError("Escolha o arquivo do comprovante.");
      return;
    }

    try {
      setIsSending(true);
      setSubmitError("");
      await sendPaymentProof(charge.id, file, note);
      setIsSent(true);
      onSent();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Não foi possível enviar o comprovante.");
    } finally {
      setIsSending(false);
    }
  }

  const canUpload = !isSent && state !== "sent";

  return (
    <Modal
      title="Pagar com Pix"
      description={charge.description}
      onClose={onClose}
      footer={
        canUpload && info ? (
          <>
            <Button variant="quiet" onClick={onClose}>
              Fechar
            </Button>
            <Button variant="accent" onClick={() => void send()} isLoading={isSending} loadingText="Enviando…">
              Enviar comprovante
            </Button>
          </>
        ) : (
          <Button variant="quiet" onClick={onClose}>
            Fechar
          </Button>
        )
      }
    >
      {!loaded ? (
        <div className="h-40 animate-pulse rounded-block bg-campo" aria-label="Carregando chave Pix" />
      ) : !info ? (
        <p role="alert" className="rounded-field bg-vermelho-suave px-4 py-3 text-sm font-medium text-vermelho">
          {loaded.errorMessage}
        </p>
      ) : isSent ? (
        <div className="flex flex-col items-center px-2 py-4 text-center">
          <span aria-hidden className="grid size-12 place-items-center rounded-full bg-verde-suave text-verde-tinta">
            <CircleCheck size={24} strokeWidth={1.8} />
          </span>
          <h3 className="mt-3 font-display text-[19px] font-bold text-tinta">Comprovante enviado</h3>
          <p className="mt-1 max-w-sm text-sm text-tinta-suave">A gestão vai conferir o Pix e dar baixa na cobrança. Você recebe um aviso aqui no Moraê.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          <section aria-label="Dados do Pix">
            <p className="text-[13px] font-semibold text-tinta-suave">Valor a pagar hoje</p>
            <p className="mt-1 font-display text-[32px] font-bold leading-none tracking-[-0.015em] tabular-nums text-tinta">{formatCurrency(info.amount)}</p>

            <div className="mt-4 rounded-block bg-campo p-4">
              <p className="text-xs font-semibold text-tinta-suave">Chave Pix{pixKeyTypeLabels[info.pixKeyType] ? ` (${pixKeyTypeLabels[info.pixKeyType]})` : ""} · {info.holderName || info.condominiumName}</p>
              <div className="mt-1.5 flex items-center gap-3">
                <p className="min-w-0 flex-1 text-[15px] font-semibold text-tinta [overflow-wrap:anywhere]">{displayPixKey(info.pixKeyType, info.pixKey)}</p>
                <Button size="sm" variant={isCopied ? "accent" : "primary"} onClick={() => void copyKey()} className="shrink-0">
                  {isCopied ? <CircleCheck size={16} strokeWidth={2} aria-hidden /> : <Copy size={16} strokeWidth={2} aria-hidden />}
                  {isCopied ? "Copiada" : "Copiar"}
                </Button>
              </div>
            </div>
            <p className="mt-2 text-[13px] text-tinta-suave">No app do seu banco, escolha Pix, cole a chave e confira o valor e o nome do recebedor.</p>
          </section>

          {state === "sent" ? (
            <p className="flex items-start gap-2 rounded-field bg-verde-suave px-4 py-3 text-sm text-verde-tinta">
              <FileCheck size={18} strokeWidth={1.8} aria-hidden className="mt-0.5 shrink-0" />
              Você já enviou o comprovante. A gestão vai conferir e dar baixa.
            </p>
          ) : (
            <section aria-labelledby={`${fileInputId}-title`} className="flex flex-col gap-3 border-t border-linha pt-5">
              <div>
                <h3 id={`${fileInputId}-title`} className="text-[15px] font-semibold text-tinta">
                  Depois de pagar, envie o comprovante
                </h3>
                <p className="text-[13px] text-tinta-suave">A gestão confere e dá baixa. Sem o comprovante, a cobrança continua em aberto.</p>
              </div>

              {state === "rejected" && (
                <p className="rounded-field bg-vermelho-suave px-4 py-3 text-sm text-vermelho">
                  <span className="font-semibold">Comprovante recusado:</span> {charge.latestProofRejectionReason || "sem motivo informado"}. Envie outro.
                </p>
              )}

              {file ? (
                <div className="flex items-center gap-3 rounded-field bg-campo px-4 py-3">
                  <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-[9px] bg-superficie text-tinta shadow-whisper">
                    <FileCheck size={18} strokeWidth={1.8} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-tinta">{file.name}</span>
                    <span className="block text-[13px] tabular-nums text-tinta-suave">{formatFileSize(file.size)}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setFile(null)}
                    aria-label="Trocar arquivo"
                    className="grid size-9 shrink-0 place-items-center rounded-full text-tinta-suave transition-colors hover:bg-menu hover:text-tinta"
                  >
                    <X size={18} strokeWidth={1.8} aria-hidden />
                  </button>
                </div>
              ) : (
                <label
                  htmlFor={fileInputId}
                  onDragOver={(event) => {
                    event.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  className={`flex cursor-pointer flex-col items-center rounded-field border-2 border-dashed px-4 py-6 text-center transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-verde ${
                    fileError ? "border-vermelho bg-vermelho-suave/40" : isDragging ? "border-verde bg-verde-suave" : "border-linha bg-campo hover:bg-menu"
                  }`}
                >
                  <span className="grid size-10 place-items-center rounded-block bg-superficie text-tinta shadow-whisper">
                    <FileUp size={19} strokeWidth={1.8} aria-hidden />
                  </span>
                  <span className="mt-3 text-sm font-semibold text-tinta">Escolha o comprovante ou arraste até aqui</span>
                  <span className="mt-0.5 text-[13px] text-tinta-suave">PDF, JPG ou PNG · até 10 MB</span>
                  <input
                    id={fileInputId}
                    type="file"
                    accept={PROOF_ACCEPT}
                    className="sr-only"
                    onChange={(event) => {
                      pickFile(event.target.files?.[0]);
                      event.target.value = "";
                    }}
                  />
                </label>
              )}
              {fileError && <p className="text-[13px] font-medium text-vermelho">{fileError}</p>}

              <TextAreaField
                label="Observação (opcional)"
                rows={2}
                maxLength={PROOF_NOTE_MAX}
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Ex.: paguei pelo app do banco às 10h"
              />

              {submitError && (
                <p role="alert" className="rounded-field bg-vermelho-suave px-4 py-3 text-sm font-medium text-vermelho">
                  {submitError}
                </p>
              )}
            </section>
          )}
        </div>
      )}
    </Modal>
  );
}
