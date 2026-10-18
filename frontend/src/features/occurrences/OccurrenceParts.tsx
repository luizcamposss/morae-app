import { useEffect, useState } from "react";
import { Download, ImageOff } from "lucide-react";
import { MoraeMark } from "../../shared/components/MoraeMark";
import { statusMeta } from "./occurrenceMeta";
import { downloadOccurrencePhoto, getOccurrencePhoto } from "./occurrenceService";
import type { OccurrencePhoto, OccurrenceStatus } from "./types";

export function StatusChip({ status }: { status: OccurrenceStatus }) {
  const meta = statusMeta(status);
  return <span className={`shrink-0 rounded-chip px-2 py-0.5 text-xs font-semibold ${meta.tone}`}>{meta.label}</span>;
}

// Photos need the token, so each one is fetched as a Blob and shown from an object URL.
export function PhotoThumb({ photo, index }: { photo: OccurrencePhoto; index: number }) {
  const [state, setState] = useState<{ url: string | null; failed: boolean }>({
    url: null,
    failed: false,
  });

  useEffect(() => {
    let isMounted = true;
    let objectUrl: string | null = null;

    getOccurrencePhoto(photo.id)
      .then((blob) => {
        objectUrl = URL.createObjectURL(blob);
        if (isMounted) setState({ url: objectUrl, failed: false });
      })
      .catch(() => isMounted && setState({ url: null, failed: true }));

    return () => {
      isMounted = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [photo.id]);

  return (
    <li className="group relative aspect-square overflow-hidden rounded-field bg-campo">
      {state.url ? (
        <a href={state.url} target="_blank" rel="noreferrer" aria-label={`Ver foto ${index + 1} em tamanho real`} className="block size-full">
          <img
            src={state.url}
            alt={`Foto ${index + 1} da ocorrência`}
            onError={() => setState({ url: null, failed: true })}
            className="size-full object-cover transition-transform duration-200 ease-out group-hover:scale-[1.03]"
          />
        </a>
      ) : (
        <span className="grid size-full place-items-center text-tinta-suave">
          {state.failed ? <ImageOff size={20} strokeWidth={1.8} aria-label="Foto indisponível" /> : <MoraeMark size={18} motion="respiro" />}
        </span>
      )}
      <button
        type="button"
        onClick={() => void downloadOccurrencePhoto(photo).catch(() => setState((current) => ({ ...current, failed: true })))}
        aria-label={`Baixar foto ${index + 1}`}
        className="absolute bottom-1.5 right-1.5 grid size-8 place-items-center rounded-full bg-superficie/90 text-tinta shadow-whisper transition-colors hover:bg-superficie"
      >
        <Download size={15} strokeWidth={1.8} aria-hidden />
      </button>
    </li>
  );
}
