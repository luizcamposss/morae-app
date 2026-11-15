import { useEffect, useState, type ReactNode } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import { Download, FileText, Megaphone } from "lucide-react";
import { useCondominium } from "../../app/providers/useCondominium";
import { GroupedList, GroupedRow } from "../../shared/components/GroupedList";
import { MoraeMark } from "../../shared/components/MoraeMark";
import { SelectField } from "../../shared/components/SelectField";
import { PageHeader } from "../../shared/layout/PageHeader";
import { formatDate } from "../../shared/lib/date";
import { downloadDocument, getDocuments } from "../documents/documentService";
import { categoryLabel, documentCategories, formatFileSize } from "../documents/documentMeta";
import { DocumentDetailsModal, FileTile } from "../documents/DocumentModals";
import type { DocumentCategory, DocumentResponse } from "../documents/types";
import { NewsDetailsModal } from "../news/NewsDetailsModal";
import { newsAudienceLabel } from "../news/newsAudience";
import { NEWS_PRIORITY } from "../news/newsPriority";
import { getNewsByCondominium, markNewsAsRead } from "../news/newsService";
import { useModuleEnabled } from "../modules/modules";
import { PriorityChip } from "../news/PriorityChip";
import type { NewsResponse } from "../news/types";

type Loaded = {
  condominiumId: number | null;
  news: NewsResponse[];
  documents: DocumentResponse[];
  newsError: string;
  documentsError: string;
};

const DOCUMENTS_TAB = "documentos";

