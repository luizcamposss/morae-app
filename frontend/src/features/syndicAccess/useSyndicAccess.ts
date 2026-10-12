import { useContext } from "react";
import { SyndicAccessContext } from "./SyndicAccessContext";

export function useSyndicAccess() {
  return useContext(SyndicAccessContext);
}
