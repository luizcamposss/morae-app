import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useCondominium } from "../../app/providers/useCondominium";
import { MetricCard } from "../../shared/components/MetricCard";
import { StatusBadge } from "../../shared/components/StatusBadge";
import { createNews, deleteNews, getNewsByCondominium } from "../news/newsService";
import type { NewsPriority, NewsResponse } from "../news/types";

export function SyndicCommunicationPage() {
  const { activeCondominium, activeCondominiumId } = useCondominium();
  const [news, setNews] = useState<NewsResponse[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [noticeToDelete, setNoticeToDelete] = useState<NewsResponse | null>(null);
  const [isDeletingNotice, setIsDeletingNotice] = useState(false);

  async function loadNews(condominiumId: number) {
    try {
      setIsLoading(true);
      setErrorMessage("");
      setNews(await getNewsByCondominium(condominiumId));
    } catch (error) {
      setNews([]);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível carregar os comunicados.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (!activeCondominiumId) {
      setNews([]);
      setIsLoading(false);
      return;
    }

    void loadNews(activeCondominiumId);
  }, [activeCondominiumId]);

  const filteredNews = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    if (!normalizedSearch) return news;

    return news.filter((item) =>
      [item.title, item.description]
        .join(" ")
        .toLowerCase()
        .includes(normalizedSearch),
    );
  }, [news, searchTerm]);

  const highPriorityNews = news.filter((item) => item.priority === 1);
  const residentNews = news.filter((item) => item.targetAudience === 1 || item.targetAudience === 4);

  async function handleDelete() {
    if (!noticeToDelete) return;

    try {
      setIsDeletingNotice(true);
      setErrorMessage("");
      setSuccessMessage("");
      await deleteNews(noticeToDelete.id);
      setNews((current) => current.filter((item) => item.id !== noticeToDelete.id));
      setNoticeToDelete(null);
      setSuccessMessage("Comunicado excluído.");
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível excluir o comunicado.",
      );
    } finally {
      setIsDeletingNotice(false);
    }
  }

  return (
    <>
      <section className="rounded-[2rem] border border-[#E5E7EB] bg-white p-5 shadow-sm sm:p-6 lg:p-7">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.38em] text-[#16A34A]">
              Comunicados
            </p>
            <h1 className="mt-3 text-3xl font-black tracking-tight text-[#111827] sm:text-4xl">
              Avisos do condomínio
            </h1>
            <p className="mt-2 text-sm font-semibold text-[#6B7280]">
              Publique e acompanhe comunicados de {activeCondominium?.condominiumName ?? "seu condomínio"}.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            disabled={!activeCondominiumId}
            className="h-11 cursor-pointer rounded-2xl bg-[#16A34A] px-5 text-sm font-extrabold text-white shadow-sm shadow-[#16A34A]/30 transition hover:bg-[#0B3D2E] disabled:cursor-not-allowed disabled:opacity-60"
          >
            + Novo comunicado
          </button>
        </div>

        {(errorMessage || successMessage) && (
          <div
            className={`mt-5 rounded-2xl border px-4 py-3 text-sm font-bold ${
              errorMessage
                ? "border-[#FECACA] bg-[#FDECEC] text-[#B42318]"
                : "border-[#BBF7D0] bg-[#DCFCE7] text-[#0B3D2E]"
            }`}
          >
            {errorMessage || successMessage}
          </div>
        )}

        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          <MetricCard
            label="Comunicados"
            value={news.length.toString()}
            helper="Publicados no backend"
          />
          <MetricCard
            label="Prioridade alta"
            value={highPriorityNews.length.toString()}
            helper="Precisam de atenção"
          />
          <MetricCard
            label="Para moradores"
            value={residentNews.length.toString()}
            helper="Visíveis ao público interno"
          />
        </div>

        <div className="mt-6 rounded-[1.5rem] border border-[#E5E7EB] bg-[#F3F4F6] p-4">
          <input
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Buscar comunicado..."
            className="mb-4 h-11 w-full rounded-2xl border border-[#E5E7EB] bg-white px-4 text-sm font-semibold text-[#111827] outline-none transition placeholder:text-[#9CA3AF] focus:border-[#22C55E] focus:ring-4 focus:ring-[#86EFAC]/30"
          />

          <div className="space-y-3">
            {isLoading ? (
              <EmptyPanel message="Carregando comunicados..." />
            ) : filteredNews.length === 0 ? (
              <EmptyPanel message="Nenhum comunicado encontrado." />
            ) : (
              filteredNews.map((item) => (
                <article
                  key={item.id}
                  className="rounded-2xl border border-[#E5E7EB] bg-white p-4 transition hover:border-[#86EFAC]"
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <h2 className="text-lg font-black text-[#111827]">{item.title}</h2>
                      <p className="mt-2 text-sm font-semibold leading-6 text-[#6B7280]">
                        {item.description}
                      </p>
                      <p className="mt-3 text-xs font-bold text-[#9CA3AF]">
                        Publicado em {formatDateTime(item.createdAt)}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge
                        label={getPriorityLabel(item.priority)}
                        variant={getPriorityVariant(item.priority)}
                      />
                      <button
                        type="button"
                        onClick={() => setNoticeToDelete(item)}
                        className="h-9 cursor-pointer rounded-xl border border-[#FECACA] bg-white px-3 text-xs font-black text-[#B42318] transition hover:bg-[#FDECEC]"
                      >
                        Excluir
                      </button>
                    </div>
                  </div>
                </article>
              ))
            )}
          </div>
        </div>
      </section>

      {isCreateOpen && activeCondominiumId && (
        <CreateNoticeModal
          condominiumId={activeCondominiumId}
          onClose={() => setIsCreateOpen(false)}
          onCreated={async () => {
            await loadNews(activeCondominiumId);
            setSuccessMessage("Comunicado publicado.");
          }}
        />
      )}

      {noticeToDelete && (
        <DeleteNoticeModal
          notice={noticeToDelete}
          isDeleting={isDeletingNotice}
          onClose={() => setNoticeToDelete(null)}
          onConfirm={() => void handleDelete()}
        />
      )}
    </>
  );
}

