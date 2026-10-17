import { useEffect, useRef, useState } from "react";
import { Megaphone, Plus, Search, Sparkles } from "lucide-react";
import { useCondominium } from "../../app/providers/useCondominium";
import { Button } from "../../shared/components/Button";
import { ConfirmDialog, type ConfirmRequest } from "../../shared/components/ConfirmDialog";
import { GroupedList, GroupedRow } from "../../shared/components/GroupedList";
import { SelectField } from "../../shared/components/SelectField";
import { PageHeader } from "../../shared/layout/PageHeader";
import { formatDate } from "../../shared/lib/date";
import { getBuildingsByCondominium } from "../buildings/buildingService";
import type { BuildingResponse } from "../buildings/types";
import { NewsDetailsModal } from "../news/NewsDetailsModal";
import { NEWS_AUDIENCE, newsAudienceLabel } from "../news/newsAudience";
import { NEWS_PRIORITY } from "../news/newsPriority";
import { createNews, deleteNews, getNewsByCondominium, getPlatformNews, updateNews } from "../news/newsService";
import { PriorityChip } from "../news/PriorityChip";
import type { NewsResponse } from "../news/types";
import { AdminNewsForm, type CondominiumNewsForm } from "./AdminNewsForm";

const CONDOMINIUM_SCOPE = 1;

type CondominiumData = { condominiumId: number; news: NewsResponse[]; buildings: BuildingResponse[] };
type Selected = { news: NewsResponse; isPlatform: boolean } | null;

