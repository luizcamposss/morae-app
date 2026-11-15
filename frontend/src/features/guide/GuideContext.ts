import { createContext } from "react";

export type GuideContextValue = {
  // Starts the tour of the user's role now (Ajustes → "Ver tutorial").
  startTour: () => void;
  showTips: boolean;
  // Turning them back on shows every screen tip again (the tour stays as seen).
  setShowTips: (value: boolean) => Promise<void>;
  hasTour: boolean;
};

export const GuideContext = createContext<GuideContextValue | null>(null);
