import { useState } from "react";
import { Check } from "lucide-react";
import { GroupedList } from "../../shared/components/GroupedList";
import { Switch } from "../../shared/components/Switch";
import { useGuide } from "./useGuide";

// Ajustes → "Ajuda e tutorial": each chapter of the role's tour (✓ = already seen) and the screen
// tips on/off.
export function HelpSettings() {
  const { chapters, startChapter, showTips, setShowTips } = useGuide();
  const [isSaving, setIsSaving] = useState(false);

  if (!chapters.length) return null;

  async function toggleTips(checked: boolean) {
    setIsSaving(true);
    await setShowTips(checked);
    setIsSaving(false);
  }

  return (
    <GroupedList title="Ajuda e tutorial" footer="Cada capítulo mostra uma parte do Moraê, tela por tela. Dá para ver quantas vezes quiser.">
      {chapters.map((chapter, index) => (
        <li key={chapter.key}>
          <button type="button" onClick={() => startChapter(chapter.key)} className="flex w-full items-center gap-3.5 px-5 py-3.5 text-left transition-colors hover:bg-campo/60">
            <span
              aria-hidden
              className={`grid size-9 shrink-0 place-items-center rounded-[9px] text-sm font-bold tabular-nums ${chapter.seen ? "bg-verde-suave text-verde-tinta" : "bg-campo text-tinta-suave"}`}
            >
              {chapter.seen ? <Check size={18} strokeWidth={2.2} /> : index + 1}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[15px] font-semibold text-tinta">{chapter.title}</span>
              <span className="block truncate text-[13px] text-tinta-suave">
                {chapter.count} passos{chapter.seen ? " · visto" : ""}
              </span>
            </span>
            <span className="shrink-0 text-sm font-semibold text-verde-tinta">{chapter.seen ? "Ver de novo" : "Ver"}</span>
          </button>
        </li>
      ))}
      <li className="px-5">
        <Switch label="Dicas nas telas" description="Uma dica rápida na primeira vez em cada tela" checked={showTips} disabled={isSaving} onChange={(checked) => void toggleTips(checked)} />
      </li>
    </GroupedList>
  );
}