export function AdminNewsPage() {
  const { condominiums, activeCondominium, activeCondominiumId, setActiveCondominiumId } = useCondominium();
  const [data, setData] = useState<CondominiumData | null>(null);
  const [platformNews, setPlatformNews] = useState<NewsResponse[]>([]);
  const [platformError, setPlatformError] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Selected>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formVersion, setFormVersion] = useState(0);
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmRequest, setConfirmRequest] = useState<ConfirmRequest | null>(null);
  const formSectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!activeCondominiumId) return;
    let isMounted = true;

    Promise.all([getNewsByCondominium(activeCondominiumId), getBuildingsByCondominium(activeCondominiumId)])
      .then(([news, buildings]) => {
        if (!isMounted) return;
        setData({ condominiumId: activeCondominiumId, news, buildings });
        setErrorMessage("");
      })
      .catch((error) => {
        if (!isMounted) return;
        setData({ condominiumId: activeCondominiumId, news: [], buildings: [] });
        setErrorMessage(error instanceof Error ? error.message : "Não foi possível carregar os avisos.");
      });

    return () => {
      isMounted = false;
    };
  }, [activeCondominiumId]);

  useEffect(() => {
    let isMounted = true;

    getPlatformNews()
      .then((result) => isMounted && setPlatformNews(result))
      .catch((error) => isMounted && setPlatformError(error instanceof Error ? error.message : "Não foi possível carregar os avisos do Moraê."));

    return () => {
      isMounted = false;
    };
  }, []);

  // Data from a previous condominium counts as "still loading" for the new one.
  const isLoading = Boolean(activeCondominiumId) && data?.condominiumId !== activeCondominiumId;
  const news = isLoading ? [] : (data?.news ?? []);
  const buildings = isLoading ? [] : (data?.buildings ?? []);
  const editingNews = news.find((item) => item.id === editingId) ?? null;
  const condominiumName = activeCondominium?.condominiumName ?? "Seu condomínio";

  const term = search.trim().toLowerCase();
  const visibleNews = term
    ? news.filter((item) => item.title.toLowerCase().includes(term) || item.description.toLowerCase().includes(term))
    : news;

  function targetLabel(item: NewsResponse) {
    const building = buildings.find((candidate) => candidate.id === item.buildingId);
    const audience = newsAudienceLabel(item.targetAudience);
    if (!building) return audience;
    return item.targetAudience === NEWS_AUDIENCE.everyone ? building.name : `${building.name} · ${audience}`;
  }

  function detailsAudience(item: NewsResponse) {
    return item.buildingId ? `para ${targetLabel(item)}` : `para ${newsAudienceLabel(item.targetAudience).toLowerCase()}`;
  }

  async function reload() {
    if (!activeCondominiumId) return;
    const result = await getNewsByCondominium(activeCondominiumId);
    setData((current) => (current ? { ...current, news: result } : current));
  }

  function scrollToForm() {
    formSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    formSectionRef.current?.querySelector<HTMLInputElement>("input")?.focus({ preventScroll: true });
  }

  function startEdit(item: NewsResponse) {
    setSelected(null);
    setFormError("");
    setSuccessMessage("");
    setEditingId(item.id);
    // Wait for the form to remount with the notice before moving focus.
    requestAnimationFrame(scrollToForm);
  }

  function cancelEdit() {
    setEditingId(null);
    setFormError("");
  }

  async function handleSubmit(form: CondominiumNewsForm) {
    if (!activeCondominiumId) return;
    setIsSubmitting(true);
    setFormError("");
    setSuccessMessage("");

    try {
      if (editingNews) {
        await updateNews(editingNews.id, form);
      } else {
        await createNews({ ...form, scope: CONDOMINIUM_SCOPE, condominiumId: activeCondominiumId });
      }
      await reload();
      setSuccessMessage(editingNews ? "Aviso atualizado." : "Aviso publicado. Quem recebe já vê no app e no sininho.");
      setEditingId(null);
      setFormVersion((version) => version + 1);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Não foi possível salvar o aviso.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function askDelete(item: NewsResponse) {
    setSelected(null);
    setConfirmRequest({
      title: "Apagar este aviso?",
      description: `"${item.title}" sai da lista de quem recebeu. Esta ação não pode ser desfeita.`,
      confirmLabel: "Apagar aviso",
      tone: "danger",
      onConfirm: async () => {
        try {
          await deleteNews(item.id);
          if (editingId === item.id) setEditingId(null);
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
      <PageHeader overline={`${condominiumName} · o morador recebe no app e no sininho`} title="Avisos">
        <span className="lg:hidden">
          <Button
            variant="accent"
            size="sm"
            onClick={() => {
              cancelEdit();
              requestAnimationFrame(scrollToForm);
            }}
          >
            <Plus size={16} strokeWidth={2} aria-hidden />
            Novo aviso
          </Button>
        </span>
      </PageHeader>

      {condominiums.length > 1 && (
        <SelectField
          label="Condomínio"
          className="mb-6 lg:hidden"
          value={activeCondominiumId ? String(activeCondominiumId) : ""}
          options={condominiums.map((condominium) => ({ value: String(condominium.condominiumId), label: condominium.condominiumName }))}
          onChange={(event) => setActiveCondominiumId(Number(event.target.value))}
        />
      )}

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

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(320px,380px)] lg:items-start lg:gap-8">
        <div className="flex min-w-0 flex-col gap-10">
          <section>
            <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
              <h2 className="font-display text-[21px] font-bold tracking-[-0.01em] text-tinta">Publicados</h2>
              {news.length > 0 && (
                <label className="relative sm:w-64">
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
              )}
            </div>

            <GroupedList>
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
                        Avise sobre falta de água, obras, assembleias e regras. Dá para mandar para todos, só para moradores ou para um prédio.
                      </span>
                    </>
                  )}
                </li>
              ) : (
                visibleNews.map((item) => (
                  <GroupedRow
                    key={item.id}
                    icon={Megaphone}
                    tone={item.priority === NEWS_PRIORITY.high ? "red" : "green"}
                    title={item.title}
                    subtitle={`${item.description} · ${formatDate(item.createdAt)}`}
                    trailing={
                      <span className="hidden max-w-40 shrink-0 truncate rounded-chip bg-campo px-2 py-0.5 text-xs font-semibold text-tinta-suave sm:inline-block">
                        {targetLabel(item)}
                      </span>
                    }
                    onClick={() => {
                      setSuccessMessage("");
                      setSelected({ news: item, isPlatform: false });
                    }}
                  />
                ))
              )}
            </GroupedList>
          </section>

          <section>
            <h2 className="font-display text-[21px] font-bold tracking-[-0.01em] text-tinta">Do Moraê para você</h2>
            <p className="mb-4 mt-1 text-[13px] text-tinta-suave">Novidades e comunicados da plataforma para a administração. Só leitura.</p>

            {platformError ? (
              <p className="rounded-field bg-vermelho-suave px-4 py-3 text-sm font-medium text-vermelho">{platformError}</p>
            ) : platformNews.length === 0 ? (
              <p className="rounded-card bg-superficie/60 px-5 py-6 text-center text-sm text-tinta-suave">Nenhum comunicado do Moraê por enquanto.</p>
            ) : (
              <GroupedList>
                {platformNews.map((item) => (
                  <GroupedRow
                    key={item.id}
                    icon={Sparkles}
                    tone={item.priority === NEWS_PRIORITY.high ? "red" : "neutral"}
                    title={item.title}
                    subtitle={`${item.description} · ${formatDate(item.createdAt)}`}
                    trailing={
                      item.priority === NEWS_PRIORITY.high ? (
                        <span className="hidden sm:inline-flex">
                          <PriorityChip priority={item.priority} />
                        </span>
                      ) : undefined
                    }
                    onClick={() => setSelected({ news: item, isPlatform: true })}
                  />
                ))}
              </GroupedList>
            )}
          </section>
        </div>

        <section ref={formSectionRef} aria-labelledby="admin-news-form-title" className="scroll-mt-6 lg:sticky lg:top-10">
          <h2 id="admin-news-form-title" className="mb-4 font-display text-[21px] font-bold tracking-[-0.01em] text-tinta">
            {editingNews ? "Editar aviso" : "Novo aviso"}
          </h2>
          <AdminNewsForm
            key={`${formVersion}-${editingNews?.id ?? "new"}`}
            news={editingNews}
            buildings={buildings}
            errorMessage={formError}
            isSubmitting={isSubmitting}
            disabled={!activeCondominiumId || isLoading}
            onCancelEdit={cancelEdit}
            onSubmit={handleSubmit}
          />
        </section>
      </div>

      {selected && (
        <NewsDetailsModal
          news={selected.news}
          audienceLabel={selected.isPlatform ? "do Moraê para a administração" : detailsAudience(selected.news)}
          onClose={() => setSelected(null)}
          onEdit={selected.isPlatform ? undefined : () => startEdit(selected.news)}
          onDelete={selected.isPlatform ? undefined : () => askDelete(selected.news)}
        />
      )}

      {confirmRequest && <ConfirmDialog request={confirmRequest} onClose={() => setConfirmRequest(null)} />}
    </>
  );
}
