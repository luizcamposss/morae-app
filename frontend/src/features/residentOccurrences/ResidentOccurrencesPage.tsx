import { useEffect, useMemo, useState } from "react";
import { Camera, ChevronRight, MessageSquareReply, Plus, TriangleAlert } from "lucide-react";
import { useCondominium } from "../../app/providers/useCondominium";
import { Button } from "../../shared/components/Button";
import { SelectField } from "../../shared/components/SelectField";
import { PageHeader } from "../../shared/layout/PageHeader";
import { formatDate } from "../../shared/lib/date";
import { getMyUnits } from "../me/meService";
import type { MeUnitResponse } from "../me/types";
import { isPending, typeLabel } from "../occurrences/occurrenceMeta";
import { StatusChip } from "../occurrences/OccurrenceParts";
import { createOccurrence, getMyOccurrences } from "../occurrences/occurrenceService";
import type { OccurrenceResponse } from "../occurrences/types";
import type { OccurrenceForm } from "./occurrenceForm";
import { NewOccurrenceModal, ResidentOccurrenceDetailsModal, type UnitOption } from "./ResidentOccurrenceModals";

type Tab = "pending" | "done";

// The resident's occurrences in the active condominium: open new ones (with photos) and follow
// the status and the management's reply.
export function ResidentOccurrencesPage() {
  const { condominiums, activeCondominium, activeCondominiumId, setActiveCondominiumId } = useCondominium();
  const [tab, setTab] = useState<Tab>("pending");
  const [data, setData] = useState<{ key: string; occurrences: OccurrenceResponse[] }>({ key: "", occurrences: [] });
  // null while loading: all the units of the user, in every condominium.
  const [allUnits, setAllUnits] = useState<MeUnitResponse[] | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const requestKey = String(reloadToken);
  const isLoading = data.key !== requestKey;
  const units = useMemo<UnitOption[]>(
    () =>
      (allUnits ?? [])
        .filter((unit) => unit.condominiumId === activeCondominiumId)
        .map((unit) => ({ value: String(unit.unitId), label: `${unit.buildingName}, unidade ${unit.unitNumber}` })),
    [allUnits, activeCondominiumId],
  );

  useEffect(() => {
    let isMounted = true;

    getMyUnits()
      .then((loaded) => isMounted && setAllUnits(loaded))
      .catch(() => isMounted && setAllUnits([]));

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    // The route returns every condominium; the active one is picked below.
    getMyOccurrences()
      .then((occurrences) => {
        if (!isMounted) return;
        setErrorMessage("");
        setData({ key: requestKey, occurrences });
      })
      .catch((error) => {
        if (!isMounted) return;
        setErrorMessage(error instanceof Error ? error.message : "Não foi possível carregar suas ocorrências.");
        setData({ key: requestKey, occurrences: [] });
      });

    return () => {
      isMounted = false;
    };
  }, [requestKey]);

  const { pending, done } = useMemo(() => {
    const own = (isLoading ? [] : data.occurrences)
      .filter((occurrence) => occurrence.condominiumId === activeCondominiumId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return { pending: own.filter(isPending), done: own.filter((occurrence) => !isPending(occurrence)) };
  }, [data.occurrences, isLoading, activeCondominiumId]);

  const items = tab === "pending" ? pending : done;
  const selected = data.occurrences.find((occurrence) => occurrence.id === selectedId) ?? null;
  const hasNoUnit = allUnits !== null && units.length === 0;
  const showPlace = units.length > 1;

  function openForm() {
    setFormError("");
    setSuccessMessage("");
    setIsFormOpen(true);
  }

  async function handleSubmit(form: OccurrenceForm) {
    if (!activeCondominiumId) return;
    setIsSubmitting(true);
    setFormError("");

    try {
      await createOccurrence(
        {
          condominiumId: activeCondominiumId,
          unitId: Number(form.unitId),
          title: form.title.trim(),
          description: form.description.trim(),
          type: form.type,
          priority: form.priority,
        },
        form.photos,
      );
      setIsFormOpen(false);
      setTab("pending");
      setSuccessMessage("Ocorrência enviada. Você recebe um aviso quando a gestão responder.");
      setReloadToken((token) => token + 1);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Não foi possível enviar a ocorrência.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const tabs: Array<{ key: Tab; label: string; count: number }> = [
    { key: "pending", label: "Em aberto", count: pending.length },
    { key: "done", label: "Encerradas", count: done.length },
  ];

  return (
    <>
      <PageHeader overline={activeCondominium?.condominiumName} title="Ocorrências">
        <Button size="sm" onClick={openForm} disabled={!activeCondominiumId || allUnits === null || hasNoUnit}>
          <Plus size={16} strokeWidth={2} aria-hidden />
          Nova
          <span className="max-sm:hidden">ocorrência</span>
        </Button>
      </PageHeader>

      {condominiums.length > 1 && (
        <SelectField
          label="Condomínio"
          className="mb-6 lg:hidden"
          value={activeCondominiumId ? String(activeCondominiumId) : ""}
          onChange={(event) => setActiveCondominiumId(Number(event.target.value))}
          options={condominiums.map((condominium) => ({ value: String(condominium.condominiumId), label: condominium.condominiumName }))}
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
      {hasNoUnit && (
        <p className="mb-6 rounded-field bg-campo px-4 py-3 text-sm text-tinta-suave">
          Você ainda não está ligado a uma unidade neste condomínio. Peça à administração para vincular você e então abra ocorrências por aqui.
        </p>
      )}

      <div role="tablist" aria-label="Ocorrências" className="mb-4 flex w-full rounded-block bg-menu p-1 sm:inline-flex sm:w-auto">
        {tabs.map((item) => (
          <button
            key={item.key}
            type="button"
            role="tab"
            aria-selected={tab === item.key}
            onClick={() => setTab(item.key)}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-field px-4 py-2 text-sm font-semibold transition-colors sm:flex-none ${
              tab === item.key ? "bg-superficie text-tinta shadow-whisper" : "text-tinta-suave hover:text-tinta"
            }`}
          >
            {item.label}
            <span className="text-xs font-medium tabular-nums text-tinta-suave">{isLoading ? "" : item.count}</span>
          </button>
        ))}
      </div>

      <ul aria-busy={isLoading} className="max-w-3xl divide-y divide-linha overflow-hidden rounded-card bg-superficie shadow-whisper">
        {isLoading ? (
          <li className="px-5 py-12 text-center text-sm text-tinta-suave">Carregando…</li>
        ) : items.length === 0 ? (
          <li className="flex flex-col items-center gap-3 px-6 py-12 text-center">
            <span aria-hidden className="grid size-12 place-items-center rounded-block bg-campo text-tinta-suave">
              <TriangleAlert size={22} strokeWidth={1.8} />
            </span>
            <p className="text-[15px] font-semibold text-tinta">{tab === "pending" ? "Nada em aberto." : "Nenhuma ocorrência encerrada."}</p>
            <p className="max-w-sm text-sm text-tinta-suave">
              {tab === "pending"
                ? "Viu algo quebrado, sujo ou fora do lugar? Abra uma ocorrência com fotos e acompanhe a resposta da gestão aqui."
                : "Ocorrências resolvidas ou canceladas ficam guardadas aqui."}
            </p>
          </li>
        ) : (
          items.map((occurrence) => {
            const details = [typeLabel(occurrence.type), formatDate(occurrence.createdAt), showPlace && `${occurrence.buildingName} · ${occurrence.unitNumber}`]
              .filter(Boolean)
              .join(" · ");

            return (
              <li key={occurrence.id}>
                <button
                  type="button"
                  onClick={() => {
                    setSuccessMessage("");
                    setSelectedId(occurrence.id);
                  }}
                  className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-campo/60 sm:gap-4 sm:px-5"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-semibold text-tinta">{occurrence.title}</span>
                    <span className="flex items-center gap-2 text-[13px] text-tinta-suave">
                      <span className="truncate">{details}</span>
                      {occurrence.photos.length > 0 && (
                        <span className="inline-flex shrink-0 items-center gap-0.5 tabular-nums" aria-label={`${occurrence.photos.length} fotos`}>
                          <Camera size={13} strokeWidth={1.8} aria-hidden />
                          {occurrence.photos.length}
                        </span>
                      )}
                    </span>
                    {occurrence.managementResponse && (
                      <span className="mt-1 flex items-center gap-1 text-[13px] font-medium text-verde-tinta">
                        <MessageSquareReply size={13} strokeWidth={1.8} aria-hidden className="shrink-0" />
                        <span className="truncate">Gestão respondeu: {occurrence.managementResponse}</span>
                      </span>
                    )}
                  </span>
                  <StatusChip status={occurrence.status} />
                  <ChevronRight size={18} strokeWidth={1.8} aria-hidden className="hidden shrink-0 text-tinta-suave sm:block" />
                </button>
              </li>
            );
          })
        )}
      </ul>

      {selected && <ResidentOccurrenceDetailsModal occurrence={selected} showPlace={showPlace} onClose={() => setSelectedId(null)} />}

      {isFormOpen && (
        <NewOccurrenceModal units={units} errorMessage={formError} isSubmitting={isSubmitting} onClose={() => setIsFormOpen(false)} onSubmit={handleSubmit} />
      )}
    </>
  );
}
