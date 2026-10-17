import { useEffect, useState } from "react";
import { Download, FileText, Plus } from "lucide-react";
import { useCondominium } from "../../app/providers/useCondominium";
import { Button } from "../../shared/components/Button";
import { ConfirmDialog, type ConfirmRequest } from "../../shared/components/ConfirmDialog";
import { MoraeMark } from "../../shared/components/MoraeMark";
import { SelectField } from "../../shared/components/SelectField";
import { PageHeader } from "../../shared/layout/PageHeader";
import { formatDate } from "../../shared/lib/date";
import { createDocument, deleteDocument, downloadDocument, getDocuments, updateDocument } from "./documentService";
import { DOCUMENT_CATEGORY, categoryLabel, documentCategories, formatFileSize } from "./documentMeta";
import { DocumentDetailsModal, DocumentFormModal, FileTile, VisibilityChip } from "./DocumentModals";
import type { CreateDocumentRequest, DocumentCategory, DocumentResponse } from "./types";

type LoadedDocuments = { condominiumId: number | null; documents: DocumentResponse[]; errorMessage: string };
type FormState = { document: DocumentResponse | null } | null;

// Management view (Admin; reusable by the syndic with documents.manage): list by category,
// upload, download, edit details and delete.
export function DocumentsPage() {
  const { condominiums, activeCondominium, activeCondominiumId, setActiveCondominiumId } = useCondominium();
  const [loaded, setLoaded] = useState<LoadedDocuments>({ condominiumId: null, documents: [], errorMessage: "" });
  const [category, setCategory] = useState<DocumentCategory | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [formState, setFormState] = useState<FormState>(null);
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const [confirmRequest, setConfirmRequest] = useState<ConfirmRequest | null>(null);

  useEffect(() => {
    if (!activeCondominiumId) return;
    let isMounted = true;

    getDocuments(activeCondominiumId)
      .then((documents) => isMounted && setLoaded({ condominiumId: activeCondominiumId, documents, errorMessage: "" }))
      .catch(
        (error) =>
          isMounted &&
          setLoaded({
            condominiumId: activeCondominiumId,
            documents: [],
            errorMessage: error instanceof Error ? error.message : "Não foi possível carregar os documentos.",
          }),
      );

    return () => {
      isMounted = false;
    };
  }, [activeCondominiumId]);

  const isLoading = loaded.condominiumId !== activeCondominiumId;
  const documents = isLoading ? [] : loaded.documents;
  const visibleDocuments = category ? documents.filter((item) => item.category === category) : documents;
  const selectedDocument = documents.find((item) => item.id === selectedId) ?? null;
  const shownError = errorMessage || (isLoading ? "" : loaded.errorMessage);

  async function reload() {
    if (!activeCondominiumId) return;
    const result = await getDocuments(activeCondominiumId);
    setLoaded({ condominiumId: activeCondominiumId, documents: result, errorMessage: "" });
  }

  function clearMessages() {
    setErrorMessage("");
    setSuccessMessage("");
  }

  function openForm(document: DocumentResponse | null) {
    clearMessages();
    setFormError("");
    setSelectedId(null);
    setFormState({ document });
  }

  async function handleSubmit(data: CreateDocumentRequest | Omit<CreateDocumentRequest, "file">) {
    if (!activeCondominiumId) return;
    const editing = formState?.document;
    setIsSubmitting(true);
    setFormError("");

    try {
      if (editing) {
        await updateDocument(editing.id, data);
      } else if ("file" in data) {
        await createDocument(activeCondominiumId, data);
      }
      await reload();
      setFormState(null);
      setSuccessMessage(editing ? "Documento atualizado." : `Documento enviado para ${categoryLabel(data.category)}.`);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Não foi possível salvar o documento.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDownload(document: DocumentResponse) {
    clearMessages();
    setDownloadingId(document.id);

    try {
      await downloadDocument(document);
    } catch (error) {
      setSelectedId(null);
      setErrorMessage(error instanceof Error ? error.message : "Não foi possível baixar o documento.");
    } finally {
      setDownloadingId(null);
    }
  }

  function askDelete(document: DocumentResponse) {
    setSelectedId(null);
    const isMinutes = document.category === DOCUMENT_CATEGORY.minutes;
    setConfirmRequest({
      title: "Apagar este documento?",
      description: `"${document.title}" e o arquivo saem do Moraê para todos.${
        isMinutes ? " Se for a ata de uma assembleia, a assembleia fica sem ata." : ""
      } Esta ação não pode ser desfeita.`,
      confirmLabel: "Apagar documento",
      tone: "danger",
      onConfirm: async () => {
        clearMessages();
        try {
          await deleteDocument(document.id);
          await reload();
          setSuccessMessage("Documento apagado.");
        } catch (error) {
          setErrorMessage(error instanceof Error ? error.message : "Não foi possível apagar o documento.");
        }
      },
    });
  }

  const overline = [activeCondominium?.condominiumName, isLoading ? null : `${documents.length} ${documents.length === 1 ? "documento" : "documentos"}`]
    .filter(Boolean)
    .join(" · ");
  const tabs = [
    { value: null, label: "Todos", count: documents.length },
    ...documentCategories.map((item) => ({
      value: item.value,
      label: item.shortLabel,
      count: documents.filter((document) => document.category === item.value).length,
    })),
  ];

  return (
    <>
      <PageHeader overline={overline || undefined} title="Documentos">
        <Button variant="accent" onClick={() => openForm(null)} disabled={!activeCondominiumId} className="max-sm:px-4">
          <Plus size={18} strokeWidth={2} aria-hidden />
          <span className="max-sm:sr-only">Enviar documento</span>
        </Button>
      </PageHeader>

      {condominiums.length > 1 && (
        <SelectField
          label="Condomínio"
          className="mb-6 lg:hidden"
          value={String(activeCondominiumId ?? "")}
          options={condominiums.map((item) => ({ value: String(item.condominiumId), label: item.condominiumName }))}
          onChange={(event) => setActiveCondominiumId(Number(event.target.value))}
        />
      )}

      {shownError && (
        <p role="alert" className="mb-6 rounded-field bg-vermelho-suave px-4 py-3 text-sm font-medium text-vermelho">
          {shownError}
        </p>
      )}
      {successMessage && (
        <p role="status" className="mb-6 rounded-field bg-verde-suave px-4 py-3 text-sm font-medium text-verde-tinta">
          {successMessage}
        </p>
      )}

      <div className="-mx-4 mb-5 overflow-x-auto px-4 [scrollbar-width:none] lg:mx-0 lg:px-0">
        <div role="group" aria-label="Filtrar por categoria" className="inline-flex gap-1 rounded-block bg-menu p-1">
          {tabs.map((tab) => {
            const isActive = category === tab.value;
            return (
              <button
                key={tab.label}
                type="button"
                aria-pressed={isActive}
                onClick={() => {
                  setSuccessMessage("");
                  setCategory(tab.value);
                }}
                className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-field px-3.5 py-2 text-sm font-semibold transition-colors ${
                  isActive ? "bg-superficie text-tinta shadow-whisper" : "text-tinta-suave hover:text-tinta"
                }`}
              >
                {tab.label}
                <span className={`text-xs tabular-nums ${isActive ? "text-tinta-suave" : "text-tinta-suave/80"}`}>{isLoading ? "" : tab.count}</span>
              </button>
            );
          })}
        </div>
      </div>

      <ul className="divide-y divide-linha overflow-hidden rounded-card bg-superficie shadow-whisper">
        {visibleDocuments.length === 0 ? (
          <li className="flex flex-col items-center px-5 py-12 text-center">
            {isLoading ? (
              <span className="flex items-center gap-2 text-sm text-tinta-suave">
                <MoraeMark size={18} motion="respiro" />
                Carregando documentos…
              </span>
            ) : loaded.errorMessage ? (
              <span className="text-sm text-tinta-suave">Não foi possível mostrar os documentos agora.</span>
            ) : (
              <>
                <span className="grid size-12 place-items-center rounded-block bg-verde-suave text-verde-tinta">
                  <FileText size={22} strokeWidth={1.8} aria-hidden />
                </span>
                <span className="mt-4 font-display text-lg font-bold text-tinta">
                  {category ? `Nada em ${categoryLabel(category)} ainda` : "Nenhum documento enviado"}
                </span>
                <span className="mt-1 max-w-sm text-sm text-tinta-suave">
                  {category
                    ? "Os documentos desta categoria aparecem aqui assim que forem enviados."
                    : "Guarde aqui a convenção, o regimento, as atas e a prestação de contas. Os moradores consultam pelo celular."}
                </span>
                <Button variant="quiet" size="sm" className="mt-5" onClick={() => openForm(null)}>
                  {category ? "Enviar documento" : "Enviar o primeiro documento"}
                </Button>
              </>
            )}
          </li>
        ) : (
          visibleDocuments.map((document) => (
            <li key={document.id} className="flex items-center gap-2 pr-3 transition-colors hover:bg-campo/60 sm:gap-3 sm:pr-4">
              <button
                type="button"
                onClick={() => {
                  clearMessages();
                  setSelectedId(document.id);
                }}
                className="flex min-w-0 flex-1 items-center gap-3.5 py-3.5 pl-4 text-left sm:pl-5"
              >
                <FileTile contentType={document.contentType} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-semibold text-tinta">{document.title}</span>
                  <span className="block truncate text-[13px] tabular-nums text-tinta-suave">
                    {categoryLabel(document.category)} · {formatFileSize(document.sizeBytes)} · {formatDate(document.createdAt)}
                  </span>
                </span>
                <span className="hidden sm:inline-flex">
                  <VisibilityChip visibility={document.visibility} />
                </span>
              </button>
              <button
                type="button"
                onClick={() => void handleDownload(document)}
                disabled={downloadingId === document.id}
                aria-label={`Baixar ${document.title}`}
                className="grid size-10 shrink-0 place-items-center rounded-full text-tinta-suave transition-colors hover:bg-menu hover:text-tinta disabled:cursor-progress"
              >
                {downloadingId === document.id ? (
                  <MoraeMark size={18} motion="respiro" />
                ) : (
                  <Download size={18} strokeWidth={1.8} aria-hidden />
                )}
              </button>
            </li>
          ))
        )}
      </ul>

      {selectedDocument && (
        <DocumentDetailsModal
          document={selectedDocument}
          isDownloading={downloadingId === selectedDocument.id}
          onClose={() => setSelectedId(null)}
          onDownload={() => void handleDownload(selectedDocument)}
          onEdit={() => openForm(selectedDocument)}
          onDelete={() => askDelete(selectedDocument)}
        />
      )}

      {formState && (
        <DocumentFormModal
          document={formState.document}
          initialCategory={category ?? undefined}
          errorMessage={formError}
          isSubmitting={isSubmitting}
          onClose={() => setFormState(null)}
          onSubmit={handleSubmit}
        />
      )}

      {confirmRequest && <ConfirmDialog request={confirmRequest} onClose={() => setConfirmRequest(null)} />}
    </>
  );
}
