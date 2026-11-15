import { createContext } from "react";
import type { ChapterInfo } from "./types";

export type GuideContextValue = {
  // The role's tour chapters, in order (Ajustes → "Ajuda e tutorial").
  chapters: ChapterInfo[];
  startChapter: (key: string) => void;
  showTips: boolean;
  // Turning them back on shows every screen tip again (the tour stays as seen).
  setShowTips: (value: boolean) => Promise<void>;
};

export const GuideContext = createContext<GuideContextValue | null>(null);
