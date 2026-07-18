import { useEffect, useMemo, useState, type ReactNode } from "react";
import { getMyCondominiums } from "../../features/me/meService";
import { CondominiumContext, type CondominiumContextValue } from "./CondominiumContext";
import { useAuth } from "./useAuth";

const ACTIVE_CONDOMINIUM_STORAGE_KEY = "morae.active.condominium";

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
    localStorage.setItem(ACTIVE_CONDOMINIUM_STORAGE_KEY, condominiumId.toString());
  }

  async function refreshCondominiums() {
    if (!isAuthenticated) {
      setCondominiums([]);
      setActiveCondominiumIdState(null);
      setErrorMessage("");
      setIsLoading(false);
      localStorage.removeItem(ACTIVE_CONDOMINIUM_STORAGE_KEY);
      return;
    }

    setIsLoading(true);
    setErrorMessage("");

    try {
      const result = await getMyCondominiums();
      setCondominiums(result);

      if (result.length === 0) {
        setActiveCondominiumIdState(null);
        localStorage.removeItem(ACTIVE_CONDOMINIUM_STORAGE_KEY);
        return;
      }

      const storedCondominiumId = Number(localStorage.getItem(ACTIVE_CONDOMINIUM_STORAGE_KEY));
      const hasStoredCondominium = result.some(
        (condominium) => condominium.condominiumId === storedCondominiumId,
      );

      const preferredCondominium =
        result.find((condominium) => condominium.role === "Admin") ?? result[0];

      const nextActiveCondominiumId = hasStoredCondominium
        ? storedCondominiumId
        : preferredCondominium.condominiumId;

      setActiveCondominiumIdState(nextActiveCondominiumId);
      localStorage.setItem(
        ACTIVE_CONDOMINIUM_STORAGE_KEY,
        nextActiveCondominiumId.toString(),
      );
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
