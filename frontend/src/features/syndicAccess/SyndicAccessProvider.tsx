import { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import { useCondominium } from "../../app/providers/useCondominium";
import { SyndicAccessContext } from "./SyndicAccessContext";
import { getMySyndicAccess, noSyndicAccess, type SyndicAccessSettings } from "./syndicAccessService";

type LoadedAccess = {
  condominiumId: number;
  access: SyndicAccessSettings;
};

// Loads the syndic's permissions for the active condominium once for the whole syndic area.
// Denies by default: while loading nothing is allowed, and a failed request allows nothing.
export function SyndicAccessProvider() {
  const { activeCondominiumId } = useCondominium();
  const [loaded, setLoaded] = useState<LoadedAccess | null>(null);

  useEffect(() => {
    if (!activeCondominiumId) {
      return;
    }

    let isMounted = true;

    getMySyndicAccess(activeCondominiumId)
      .catch(() => noSyndicAccess)
      .then((access) => {
        if (isMounted) {
          setLoaded({ condominiumId: activeCondominiumId, access });
        }
      });

    return () => {
      isMounted = false;
    };
  }, [activeCondominiumId]);

  const access = loaded && loaded.condominiumId === activeCondominiumId ? loaded.access : null;

  return (
    <SyndicAccessContext.Provider value={access}>
      <Outlet />
    </SyndicAccessContext.Provider>
  );
}