function errorText(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

// Resident view: notices from the management and the condominium documents (read and download only).
// The API already filters what the resident may see (audience, building, "management only").
export function ResidentNoticeBoardPage() {
  const { condominiums, activeCondominium, activeCondominiumId, setActiveCondominiumId } = useCondominium();
  const [searchParams, setSearchParams] = useSearchParams();
  const [loaded, setLoaded] = useState<Loaded>({ condominiumId: null, news: [], documents: [], newsError: "", documentsError: "" });
  const [pickedCategory, setCategory] = useState<DocumentCategory | null>(null);
  const [selectedNews, setSelectedNews] = useState<NewsResponse | null>(null);
  const [selectedDocumentId, setSelectedDocumentId] = useState<number | null>(null);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const [downloadError, setDownloadError] = useState("");

  // With the documents module off, the screen is just the notices (no tabs).
  const hasDocuments = useModuleEnabled("documents");
  const showDocuments = hasDocuments && searchParams.get("tab") === DOCUMENTS_TAB;

  useEffect(() => {
    if (!activeCondominiumId) return;
    let isMounted = true;

    // Each list fails on its own, so a documents error still shows the notices.
    Promise.allSettled([getNewsByCondominium(activeCondominiumId), hasDocuments ? getDocuments(activeCondominiumId) : Promise.resolve([])]).then(([news, documents]) => {
      if (!isMounted) return;
      setLoaded({
        condominiumId: activeCondominiumId,
        news: news.status === "fulfilled" ? news.value : [],
        documents: documents.status === "fulfilled" ? documents.value : [],
        newsError: news.status === "rejected" ? errorText(news.reason, "Não foi possível carregar os avisos.") : "",
        documentsError: documents.status === "rejected" ? errorText(documents.reason, "Não foi possível carregar os documentos.") : "",
      });
    });

    return () => {
      isMounted = false;
    };
  }, [activeCondominiumId, hasDocuments]);

  // Data from a previous condominium counts as "still loading" for the new one.
  const isLoading = Boolean(activeCondominiumId) && loaded.condominiumId !== activeCondominiumId;
  const news = isLoading ? [] : loaded.news;
  const documents = isLoading ? [] : loaded.documents;
  const selectedDocument = documents.find((item) => item.id === selectedDocumentId) ?? null;

  // Only categories that have something, so the row stays short on the phone.
  const categoryTabs = [
    { value: null, label: "Todos", count: documents.length },
    ...documentCategories
      .map((item) => ({ value: item.value, label: item.shortLabel, count: documents.filter((document) => document.category === item.value).length }))
      .filter((item) => item.count > 0),
  ];
  // A category picked in another condominium may not exist here.
  const category = categoryTabs.some((tab) => tab.value === pickedCategory) ? pickedCategory : null;
  const visibleDocuments = category ? documents.filter((item) => item.category === category) : documents;

  function switchTab(toDocuments: boolean) {
    setDownloadError("");
    setSearchParams(toDocuments ? { tab: DOCUMENTS_TAB } : {}, { replace: true });
  }

  async function handleDownload(document: DocumentResponse) {
    setDownloadError("");
    setDownloadingId(document.id);

    try {
      await downloadDocument(document);
    } catch (error) {
      setSelectedDocumentId(null);
      setDownloadError(errorText(error, "Não foi possível baixar o documento."));
    } finally {
      setDownloadingId(null);
    }
  }

  function newsAudience(item: NewsResponse) {
    if (item.buildingId) return "para o seu prédio";
    return `para ${newsAudienceLabel(item.targetAudience).toLowerCase()}`;
  }

  const mainTabs = [
    { toDocuments: false, label: "Avisos", count: news.length },
    { toDocuments: true, label: "Documentos", count: documents.length },
  ];
  const shownError = showDocuments ? downloadError || loaded.documentsError : loaded.newsError;

  return (
    <>
      <PageHeader overline={activeCondominium?.condominiumName} title={hasDocuments ? "Avisos e documentos" : "Avisos"} />

      {condominiums.length > 1 && (
        <SelectField
          label="Condomínio"
          className="mb-6 lg:hidden"
          value={String(activeCondominiumId ?? "")}
          options={condominiums.map((item) => ({ value: String(item.condominiumId), label: item.condominiumName }))}
          onChange={(event) => setActiveCondominiumId(Number(event.target.value))}
        />
      )}

      {hasDocuments && <div role="group" aria-label="Avisos ou documentos" className="mb-6 grid grid-cols-2 gap-1 rounded-block bg-menu p-1 sm:inline-grid sm:min-w-80">
        {mainTabs.map((tab) => {
          const isActive = showDocuments === tab.toDocuments;
          return (
            <button
              key={tab.label}
              type="button"
              aria-pressed={isActive}
              onClick={() => switchTab(tab.toDocuments)}
              className={`flex items-center justify-center gap-1.5 rounded-field px-4 py-2.5 text-sm font-semibold transition-colors ${
                isActive ? "bg-superficie text-tinta shadow-whisper" : "text-tinta-suave hover:text-tinta"
              }`}
            >
              {tab.label}
              <span className="text-xs tabular-nums text-tinta-suave">{isLoading ? "" : tab.count}</span>
            </button>
          );
        })}
      </div>}

      {shownError && (
        <p role="alert" className="mb-6 rounded-field bg-vermelho-suave px-4 py-3 text-sm font-medium text-vermelho">
          {shownError}
        </p>
      )}

      {!showDocuments ? (
        <GroupedList>
          {news.length === 0 ? (
            <EmptyRow
              isLoading={isLoading}
              loadingText="Carregando avisos…"
              hasError={Boolean(loaded.newsError)}
              icon={<Megaphone size={22} strokeWidth={1.8} aria-hidden />}
              title="Nenhum aviso por enquanto"
              text="Quando a administração publicar um aviso, ele aparece aqui e no sininho."
            />
          ) : (
            news.map((item) => (
              <GroupedRow
                key={item.id}
                icon={Megaphone}
                tone={item.priority === NEWS_PRIORITY.high ? "red" : "green"}
                title={item.title}
                subtitle={`${formatDate(item.createdAt)} · ${item.description}`}
                trailing={
                  item.priority === NEWS_PRIORITY.high ? (
                    <span className="hidden sm:inline-flex">
                      <PriorityChip priority={item.priority} />
                    </span>
                  ) : undefined
                }
                onClick={() => {
                  setSelectedNews(item);
                  // Tells the administration this notice was read (only the first time counts).
                  markNewsAsRead(item.id).catch(() => undefined);
                }}
              />
            ))
          )}
        </GroupedList>
      ) : (
        <>
          {categoryTabs.length > 2 && (
            <div className="-mx-4 mb-5 overflow-x-auto px-4 [scrollbar-width:none] lg:mx-0 lg:px-0">
              <div role="group" aria-label="Filtrar por categoria" className="inline-flex gap-1 rounded-block bg-menu p-1">
                {categoryTabs.map((tab) => {
                  const isActive = category === tab.value;
                  return (
                    <button
                      key={tab.label}
                      type="button"
                      aria-pressed={isActive}
                      onClick={() => setCategory(tab.value)}
                      className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-field px-3.5 py-2 text-sm font-semibold transition-colors ${
                        isActive ? "bg-superficie text-tinta shadow-whisper" : "text-tinta-suave hover:text-tinta"
                      }`}
                    >
                      {tab.label}
                      <span className="text-xs tabular-nums text-tinta-suave">{tab.count}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <ul className="divide-y divide-linha overflow-hidden rounded-card bg-superficie shadow-whisper">
            {visibleDocuments.length === 0 ? (
              <EmptyRow
                isLoading={isLoading}
                loadingText="Carregando documentos…"
                hasError={Boolean(loaded.documentsError)}
                icon={<FileText size={22} strokeWidth={1.8} aria-hidden />}
                title="Nenhum documento por enquanto"
                text="A convenção, o regimento, as atas e a prestação de contas aparecem aqui quando a administração enviar."
              />
            ) : (
              visibleDocuments.map((document) => (
                <li key={document.id} className="flex items-center gap-2 pr-3 transition-colors hover:bg-campo/60 sm:gap-3 sm:pr-4">
                  <button
                    type="button"
                    onClick={() => {
                      setDownloadError("");
                      setSelectedDocumentId(document.id);
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
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDownload(document)}
                    disabled={downloadingId === document.id}
                    aria-label={`Baixar ${document.title}`}
                    className="grid size-11 shrink-0 place-items-center rounded-full text-tinta-suave transition-colors hover:bg-menu hover:text-tinta disabled:cursor-progress"
                  >
                    {downloadingId === document.id ? <MoraeMark size={18} motion="respiro" /> : <Download size={18} strokeWidth={1.8} aria-hidden />}
                  </button>
                </li>
              ))
            )}
          </ul>
        </>
      )}

      {selectedNews && <NewsDetailsModal news={selectedNews} audienceLabel={newsAudience(selectedNews)} onClose={() => setSelectedNews(null)} />}

      {selectedDocument && (
        <DocumentDetailsModal
          document={selectedDocument}
          isDownloading={downloadingId === selectedDocument.id}
          onClose={() => setSelectedDocumentId(null)}
          onDownload={() => void handleDownload(selectedDocument)}
        />
      )}
    </>
  );
}

// "Novo documento" notifications link to /resident/documents (DocumentService); open the documents tab.
export function ResidentDocumentsRedirect() {
  return <Navigate to={`/resident/notices?tab=${DOCUMENTS_TAB}`} replace />;
}

type EmptyRowProps = {
  isLoading: boolean;
  loadingText: string;
  hasError: boolean;
  icon: ReactNode;
  title: string;
  text: string;
};

function EmptyRow({ isLoading, loadingText, hasError, icon, title, text }: EmptyRowProps) {
  return (
    <li className="flex flex-col items-center px-5 py-12 text-center">
      {isLoading ? (
        <span className="flex items-center gap-2 text-sm text-tinta-suave">
          <MoraeMark size={18} motion="respiro" />
          {loadingText}
        </span>
      ) : hasError ? (
        <span className="text-sm text-tinta-suave">Não foi possível mostrar agora. Tente de novo em instantes.</span>
      ) : (
        <>
          <span className="grid size-12 place-items-center rounded-block bg-verde-suave text-verde-tinta">{icon}</span>
          <span className="mt-4 font-display text-lg font-bold text-tinta">{title}</span>
          <span className="mt-1 max-w-sm text-sm text-tinta-suave">{text}</span>
        </>
      )}
    </li>
  );
}
