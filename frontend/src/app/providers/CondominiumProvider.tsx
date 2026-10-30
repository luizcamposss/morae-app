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

type LoadedCondominiums = {
  condominiums: CondominiumContextValue["condominiums"];
  activeCondominiumId: number | null;
  errorMessage: string;
};

// The user's condominiums and which one is active. Never touches React state, so the effect
// only applies the result (and drops it if the user changed meanwhile).
async function loadCondominiums(userId: number | undefined): Promise<LoadedCondominiums> {
  if (userId === undefined) {
    return { condominiums: [], activeCondominiumId: null, errorMessage: "" };
  }

  try {
    const result = await getMyCondominiums();

    if (result.length === 0) {
      storeCondominiumId(userId, null);
      return { condominiums: result, activeCondominiumId: null, errorMessage: "" };
    }

    const storedCondominiumId = readStoredCondominiumId(userId);
    const hasStoredCondominium = result.some(
      (condominium) => condominium.condominiumId === storedCondominiumId,
    );

    const preferredCondominium =
      result.find((condominium) => condominium.role === "Admin") ?? result[0];

    const nextActiveCondominiumId = hasStoredCondominium
      ? storedCondominiumId
      : preferredCondominium.condominiumId;

    storeCondominiumId(userId, nextActiveCondominiumId);
    return { condominiums: result, activeCondominiumId: nextActiveCondominiumId, errorMessage: "" };
  } catch (error) {
    return {
      condominiums: [],
      activeCondominiumId: null,
      errorMessage: error instanceof Error ? error.message : "Não foi possível carregar os condomínios.",
    };
  }
}

export function CondominiumProvider({ children }: CondominiumProviderProps) {
  const { isAuthenticated, user } = useAuth();
  const userId = isAuthenticated ? user?.userId : undefined;
  // Which user the loaded data belongs to: while it differs from the current one, it's loading.
  const [loaded, setLoaded] = useState<LoadedCondominiums & { userId: number | undefined | null }>({
    userId: null,
    condominiums: [],
    activeCondominiumId: null,
    errorMessage: "",
  });
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { condominiums, activeCondominiumId, errorMessage } = loaded;
  const isLoading = loaded.userId !== userId || isRefreshing;

  const activeCondominium = useMemo(
    () =>
      condominiums.find((condominium) => condominium.condominiumId === activeCondominiumId) ?? null,
    [activeCondominiumId, condominiums],
  );

  function setActiveCondominiumId(condominiumId: number) {
    setLoaded((current) => ({ ...current, activeCondominiumId: condominiumId }));
    storeCondominiumId(user?.userId, condominiumId);
  }

  async function refreshCondominiums() {
    setIsRefreshing(true);

    try {
      const result = await loadCondominiums(userId);
      setLoaded({ userId, ...result });
    } finally {
      setIsRefreshing(false);
    }
  }

  useEffect(() => {
    let isCurrent = true;

    void loadCondominiums(userId).then((result) => {
      if (isCurrent) setLoaded({ userId, ...result });
    });

    return () => {
      isCurrent = false;
    };
  }, [userId]);

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
