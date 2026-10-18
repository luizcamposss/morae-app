import { useEffect, useState } from "react";
import { ArrowLeft, Download, FileText } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Button } from "../../shared/components/Button";
import { ConfirmDialog, type ConfirmRequest } from "../../shared/components/ConfirmDialog";
import { MoraeMark } from "../../shared/components/MoraeMark";
import { SummaryCard, type SummaryItem } from "../../shared/components/SummaryCard";
import { PageHeader } from "../../shared/layout/PageHeader";
import { formatDate, formatDateTime, formatTime } from "../../shared/lib/date";
import { ASSEMBLY_PHASE, VOTE_TYPE, assemblyTypeLabel, describeVoting, participationPercent, voterRuleLabel } from "../assemblies/assemblyMeta";
import { ItemCard, PhaseChip, ResultCard } from "../assemblies/AssemblyParts";
import {
  cancelAssembly,
  deleteAssembly,
  getAssembly,
  getAssemblyResults,
  publishAssembly,
  setAssemblyMinutes,
  updateAssembly,
} from "../assemblies/assemblyService";
import type { AssemblyOptionResponse, AssemblyResponse, AssemblyResults, SaveAssemblyRequest } from "../assemblies/types";
import { DOCUMENT_CATEGORY } from "../documents/documentMeta";
import { downloadDocument, getDocuments } from "../documents/documentService";
import type { DocumentResponse } from "../documents/types";
import { AssemblyFormModal, CancelAssemblyModal, MinutesModal } from "./AssemblyModals";
import { OptionAttachmentControl } from "./OptionAttachmentControl";

type Loaded = { id: number; assembly: AssemblyResponse | null; results: AssemblyResults | null; errorMessage: string };
type ModalKind = "edit" | "cancel" | "minutes" | null;

// Results exist from publication on; drafts and canceled assemblies have none.
function hasResults(assembly: AssemblyResponse) {
  return assembly.phase !== ASSEMBLY_PHASE.draft && assembly.phase !== ASSEMBLY_PHASE.canceled;
}

async function loadAssembly(id: number) {
  const assembly = await getAssembly(id);
  const results = hasResults(assembly) ? await getAssemblyResults(id) : null;
  // Asking for the results closes an assembly past its end, so the details are read again.
  const fresh = results?.isFinal && !assembly.closedAt ? await getAssembly(id) : assembly;
  return { assembly: fresh, results };
}

