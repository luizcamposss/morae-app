import { useEffect, useMemo, useState, type ReactNode } from "react";
import { getMyCondominiums } from "../../features/me/meService";
import { CondominiumContext, type CondominiumContextValue } from "./CondominiumContext";
import { useAuth } from "./useAuth";

// Per user, so another account on the same browser does not inherit the choice. It is kept on
// logout and while the session is still loading on a reload (user still null).
const ACTIVE_CONDOMINIUM_STORAGE_KEY = "morae.active.condominium";

function storageKey(userId: number) {
  return `${ACTIVE_CONDOMINIUM_STORAGE_KEY}.${userId}`;
}

function readStoredCondominiumId(userId: number) {
  try {
    return Number(localStorage.getItem(storageKey(userId)));
  } catch {
    return null;
  }
}

function storeCondominiumId(userId: number | undefined, condominiumId: number | null) {
  if (userId === undefined) return;

  try {
    if (condominiumId === null) localStorage.removeItem(storageKey(userId));
    else localStorage.setItem(storageKey(userId), condominiumId.toString());
  } catch {
    // Storage blocked (private mode): the choice just lasts until the next reload.
  }
}

type CondominiumProviderProps = {
  children: ReactNode;
};

export function CondominiumProvider({ children }: CondominiumProviderProps) {
  const { isAuthenticated, user } = useAuth();
  const [condominiums, setCondominiums] = useState<CondominiumContextValue["condominiums"]>([]);
  const [activeCondominiumId, setActiveCondominiumIdState] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const activeCondominium = useMemo(
    () =>
      condominiums.find((condominium) => condominium.condominiumId === activeCondominiumId) ?? null,
    [activeCondominiumId, condominiums],
  );

  function setActiveCondominiumId(condominiumId: number) {
    setActiveCondominiumIdState(condominiumId);
    storeCondominiumId(user?.userId, condominiumId);
  }

  async function refreshCondominiums() {
    if (!isAuthenticated) {
      setCondominiums([]);
      setActiveCondominiumIdState(null);
      setErrorMessage("");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setErrorMessage("");

    try {
      const result = await getMyCondominiums();
      setCondominiums(result);

      if (result.length === 0) {
        setActiveCondominiumIdState(null);
        storeCondominiumId(user?.userId, null);
        return;
      }

      const storedCondominiumId = user ? readStoredCondominiumId(user.userId) : null;
      const hasStoredCondominium = result.some(
        (condominium) => condominium.condominiumId === storedCondominiumId,
      );

      const preferredCondominium =
        result.find((condominium) => condominium.role === "Admin") ?? result[0];

      const nextActiveCondominiumId = hasStoredCondominium
        ? storedCondominiumId
        : preferredCondominium.condominiumId;

      setActiveCondominiumIdState(nextActiveCondominiumId);
      storeCondominiumId(user?.userId, nextActiveCondominiumId);
    } catch (error) {
      setCondominiums([]);
      setActiveCondominiumIdState(null);

      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("Nao foi possivel carregar os condominios.");
      }
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void refreshCondominiums();
  }, [isAuthenticated, user?.userId]);

  const value: CondominiumContextValue = {
    condominiums,
    activeCondominium,
    activeCondominiumId,
    isLoading,
    errorMessage,
    setActiveCondominiumId,
    refreshCondominiums,
  };

  return <CondominiumContext.Provider value={value}>{children}</CondominiumContext.Provider>;
}
