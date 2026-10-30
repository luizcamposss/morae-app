import { useContext } from "react";
import { CondominiumContext } from "./CondominiumContext";

export function useCondominium() {
  const context = useContext(CondominiumContext);

  if (!context) {
    throw new Error("useCondominium deve ser usado dentro de CondominiumProvider.");
  }

  return context;
}