// One assembly for the management: edit and publish the draft, follow the participation,
// cancel, read the result and link the minutes. Also the target of notification links.
export function AdminAssemblyDetailPage() {
  const id = Number(useParams().id);
  const navigate = useNavigate();
  const [loaded, setLoaded] = useState<Loaded>({ id: 0, assembly: null, results: null, errorMessage: "" });
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [modal, setModal] = useState<ModalKind>(null);
  const [modalError, setModalError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmRequest, setConfirmRequest] = useState<ConfirmRequest | null>(null);
  const [minutesDocuments, setMinutesDocuments] = useState<DocumentResponse[] | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    let isMounted = true;

    loadAssembly(id)
      .then(({ assembly, results }) => isMounted && setLoaded({ id, assembly, results, errorMessage: "" }))
      .catch(
        (error) =>
          isMounted &&
          setLoaded({
            id,
            assembly: null,
            results: null,
            errorMessage: error instanceof Error ? error.message : "Não foi possível carregar a assembleia.",
          }),
      );

    return () => {
      isMounted = false;
    };
  }, [id]);

  const isLoading = loaded.id !== id;
  const assembly = isLoading ? null : loaded.assembly;
  const results = isLoading ? null : loaded.results;

  async function reload() {
    const next = await loadAssembly(id);
    setLoaded({ id, ...next, errorMessage: "" });
  }

  function clearMessages() {
    setErrorMessage("");
    setSuccessMessage("");
  }

  function openModal(kind: ModalKind) {
    clearMessages();
    setModalError("");
    setModal(kind);
  }

  // Runs a modal action: closes it and shows the message on success, keeps it open with the error otherwise.
  async function submitModal(action: () => Promise<unknown>, success: string, fallbackError: string) {
    setIsSubmitting(true);
    setModalError("");

    try {
      await action();
      await reload();
      setModal(null);
      setSuccessMessage(success);
    } catch (error) {
      setModalError(error instanceof Error ? error.message : fallbackError);
    } finally {
      setIsSubmitting(false);
    }
  }

  function openMinutes() {
    if (!assembly) return;
    openModal("minutes");
    setMinutesDocuments(null);
    getDocuments(assembly.condominiumId)
      .then((documents) => setMinutesDocuments(documents.filter((document) => document.category === DOCUMENT_CATEGORY.minutes)))
      .catch((error) => {
        setMinutesDocuments([]);
        setModalError(error instanceof Error ? error.message : "Não foi possível carregar as atas.");
      });
  }

  function askPublish(current: AssemblyResponse) {
    clearMessages();
    setConfirmRequest({
      title: "Publicar a assembleia?",
      description: `Quem vota recebe a convocação por notificação e e-mail. A votação abre em ${formatDateTime(current.votingStartsAt)}. Depois de publicada, datas e pautas não mudam mais.`,
      confirmLabel: "Publicar",
      onConfirm: async () => {
        try {
          await publishAssembly(current.id);
          await reload();
          setSuccessMessage("Assembleia publicada. A convocação foi enviada.");
        } catch (error) {
          setErrorMessage(error instanceof Error ? error.message : "Não foi possível publicar a assembleia.");
        }
      },
    });
  }

  function askDelete(current: AssemblyResponse) {
    clearMessages();
    setConfirmRequest({
      title: "Apagar o rascunho?",
      description: `"${current.title}" e as pautas saem do Moraê. Ninguém tinha visto ainda. Esta ação não pode ser desfeita.`,
      confirmLabel: "Apagar rascunho",
      tone: "danger",
      onConfirm: async () => {
        try {
          await deleteAssembly(current.id);
          navigate("..", { relative: "path" });
        } catch (error) {
          setErrorMessage(error instanceof Error ? error.message : "Não foi possível apagar o rascunho.");
        }
      },
    });
  }

  async function handleDownloadMinutes(documentId: number, title: string) {
    clearMessages();
    setIsDownloading(true);
    try {
      await downloadDocument({ id: documentId, fileName: title });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Não foi possível baixar a ata.");
    } finally {
      setIsDownloading(false);
    }
  }

  const backLink = (
    <Link to=".." relative="path" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-tinta-suave transition-colors hover:text-tinta">
      <ArrowLeft size={16} strokeWidth={2} aria-hidden />
      Assembleias
    </Link>
  );

  if (!assembly) {
    return (
      <>
        {backLink}
        <div className="flex flex-col items-center rounded-card bg-superficie px-5 py-12 text-center shadow-whisper">
          {isLoading ? (
            <span className="flex items-center gap-2 text-sm text-tinta-suave">
              <MoraeMark size={18} motion="respiro" />
              Carregando assembleia…
            </span>
          ) : (
            <span role="alert" className="text-sm text-tinta-suave">
              {loaded.errorMessage}
            </span>
          )}
        </div>
      </>
    );
  }

  const phase = assembly.phase;
  const isDraft = phase === ASSEMBLY_PHASE.draft;
  const isClosed = phase === ASSEMBLY_PHASE.closed;
  const canCancel = phase === ASSEMBLY_PHASE.scheduled || phase === ASSEMBLY_PHASE.open;
  const items = assembly.items ?? [];
  const eligible = results?.eligibleUnits ?? assembly.eligibleUnitsCount;
  const summary: SummaryItem[] = [
    results
      ? {
          label: "Participação",
          value: `${participationPercent(results.votedUnits, results.eligibleUnits)}%`,
          detail: `${results.votedUnits} de ${results.eligibleUnits} ${results.eligibleUnits === 1 ? "unidade apta" : "unidades aptas"}`,
          tone: phase === ASSEMBLY_PHASE.open ? "good" : "neutral",
        }
      : { label: "Unidades aptas", value: eligible == null ? "—" : String(eligible), detail: isDraft ? "Contadas ao publicar" : undefined },
    { label: "Pautas", value: String(items.length) },
    { label: "Votação abre", value: formatDate(assembly.votingStartsAt), detail: `às ${formatTime(assembly.votingStartsAt)}` },
    { label: "Votação fecha", value: formatDate(assembly.votingEndsAt), detail: `às ${formatTime(assembly.votingEndsAt)}` },
  ];
  const minutesId = results?.minutesDocumentId ?? assembly.minutesDocumentId;
  const hasMultipleChoice = items.some((item) => item.voteType === VOTE_TYPE.multipleChoice);

  // Attachments answer with the whole draft, so the page updates without reloading.
  function renderAttachmentControl(option: AssemblyOptionResponse) {
    return (
      <OptionAttachmentControl
        option={option}
        onChanged={(next, message) => {
          setLoaded({ id, assembly: next, results: null, errorMessage: "" });
          setErrorMessage("");
          setSuccessMessage(message);
        }}
        onError={(message) => {
          setSuccessMessage("");
          setErrorMessage(message);
        }}
      />
    );
  }

  return (
    <>
      {backLink}
      <PageHeader overline={`Assembleia ${assemblyTypeLabel(assembly.type).toLowerCase()} · ${describeVoting(assembly)}`} title={assembly.title}>
        {isDraft && (
          <>
            <Button variant="quiet" onClick={() => openModal("edit")} className="max-sm:hidden">
              Editar
            </Button>
            <Button variant="accent" onClick={() => askPublish(assembly)}>
              Publicar
            </Button>
          </>
        )}
      </PageHeader>

      {errorMessage && (
        <p role="alert" className="mb-6 rounded-field bg-vermelho-suave px-4 py-3 text-sm font-medium text-vermelho">
          {errorMessage}
        </p>
      )}
      {successMessage && (
        <p role="status" className="mb-6 rounded-field bg-verde-suave px-4 py-3 text-sm font-medium text-verde-tinta">
          {successMessage}
        </p>
      )}
      {phase === ASSEMBLY_PHASE.canceled && (
        <p className="mb-6 rounded-field bg-vermelho-suave px-4 py-3 text-sm text-vermelho">
          <span className="font-semibold">Cancelada em {formatDateTime(assembly.canceledAt)}.</span> {assembly.cancelReason}
        </p>
      )}

      <SummaryCard items={summary} label="Resumo da assembleia" />

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start">
        <section aria-labelledby="items-title">
          <div className="mb-3 flex items-baseline justify-between gap-3">
            <h2 id="items-title" className="font-display text-xl font-bold tracking-[-0.01em] text-tinta">
              {results?.isFinal ? "Resultado" : "Pautas"}
            </h2>
            {results && !results.isFinal && <span className="text-[13px] text-tinta-suave">Os votos só aparecem quando a votação fechar.</span>}
          </div>
          {isDraft && hasMultipleChoice && (
            <p className="mb-3 text-[13px] text-tinta-suave">
              Anexe um arquivo em cada opção, como o orçamento de cada empresa (PDF, JPG, PNG, Word ou Excel, até 20 MB). Quem vota abre o anexo na cédula. Se você mudar o texto de uma opção em Editar, o anexo dela sai.
            </p>
          )}
          <ol className="flex flex-col gap-3">
            {results?.isFinal
              ? results.items.map((item) => <ResultCard key={item.itemId} item={item} />)
              : items.map((item) => <ItemCard key={item.id} item={item} optionAction={isDraft ? renderAttachmentControl : undefined} />)}
          </ol>
        </section>

        <aside className="flex flex-col gap-4">
          <section className="rounded-card bg-superficie p-5 shadow-whisper">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-display text-[17px] font-bold text-tinta">Detalhes</h2>
              <PhaseChip phase={phase} />
            </div>
            <dl className="mt-3 divide-y divide-linha text-sm">
              {[
                ["Quem vota", voterRuleLabel(assembly.voterRule)],
                ["Reunião", assembly.meetingAt ? formatDateTime(assembly.meetingAt) : null],
                ["Local", assembly.meetingLocation],
                ["Criada por", assembly.createdByName],
                ["Publicada em", assembly.publishedAt ? formatDateTime(assembly.publishedAt) : null],
              ]
                .filter(([, value]) => value)
                .map(([label, value]) => (
                  <div key={label} className="flex justify-between gap-4 py-2.5">
                    <dt className="text-tinta-suave">{label}</dt>
                    <dd className="text-right font-medium text-tinta">{value}</dd>
                  </div>
                ))}
            </dl>
            {assembly.description && <p className="mt-3 whitespace-pre-line border-t border-linha pt-3 text-sm text-tinta-suave">{assembly.description}</p>}
          </section>

          {isClosed && (
            <section className="rounded-card bg-superficie p-5 shadow-whisper">
              <h2 className="font-display text-[17px] font-bold text-tinta">Ata</h2>
              {minutesId ? (
                <div className="mt-3 flex items-center gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-block bg-verde-suave text-verde-tinta">
                    <FileText size={18} strokeWidth={1.8} aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold text-tinta">{results?.minutesDocumentTitle ?? "Ata da assembleia"}</span>
                  <button
                    type="button"
                    onClick={() => void handleDownloadMinutes(minutesId, results?.minutesDocumentTitle ?? "ata")}
                    disabled={isDownloading}
                    aria-label="Baixar a ata"
                    className="grid size-10 shrink-0 place-items-center rounded-full text-tinta-suave transition-colors hover:bg-menu hover:text-tinta disabled:cursor-progress"
                  >
                    {isDownloading ? <MoraeMark size={18} motion="respiro" /> : <Download size={18} strokeWidth={1.8} aria-hidden />}
                  </button>
                </div>
              ) : (
                <p className="mt-1 text-sm text-tinta-suave">Ligue a ata para os moradores consultarem junto do resultado.</p>
              )}
              <Button variant="quiet" size="sm" className="mt-4" fullWidth onClick={openMinutes}>
                {minutesId ? "Trocar a ata" : "Ligar a ata"}
              </Button>
            </section>
          )}

          {(isDraft || canCancel) && (
            <div className="flex flex-col gap-2">
              {isDraft && (
                <Button variant="quiet" fullWidth onClick={() => openModal("edit")} className="sm:hidden">
                  Editar rascunho
                </Button>
              )}
              <button
                type="button"
                onClick={() => (isDraft ? askDelete(assembly) : openModal("cancel"))}
                className="min-h-11 rounded-field px-4 text-sm font-semibold text-vermelho transition-colors hover:bg-vermelho-suave"
              >
                {isDraft ? "Apagar rascunho" : "Cancelar assembleia"}
              </button>
            </div>
          )}
        </aside>
      </div>

      {modal === "edit" && (
        <AssemblyFormModal
          assembly={assembly}
          errorMessage={modalError}
          isSubmitting={isSubmitting}
          onClose={() => setModal(null)}
          onSubmit={(request: SaveAssemblyRequest) => submitModal(() => updateAssembly(assembly.id, request), "Rascunho salvo.", "Não foi possível salvar o rascunho.")}
        />
      )}
      {modal === "cancel" && (
        <CancelAssemblyModal
          assembly={assembly}
          errorMessage={modalError}
          isSubmitting={isSubmitting}
          onClose={() => setModal(null)}
          onSubmit={(reason) => submitModal(() => cancelAssembly(assembly.id, reason), "Assembleia cancelada. Todos foram avisados.", "Não foi possível cancelar.")}
        />
      )}
      {modal === "minutes" && (
        <MinutesModal
          currentId={minutesId}
          documents={minutesDocuments}
          errorMessage={modalError}
          isSubmitting={isSubmitting}
          onClose={() => setModal(null)}
          onSubmit={(documentId) =>
            submitModal(() => setAssemblyMinutes(assembly.id, documentId), documentId ? "Ata ligada à assembleia." : "Ata desligada.", "Não foi possível ligar a ata.")
          }
        />
      )}
      {confirmRequest && <ConfirmDialog request={confirmRequest} onClose={() => setConfirmRequest(null)} />}
    </>
  );
}
