import { useState } from "react";
import { Compass } from "lucide-react";
import { GroupedList, GroupedRow } from "../../shared/components/GroupedList";
import { Switch } from "../../shared/components/Switch";
import { useGuide } from "./useGuide";

// Ajustes → "Ajuda e tutorial": the role's tour on demand and the screen tips on/off.
export function HelpSettings() {
  const { hasTour, startTour, showTips, setShowTips, resetTips } = useGuide();
  const [isSaving, setIsSaving] = useState(false);

  if (!hasTour) return null;

  async function toggleTips(checked: boolean) {
    setIsSaving(true);
    // Turning the tips back on shows them again from the start.
    await (checked ? resetTips().then(() => setShowTips(true)) : setShowTips(false));
    setIsSaving(false);
  }

  return (
    <GroupedList title="Ajuda e tutorial">
      <GroupedRow icon={Compass} tone="green" title="Ver tutorial" subtitle="Um passeio rápido pelas telas principais" onClick={startTour} />
      <li className="px-5">
        <Switch
          label="Dicas nas telas"
          description="Uma dica rápida na primeira vez em cada tela"
          checked={showTips}
          disabled={isSaving}
          onChange={(checked) => void toggleTips(checked)}
        />
      </li>
    </GroupedList>
  );
}
