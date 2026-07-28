import { useEffect, useMemo, useState } from "react";
import { svgIcone } from "@edusites/icons/core";
import { useCondominium } from "../../app/providers/useCondominium";
import { StatusBadge } from "../../shared/components/StatusBadge";
import { getNewsByCondominium } from "../news/newsService";
import type { NewsPriority, NewsResponse } from "../news/types";

export function ResidentNoticesPage() {
  const { activeCondominium, activeCondominiumId } = useCondominium();
  const [notices, setNotices] = useState<NewsResponse[]>([]);
  const [priorityFilter, setPriorityFilter] = useState("all");
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
          error instanceof Error
            ? error.message
            : "Não foi possível carregar comunicados.",
        );
      } finally {
        setIsLoading(false);
      }
    }

    void loadNotices();
  }, [activeCondominiumId]);

  const filteredNotices = useMemo(
    () =>
      notices.filter(
        (notice) =>
          priorityFilter === "all" || notice.priority.toString() === priorityFilter,
      ),
    [notices, priorityFilter],
  );

  const featuredNotice = [...notices].sort(
    (left, right) =>
      right.priority - left.priority ||
      new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
  )[0];

  const highPriorityCount = notices.filter((notice) => notice.priority === 3).length;

  return (
    <section className="rounded-[2rem] border border-[#E5E7EB] bg-white p-5 shadow-sm sm:p-6 lg:p-7">
      <div className="flex flex-col gap-5 border-b border-[#E5E7EB] pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.38em] text-[#16A34A]">
            Comunicados
          </p>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-[#111827] sm:text-4xl">
            Avisos
          </h1>
          <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-[#6B7280]">
            Publicações oficiais de{" "}
            {activeCondominium?.condominiumName ?? "seu condomínio"}.
          </p>
        </div>

        <select
          value={priorityFilter}
          onChange={(event) => setPriorityFilter(event.target.value)}
          className="h-12 min-w-48 cursor-pointer rounded-2xl border border-[#E5E7EB] bg-white px-5 text-sm font-black text-[#6B7280] outline-none transition hover:border-[#86EFAC] focus:border-[#22C55E] focus:ring-4 focus:ring-[#86EFAC]/30"
        >
          <option value="all">Todas as prioridades</option>
          <option value="3">Alta prioridade</option>
          <option value="2">Média prioridade</option>
          <option value="1">Informativo</option>
        </select>
      </div>

      {errorMessage && (
        <div className="mt-5 flex items-start gap-3 rounded-3xl border border-[#FECACA] bg-[#FDECEC] px-4 py-3 text-sm font-bold text-[#B42318]">
          <span className="mt-0.5 text-lg">
            <EduIcon nome="alerta" />
          </span>
          <span>{errorMessage}</span>
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 gap-5 xl:grid-cols-[1.15fr_1.85fr]">
        <FeaturedNotice notice={featuredNotice} isLoading={isLoading} />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <NoticeMetric
            label="Comunicados"
            value={notices.length.toString()}
            helper="Publicados para o condomínio"
            icon="envelope-2"
          />
          <NoticeMetric
            label="Prioridade alta"
            value={highPriorityCount.toString()}
            helper="Precisam de atenção"
            icon="atencao"
            danger={highPriorityCount > 0}
          />
        </div>
      </div>

      <div className="mt-6 rounded-[1.8rem] border border-[#E5E7EB] bg-[#F3F4F6] p-4 sm:p-5">
        <div className="mb-4">
          <h2 className="text-xl font-black text-[#111827]">Todos os avisos</h2>
          <p className="mt-1 text-sm font-semibold text-[#6B7280]">
            {filteredNotices.length} comunicado(s) encontrado(s)
          </p>
        </div>

        {isLoading ? (
          <LoadingList />
        ) : filteredNotices.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {filteredNotices.map((notice) => (
              <NoticeCard key={notice.id} notice={notice} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

type FeaturedNoticeProps = {
  notice?: NewsResponse;
  isLoading: boolean;
};

function FeaturedNotice({ notice, isLoading }: FeaturedNoticeProps) {
  if (isLoading) {
    return (
      <div className="min-h-56 animate-pulse rounded-[1.8rem] bg-[#F3F4F6]" />
    );
  }

  return (
    <article className="relative overflow-hidden rounded-[1.8rem] bg-gradient-to-br from-[#0B3D2E] via-[#0D7A3A] to-[#22C55E] p-6 text-white shadow-xl shadow-[#0B3D2E]/15">
      <div className="absolute -right-16 -top-16 size-40 rounded-full bg-white/10" />
      <div className="absolute -bottom-20 right-10 size-44 rounded-full bg-[#86EFAC]/20" />

      <div className="relative">
        <div className="flex items-center justify-between gap-4">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-white/15 text-2xl backdrop-blur">
            <EduIcon nome="envelope-2" />
          </div>
          {notice && (
            <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-black backdrop-blur">
              {getPriorityLabel(notice.priority)}
            </span>
          )}
        </div>

        <p className="mt-8 text-sm font-bold text-white/75">Aviso em destaque</p>

        {notice ? (
          <>
            <h2 className="mt-2 line-clamp-2 text-3xl font-black tracking-tight">
              {notice.title}
            </h2>
            <p className="mt-3 line-clamp-3 text-sm font-semibold leading-6 text-white/80">
              {notice.description}
            </p>
            <p className="mt-5 text-xs font-black uppercase tracking-[0.18em] text-white/65">
              Publicado em {formatDate(notice.createdAt)}
            </p>
          </>
        ) : (
          <>
            <h2 className="mt-2 text-2xl font-black tracking-tight">
              Nenhum comunicado publicado
            </h2>
            <p className="mt-3 text-sm font-semibold leading-6 text-white/80">
              Quando o condomínio publicar um aviso, ele aparecerá em destaque aqui.
            </p>
          </>
        )}
      </div>
    </article>
  );
}

type NoticeMetricProps = {
  label: string;
  value: string;
  helper: string;
  icon: string;
  danger?: boolean;
};

function NoticeMetric({ label, value, helper, icon, danger = false }: NoticeMetricProps) {
  return (
    <article className="rounded-[1.5rem] border border-[#E5E7EB] bg-[#F9FAFB] p-5 shadow-sm">
      <div
        className={`mb-5 flex size-11 items-center justify-center rounded-2xl text-xl ${
          danger ? "bg-[#FDECEC] text-[#EF4444]" : "bg-[#DCFCE7] text-[#16A34A]"
        }`}
      >
        <EduIcon nome={icon} />
      </div>
      <p className="text-sm font-extrabold text-[#6B7280]">{label}</p>
      <p className="mt-2 text-3xl font-black tracking-tight text-[#111827]">{value}</p>
      <p className="mt-2 text-sm font-bold text-[#16A34A]">{helper}</p>
    </article>
  );
}

type NoticeCardProps = {
  notice: NewsResponse;
};

function NoticeCard({ notice }: NoticeCardProps) {
  return (
    <article className="rounded-[1.5rem] border border-[#E5E7EB] bg-white p-5 transition hover:border-[#86EFAC] hover:shadow-lg hover:shadow-[#0B3D2E]/8">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div
            className={`flex size-11 shrink-0 items-center justify-center rounded-2xl text-xl ${
              notice.priority === 3
                ? "bg-[#FDECEC] text-[#EF4444]"
                : "bg-[#DCFCE7] text-[#16A34A]"
            }`}
          >
            <EduIcon nome={notice.priority === 3 ? "atencao" : "envelope-2"} />
          </div>

          <div>
            <h3 className="font-black leading-6 text-[#111827]">{notice.title}</h3>
            <p className="mt-1 text-xs font-black uppercase tracking-[0.16em] text-[#9CA3AF]">
              {formatDate(notice.createdAt)} · {getAudienceLabel(notice.targetAudience)}
            </p>
          </div>
        </div>

        <StatusBadge
          label={getPriorityLabel(notice.priority)}
          variant={notice.priority === 3 ? "warning" : "neutral"}
        />
      </div>

      <p className="mt-4 text-sm font-semibold leading-6 text-[#374151]">
        {notice.description}
      </p>
    </article>
  );
}

function LoadingList() {
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      {[1, 2, 3, 4].map((item) => (
        <div
          key={item}
          className="h-40 animate-pulse rounded-[1.5rem] border border-[#E5E7EB] bg-white"
        />
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex min-h-56 flex-col items-center justify-center rounded-[1.5rem] border border-dashed border-[#CBD5E1] bg-white px-6 text-center">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-[#DCFCE7] text-2xl text-[#16A34A]">
        <EduIcon nome="envelope-2" />
      </div>
      <h2 className="mt-5 text-xl font-black text-[#111827]">
        Nenhum comunicado encontrado
      </h2>
      <p className="mt-2 max-w-md text-sm font-semibold leading-6 text-[#6B7280]">
        Ajuste o filtro ou aguarde uma nova publicação do condomínio.
      </p>
    </div>
  );
}

function EduIcon({ nome }: { nome: string }) {
  const [svg, setSvg] = useState<string | null>(() =>
    svgIcone({
      nome,
      cor: "currentColor",
      tamanho: "1em",
    }) ?? null,
  );

  useEffect(() => {
    let isMounted = true;

    async function loadIcon() {
      const icons = await import("@edusites/icons/core");
      const loadedSvg = await (icons as typeof icons & {
        svgIconeAsync?: (options: {
          nome: string;
          cor: string;
          tamanho: string;
        }) => Promise<string | null | undefined>;
      }).svgIconeAsync?.({
        nome,
        cor: "currentColor",
        tamanho: "1em",
      });

      if (isMounted) {
        setSvg(loadedSvg ?? null);
      }
    }

    if (!svg) {
      void loadIcon();
    }

    return () => {
      isMounted = false;
    };
  }, [nome, svg]);

  if (!svg) {
    return <span aria-hidden="true" className="inline-flex size-[1em]" />;
  }

  return (
    <span
      aria-hidden="true"
      className="inline-flex leading-none"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

function getPriorityLabel(priority: NewsPriority) {
  if (priority === 3) return "Alta prioridade";
  if (priority === 2) return "Média prioridade";
  return "Informativo";
}

function getAudienceLabel(targetAudience: number) {
  if (targetAudience === 1) return "Todos";
  if (targetAudience === 2) return "Moradores";
  if (targetAudience === 3) return "Síndicos";
  return "Público definido";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}
