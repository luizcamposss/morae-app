import { createContext } from "react";

export type GuideContextValue = {
  // Starts the tour of the user's role now (Ajustes → "Ver tutorial").
  startTour: () => void;
  showTips: boolean;
  setShowTips: (value: boolean) => Promise<void>;
  // Shows the screen tips again, from the start (the tour stays as seen).
  resetTips: () => Promise<void>;
  hasTour: boolean;
};

export const GuideContext = createContext<GuideContextValue | null>(null);
