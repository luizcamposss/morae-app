import { useEffect, useState } from "react";

function readStoredIds(storageKey: string) {
  try {
    const storedValue = localStorage.getItem(storageKey);
    const parsedValue = storedValue ? JSON.parse(storedValue) : [];

    if (!Array.isArray(parsedValue)) {
      return new Set<string>();
    }

    return new Set(parsedValue.filter((item): item is string => typeof item === "string"));
  } catch {
    return new Set<string>();
  }
}

function writeStoredIds(storageKey: string, ids: Set<string>) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(Array.from(ids)));
  } catch {
    // Se o navegador bloquear storage, a limpeza continua valendo na sessão atual.
  }
}

export function usePersistentClearedIds(storageKey: string) {
  const [ids, setIdsState] = useState<Set<string>>(() => readStoredIds(storageKey));

  useEffect(() => {
    setIdsState(readStoredIds(storageKey));
  }, [storageKey]);

  function setIds(nextIds: Set<string>) {
    setIdsState(nextIds);
    writeStoredIds(storageKey, nextIds);
  }

  return [ids, setIds] as const;
}
