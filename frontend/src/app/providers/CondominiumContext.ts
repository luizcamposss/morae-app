import { createContext } from "react";
import type { MeCondominiumResponse } from "../../features/me/types";

export type CondominiumContextValue = {
  condominiums: MeCondominiumResponse[];
  activeCondominium: MeCondominiumResponse | null;
  activeCondominiumId: number | null;
  isLoading: boolean;
  errorMessage: string;
  setActiveCondominiumId: (condominiumId: number) => void;
  refreshCondominiums: () => Promise<void>;
};

export const CondominiumContext = createContext<CondominiumContextValue | undefined>(undefined);
