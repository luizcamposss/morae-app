import { Megaphone } from "lucide-react";
import { Button } from "../../shared/components/Button";
import { Modal } from "../../shared/components/Modal";
import { formatDateTime } from "../../shared/lib/date";
import { NEWS_PRIORITY } from "./newsPriority";
import { PriorityChip } from "./PriorityChip";
import type { NewsResponse } from "./types";

type NewsDetailsModalProps = {
  news: NewsResponse;
  // Who receives it, e.g. "para os administradores".
  audienceLabel: string;
  onClose: () => void;
  // Without these the notice is read-only (e.g. platform notices seen by an Admin).
  onEdit?: () => void;
  onDelete?: () => void;
};

export function NewsDetailsModal({ news, audienceLabel, onClose, onEdit, onDelete }: NewsDetailsModalProps) {
  const isImportant = news.priority === NEWS_PRIORITY.high;
  const canManage = Boolean(onEdit || onDelete);

  return (
    <Modal
      title={news.title}
      description={
        <span className="flex flex-wrap items-center gap-2">
          <PriorityChip priority={news.priority} />
          <span>
            Publicado em {formatDateTime(news.createdAt)} · {audienceLabel}
          </span>
        </span>
      }
      leading={
        <span className={`grid size-11 place-items-center rounded-block ${isImportant ? "bg-vermelho-suave text-vermelho" : "bg-verde-suave text-verde-tinta"}`}>
          <Megaphone size={20} strokeWidth={1.8} aria-hidden />
        </span>
      }
      size="lg"
      onClose={onClose}
      footer={
        canManage ? (
          <>
            {onDelete && (
              <button type="button" onClick={onDelete} className="mr-auto rounded-full px-3 text-sm font-semibold text-vermelho hover:underline">
                Apagar aviso
              </button>
            )}
            {onEdit && <Button onClick={onEdit}>Editar aviso</Button>}
          </>
        ) : (
          <Button variant="quiet" onClick={onClose}>
            Fechar
          </Button>
        )
      }
    >
      <p className="whitespace-pre-line text-[15px] leading-relaxed text-tinta">{news.description}</p>
    </Modal>
  );
}
