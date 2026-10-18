import { useRef, useState } from "react";
import { Paperclip, X } from "lucide-react";
import { MoraeMark } from "../../shared/components/MoraeMark";
import { OptionAttachmentLink } from "../assemblies/AssemblyParts";
import { removeOptionAttachment, setOptionAttachment } from "../assemblies/assemblyService";
import type { AssemblyOptionResponse, AssemblyResponse } from "../assemblies/types";
import { ACCEPT_ATTRIBUTE, formatFileSize, validateFile } from "../documents/documentMeta";

type Props = {
  option: AssemblyOptionResponse;
  onChanged: (assembly: AssemblyResponse, message: string) => void;
  onError: (message: string) => void;
};

// Attach, replace or remove the file of one option while the assembly is a draft.
export function OptionAttachmentControl({ option, onChanged, onError }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isBusy, setIsBusy] = useState(false);

  function run(action: () => Promise<AssemblyResponse>, message: string, fallbackError: string) {
    setIsBusy(true);
    action()
      .then((assembly) => onChanged(assembly, message))
      .catch((error) => onError(error instanceof Error ? error.message : fallbackError))
      .finally(() => setIsBusy(false));
  }

  function handleFile(file: File | undefined) {
    if (inputRef.current) inputRef.current.value = "";
    if (!file) return;

    const problem = validateFile(file);
    if (problem) {
      onError(problem);
      return;
    }

    run(
      () => setOptionAttachment(option.id, file),
      option.hasAttachment ? `Anexo de "${option.text}" trocado.` : `Arquivo anexado em "${option.text}".`,
      "Não foi possível enviar o anexo.",
    );
  }

  const actionClass =
    "inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-field px-2 text-[13px] font-semibold transition-colors disabled:cursor-progress disabled:opacity-60";

  return (
    <span className="flex max-w-full flex-wrap items-center justify-end gap-1">
      <input ref={inputRef} type="file" accept={ACCEPT_ATTRIBUTE} className="sr-only" tabIndex={-1} aria-hidden onChange={(event) => handleFile(event.target.files?.[0])} />
      {option.hasAttachment && (
        <span className="flex min-w-0 items-center">
          <OptionAttachmentLink optionId={option.id} fileName={option.attachmentFileName} />
          <span className="min-w-0 truncate text-xs font-normal text-tinta-suave max-sm:hidden" title={option.attachmentFileName ?? undefined}>
            {option.attachmentFileName}
            {option.attachmentSizeBytes ? ` · ${formatFileSize(option.attachmentSizeBytes)}` : ""}
          </span>
        </span>
      )}
      {isBusy ? (
        <span className="grid size-9 place-items-center" aria-label="Enviando…">
          <MoraeMark size={16} motion="respiro" />
        </span>
      ) : (
        <>
          <button type="button" onClick={() => inputRef.current?.click()} className={`${actionClass} text-tinta hover:bg-menu`}>
            {!option.hasAttachment && <Paperclip size={14} strokeWidth={2} aria-hidden />}
            {option.hasAttachment ? "Trocar" : "Anexar"}
          </button>
          {option.hasAttachment && (
            <button
              type="button"
              onClick={() => run(() => removeOptionAttachment(option.id), `Anexo de "${option.text}" removido.`, "Não foi possível remover o anexo.")}
              aria-label={`Remover o anexo de ${option.text}`}
              className={`${actionClass} text-vermelho hover:bg-vermelho-suave`}
            >
              <X size={14} strokeWidth={2} aria-hidden />
              <span className="max-sm:sr-only">Remover</span>
            </button>
          )}
        </>
      )}
    </span>
  );
}
