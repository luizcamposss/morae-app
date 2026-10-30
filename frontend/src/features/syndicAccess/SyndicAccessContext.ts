import { createContext } from "react";
import type { SyndicAccessSettings } from "./syndicAccessService";

// null = still loading; undefined (no provider) = not inside the syndic area.
export const SyndicAccessContext = createContext<SyndicAccessSettings | null | undefined>(undefined);
