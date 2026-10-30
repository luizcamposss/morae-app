import { useState } from "react";

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
  const [state, setState] = useState(() => ({ storageKey, ids: readStoredIds(storageKey) }));

  // A new key (another condominium) reloads its own ids right in this render, without an effect.
  if (state.storageKey !== storageKey) {
    setState({ storageKey, ids: readStoredIds(storageKey) });
  }

  function setIds(nextIds: Set<string>) {
    setState({ storageKey, ids: nextIds });
    writeStoredIds(storageKey, nextIds);
  }

  return [state.ids, setIds] as const;
}
