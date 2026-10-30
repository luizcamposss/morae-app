import { createContext } from "react";
import type { MeResponse } from "../../features/me/types";

export type AuthContextValue = {
  user: MeResponse | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  logout: () => void;
  refreshUser: () => Promise<MeResponse | null>;
};

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);
