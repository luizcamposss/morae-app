import { useEffect, useState } from "react";
import { useCondominium } from "../../app/providers/useCondominium";
import { MetricCard } from "../../shared/components/MetricCard";
import { StatusBadge } from "../../shared/components/StatusBadge";
import { getNewsByCondominium } from "../news/newsService";
import type { NewsResponse } from "../news/types";

export function ResidentNoticesPage() {
  const { activeCondominium, activeCondominiumId } = useCondominium();
  const [notices, setNotices] = useState<NewsResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function loadNotices() {
      if (!activeCondominiumId) {
        setNotices([]);
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setErrorMessage("");
        setNotices(await getNewsByCondominium(activeCondominiumId));
      } catch (error) {
        setNotices([]);
        setErrorMessage(
          error instanceof Error ? error.message : "Não foi possível carregar comunicados.",
        );
      } finally {
        setIsLoading(false);
      }
    }

    void loadNotices();
  }, [activeCondominiumId]);

  const highPriorityNotices = notices.filter((notice) => notice.priority === 3);

  return (
    <section className="rounded-[2rem] border border-[#E5E7EB] bg-white p-6 shadow-sm">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-[#111827]">Avisos</h1>
        <p className="mt-1 text-sm font-semibold text-[#6B7280]">
          Comunicados reais de {activeCondominium?.condominiumName ?? "seu condomínio"}.
        </p>
      </div>

      {errorMessage && (
        <div className="mt-5 rounded-2xl border border-[#FECACA] bg-[#FDECEC] px-4 py-3 text-sm font-bold text-[#B42318]">
          {errorMessage}
        </div>
      )}

      <div className="mx-auto mt-6 grid max-w-3xl grid-cols-1 gap-4 md:grid-cols-2">
        <MetricCard
          label="Comunicados"
          value={notices.length.toString()}
          helper="Recebidos do backend"
        />
        <MetricCard
          label="Prioridade alta"
          value={highPriorityNotices.length.toString()}
          helper="Precisam de atenção"
        />
      </div>

      <div className="mt-6 rounded-[1.5rem] border border-[#E5E7EB] bg-[#F3F4F6] p-5">
        <div className="space-y-4">
          {isLoading ? (
            <EmptyNotice text="Carregando comunicados..." />
          ) : notices.length === 0 ? (
            <EmptyNotice text="Nenhum comunicado publicado ainda." />
          ) : (
            notices.map((notice) => (
              <article key={notice.id} className="rounded-2xl bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h2 className="text-lg font-extrabold text-[#111827]">{notice.title}</h2>
                    <p className="mt-1 text-sm font-semibold text-[#6B7280]">
                      Publicado em {formatDate(notice.createdAt)}
                    </p>
                  </div>

                  <StatusBadge
                    label={getPriorityLabel(notice.priority)}
                    variant={notice.priority === 3 ? "warning" : "neutral"}
                  />
                </div>

                <p className="mt-4 text-sm font-semibold leading-6 text-[#111827]">
                  {notice.description}
                </p>
              </article>
            ))
          )}
        </div>
      </div>
    </section>
  );
}

function EmptyNotice({ text }: { text: string }) {
  return (
    <p className="rounded-2xl bg-white px-4 py-8 text-center text-sm font-bold text-[#6B7280]">
      {text}
    </p>
  );
}

function getPriorityLabel(priority: number) {
  if (priority === 3) return "Alta prioridade";
  if (priority === 2) return "Média prioridade";
  return "Informativo";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}