type CreateNoticeModalProps = {
  condominiumId: number;
  onClose: () => void;
  onCreated: () => Promise<void>;
};

function CreateNoticeModal({ condominiumId, onClose, onCreated }: CreateNoticeModalProps) {
  const [form, setForm] = useState({
    title: "",
    description: "",
    targetAudience: "1",
    priority: "2",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (form.title.trim().length < 3) {
      setErrorMessage("Informe um título com pelo menos 3 caracteres.");
      return;
    }

    if (form.description.trim().length < 5) {
      setErrorMessage("Informe uma mensagem com pelo menos 5 caracteres.");
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage("");

      await createNews({
        scope: 1,
        condominiumId,
        buildingId: null,
        title: form.title.trim(),
        description: form.description.trim(),
        targetAudience: Number(form.targetAudience) as 1 | 4,
        priority: Number(form.priority) as NewsPriority,
      });

      await onCreated();
      onClose();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível publicar o comunicado.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0B3D2E]/30 px-4 py-8 backdrop-blur-sm">
      <form
        onSubmit={(event) => void handleSubmit(event)}
        className="max-h-[calc(100vh-4rem)] w-full max-w-3xl overflow-y-auto rounded-[2rem] border border-[#E5E7EB] bg-white shadow-2xl shadow-[#0B3D2E]/20"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#E5E7EB] bg-white px-6 py-5">
          <h2 className="text-2xl font-black text-[#111827]">Novo comunicado</h2>
          <button
            type="button"
            onClick={onClose}
            className="flex size-10 cursor-pointer items-center justify-center rounded-full bg-[#F3F4F6] text-xl font-light text-[#6B7280] transition hover:bg-[#FDECEC] hover:text-[#B42318]"
          >
            ×
          </button>
        </div>

        <div className="space-y-5 px-5 py-6 sm:px-8">
          <TextField
            label="Título"
            value={form.title}
            onChange={(value) => setForm((current) => ({ ...current, title: value }))}
          />

          <label className="block">
            <span className="mb-2 block text-sm font-black text-[#111827]">Mensagem</span>
            <textarea
              value={form.description}
              onChange={(event) =>
                setForm((current) => ({ ...current, description: event.target.value }))
              }
              className="min-h-36 w-full resize-none rounded-2xl border border-[#E5E7EB] bg-white px-4 py-3 text-sm font-bold text-[#111827] outline-none transition focus:border-[#22C55E] focus:ring-4 focus:ring-[#86EFAC]/30"
            />
          </label>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <SelectField
              label="Público"
              value={form.targetAudience}
              onChange={(value) =>
                setForm((current) => ({ ...current, targetAudience: value }))
              }
              options={[
                { label: "Todos", value: "1" },
                { label: "Moradores", value: "4" },
              ]}
            />
            <SelectField
              label="Prioridade"
              value={form.priority}
              onChange={(value) => setForm((current) => ({ ...current, priority: value }))}
              options={[
                { label: "Alta", value: "1" },
                { label: "Normal", value: "2" },
                { label: "Baixa", value: "3" },
              ]}
            />
          </div>

          {errorMessage && (
            <p className="rounded-2xl border border-[#FECACA] bg-[#FDECEC] px-4 py-3 text-sm font-bold text-[#B42318]">
              {errorMessage}
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="h-12 w-full cursor-pointer rounded-2xl bg-[#16A34A] text-sm font-black text-white shadow-sm shadow-[#16A34A]/25 transition hover:bg-[#0B3D2E] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting ? "Publicando..." : "Publicar comunicado"}
          </button>
        </div>
      </form>
    </div>
  );
}

function DeleteNoticeModal({
  notice,
  isDeleting,
  onClose,
  onConfirm,
}: {
  notice: NewsResponse;
  isDeleting: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0B3D2E]/30 px-4 py-8 backdrop-blur-sm">
      <div className="w-full max-w-xl overflow-hidden rounded-[2rem] border border-[#E5E7EB] bg-white shadow-2xl shadow-[#0B3D2E]/20">
        <div className="flex items-center justify-between border-b border-[#E5E7EB] px-6 py-5">
          <div>
            <h2 className="text-2xl font-black text-[#111827]">Excluir comunicado</h2>
            <p className="mt-1 text-sm font-semibold text-[#6B7280]">
              Confirme apenas se este aviso não deve mais aparecer para os moradores.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="flex size-10 cursor-pointer items-center justify-center rounded-full bg-[#F3F4F6] text-xl font-light text-[#6B7280] transition hover:bg-[#FDECEC] hover:text-[#B42318] disabled:cursor-not-allowed disabled:opacity-60"
          >
            ×
          </button>
        </div>

        <div className="space-y-5 px-6 py-6">
          <div className="rounded-3xl border border-[#FECACA] bg-[#FDECEC] p-5">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#B42318]">
              Ação permanente
            </p>
            <h3 className="mt-3 text-lg font-black text-[#7A271A]">
              {notice.title}
            </h3>
            <p className="mt-2 line-clamp-3 text-sm font-semibold leading-6 text-[#B42318]">
              {notice.description}
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={onClose}
              disabled={isDeleting}
              className="h-12 flex-1 cursor-pointer rounded-2xl border border-[#E5E7EB] bg-white text-sm font-extrabold text-[#6B7280] transition hover:bg-[#F3F4F6] disabled:cursor-not-allowed disabled:opacity-60"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isDeleting}
              className="h-12 flex-1 cursor-pointer rounded-2xl bg-[#B42318] text-sm font-extrabold text-white transition hover:bg-[#912018] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isDeleting ? "Excluindo..." : "Excluir comunicado"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

type TextFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
};

function TextField({ label, value, onChange }: TextFieldProps) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-black text-[#111827]">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-12 w-full rounded-2xl border border-[#E5E7EB] bg-white px-4 text-sm font-bold text-[#111827] outline-none transition focus:border-[#22C55E] focus:ring-4 focus:ring-[#86EFAC]/30"
      />
    </label>
  );
}

type SelectFieldProps = {
  label: string;
  value: string;
  options: Array<{ label: string; value: string }>;
  onChange: (value: string) => void;
};

function SelectField({ label, value, options, onChange }: SelectFieldProps) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = options.find((option) => option.value === value);

  return (
    <div className="relative">
      <span className="mb-2 block text-sm font-black text-[#111827]">{label}</span>
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className={`flex h-12 w-full cursor-pointer items-center justify-between rounded-2xl border bg-white px-4 text-left text-sm font-bold text-[#111827] outline-none transition ${
          isOpen
            ? "border-[#22C55E] ring-4 ring-[#86EFAC]/30"
            : "border-[#E5E7EB] hover:border-[#BBF7D0]"
        }`}
      >
        <span>{selectedOption?.label ?? "Selecione"}</span>
        <span className={`text-[#6B7280] transition ${isOpen ? "rotate-180" : ""}`}>
          ⌄
        </span>
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 z-30 mt-2 overflow-hidden rounded-2xl border border-[#D9DEE5] bg-white p-1 shadow-xl shadow-[#111827]/10">
          {options.map((option) => {
            const isSelected = option.value === value;

            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={`flex min-h-10 w-full cursor-pointer items-center rounded-xl px-3 py-2 text-left text-sm font-bold transition ${
                  isSelected
                    ? "bg-[#DCFCE7] text-[#0B3D2E]"
                    : "text-[#4B5563] hover:bg-[#F3F4F6] hover:text-[#111827]"
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function EmptyPanel({ message }: { message: string }) {
  return (
    <div className="rounded-2xl bg-white px-4 py-10 text-center text-sm font-bold text-[#6B7280]">
      {message}
    </div>
  );
}

function getPriorityLabel(priority: NewsPriority) {
  if (priority === 1) return "Alta";
  if (priority === 3) return "Baixa";
  return "Normal";
}

function getPriorityVariant(priority: NewsPriority) {
  if (priority === 1) return "danger";
  if (priority === 3) return "neutral";
  return "success";
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
