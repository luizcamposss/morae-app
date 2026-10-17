import { useEffect, useMemo, useState } from "react";
import { ChevronRight, Megaphone, Plus, Search } from "lucide-react";
import { Button } from "../../shared/components/Button";
import { ConfirmDialog, type ConfirmRequest } from "../../shared/components/ConfirmDialog";
import { SummaryCard } from "../../shared/components/SummaryCard";
import { PageHeader } from "../../shared/layout/PageHeader";
import { formatDate, toAppDateString, todayInputDate } from "../../shared/lib/date";
import { createNews, deleteNews, getPlatformNews, updateNews } from "../news/newsService";
import { NEWS_PRIORITY } from "../news/newsPriority";
import type { NewsResponse } from "../news/types";
import type { NewsForm } from "./newsForm";
import { NewsDetailsModal, NewsFormModal, PriorityChip } from "./PlatformNewsModals";

const PLATFORM_SCOPE = 2;
const ADMINS_AUDIENCE = 2;

type FormState = { news: NewsResponse | null } | null;

export function PlatformNewsPage() {
  const [news, setNews] = useState<NewsResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [formState, setFormState] = useState<FormState>(null);
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmRequest, setConfirmRequest] = useState<ConfirmRequest | null>(null);

  useEffect(() => {
    let isMounted = true;

    getPlatformNews()
      .then((result) => isMounted && setNews(result))
      .catch((error) => isMounted && setErrorMessage(error instanceof Error ? error.message : "Não foi possível carregar os avisos."))
      .finally(() => isMounted && setIsLoading(false));

    return () => {
      isMounted = false;
    };
  }, []);

  async function reload() {
    setNews(await getPlatformNews());
  }

  const summary = useMemo(() => {
    const currentMonth = todayInputDate().slice(0, 7);
    return {
      thisMonth: news.filter((item) => toAppDateString(item.createdAt).startsWith(currentMonth)).length,
      important: news.filter((item) => item.priority === NEWS_PRIORITY.high).length,
      last: news[0],
    };
  }, [news]);

  const term = search.trim().toLowerCase();
  const visibleNews = term
    ? news.filter((item) => item.title.toLowerCase().includes(term) || item.description.toLowerCase().includes(term))
    : news;
  const selectedNews = news.find((item) => item.id === selectedId) ?? null;

  function openForm(item: NewsResponse | null) {
    setFormError("");
    setSuccessMessage("");
    setSelectedId(null);
    setFormState({ news: item });
  }

  async function handleSubmit(form: NewsForm) {
    const editing = formState?.news;
    setIsSubmitting(true);
    setFormError("");

    try {
      if (editing) {
        await updateNews(editing.id, { ...form, targetAudience: ADMINS_AUDIENCE, buildingId: null });
      } else {
        await createNews({ ...form, scope: PLATFORM_SCOPE, targetAudience: ADMINS_AUDIENCE, condominiumId: null, buildingId: null });
      }
      await reload();
      setFormState(null);
      setSuccessMessage(editing ? "Aviso atualizado." : "Aviso publicado para os administradores.");
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Não foi possível salvar o aviso.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function askDelete(item: NewsResponse) {
    setSelectedId(null);
    setConfirmRequest({
      title: "Apagar este aviso?",
      description: `"${item.title}" sai da lista dos administradores. Esta ação não pode ser desfeita.`,
      confirmLabel: "Apagar aviso",
      tone: "danger",
      onConfirm: async () => {
        try {
          await deleteNews(item.id);
          await reload();
          setSuccessMessage("Aviso apagado.");
        } catch (error) {
          setErrorMessage(error instanceof Error ? error.message : "Não foi possível apagar o aviso.");
        }
      },
    });
  }

  return (
    <>
      <PageHeader overline="Comunicados para os administradores" title="Avisos">
        <Button variant="accent" onClick={() => openForm(null)}>
          <Plus size={18} strokeWidth={2} aria-hidden />
          Novo aviso
        </Button>
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

      <SummaryCard
        items={[
          { label: "Avisos publicados", value: isLoading ? "–" : String(news.length), detail: "para os administradores" },
          { label: "Neste mês", value: isLoading ? "–" : String(summary.thisMonth), detail: summary.last ? `último em ${formatDate(summary.last.createdAt)}` : "nenhum ainda" },
          {
            label: "Importantes",
            value: isLoading ? "–" : String(summary.important),
            detail: "aparecem em destaque",
            tone: summary.important > 0 ? "danger" : "neutral",
          },
        ]}
      />

      <div className="mb-4 mt-10 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <h2 className="font-display text-[21px] font-bold tracking-[-0.01em] text-tinta">Publicados</h2>
        <label className="relative sm:w-72">
          <span className="sr-only">Buscar aviso</span>
          <Search size={17} strokeWidth={1.8} aria-hidden className="pointer-events-none absolute inset-y-0 left-3.5 my-auto text-tinta-suave" />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Título ou texto"
            className="w-full rounded-full bg-superficie py-2.5 pl-10 pr-4 text-sm text-tinta shadow-whisper outline-none placeholder:text-tinta-suave/80 focus:ring-2 focus:ring-verde focus-visible:outline-none"
          />
        </label>
      </div>

      <ul className="divide-y divide-linha overflow-hidden rounded-card bg-superficie shadow-whisper">
        {visibleNews.length === 0 ? (
          <li className="flex flex-col items-center px-5 py-12 text-center">
            {isLoading ? (
              <span className="text-sm text-tinta-suave">Carregando…</span>
            ) : term ? (
              <span className="text-sm text-tinta-suave">Nenhum aviso encontrado com essa busca.</span>
            ) : (
              <>
                <span className="grid size-12 place-items-center rounded-block bg-verde-suave text-verde-tinta">
                  <Megaphone size={22} strokeWidth={1.8} aria-hidden />
                </span>
                <span className="mt-4 font-display text-lg font-bold text-tinta">Nenhum aviso publicado</span>
                <span className="mt-1 max-w-sm text-sm text-tinta-suave">
                  Use os avisos para falar com os administradores de todos os condomínios: novidades, manutenções e prazos.
                </span>
                <Button variant="quiet" size="sm" className="mt-5" onClick={() => openForm(null)}>
                  Escrever o primeiro aviso
                </Button>
              </>
            )}
          </li>
        ) : (
          visibleNews.map((item) => {
            const isImportant = item.priority === NEWS_PRIORITY.high;
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => {
                    setSuccessMessage("");
                    setSelectedId(item.id);
                  }}
                  className="flex w-full items-start gap-4 px-5 py-4 text-left transition-colors hover:bg-campo/60"
                >
                  <span
                    className={`grid size-10 shrink-0 place-items-center rounded-block ${isImportant ? "bg-vermelho-suave text-vermelho" : "bg-verde-suave text-verde-tinta"}`}
                  >
                    <Megaphone size={18} strokeWidth={1.8} aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate text-[15px] font-semibold text-tinta">{item.title}</span>
                      <span className="hidden sm:inline-flex">
                        <PriorityChip priority={item.priority} />
                      </span>
                    </span>
                    <span className="mt-0.5 line-clamp-2 text-[13px] leading-snug text-tinta-suave">{item.description}</span>
                  </span>
                  <span className="shrink-0 pt-0.5 text-xs tabular-nums text-tinta-suave">{formatDate(item.createdAt)}</span>
                  <ChevronRight size={18} strokeWidth={1.8} aria-hidden className="mt-0.5 shrink-0 text-tinta-suave" />
                </button>
              </li>
            );
          })
        )}
      </ul>

      {selectedNews && (
        <NewsDetailsModal
          news={selectedNews}
          onClose={() => setSelectedId(null)}
          onEdit={() => openForm(selectedNews)}
          onDelete={() => askDelete(selectedNews)}
        />
      )}

      {formState && (
        <NewsFormModal
          news={formState.news}
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
