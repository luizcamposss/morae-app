import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../app/providers/useAuth";
import { completeMercadoPagoOAuth } from "./mercadoPagoService";
import { MercadoPagoReturnLayout } from "./MercadoPagoReturnLayout";
import { getOAuthReturnPath } from "./returnPath";

type Result = { status: "loading" } | { status: "success" } | { status: "error"; message: string };

export function MercadoPagoOAuthReturnPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [completeResult, setCompleteResult] = useState<Result>({ status: "loading" });
  const [returnPath] = useState(() => getOAuthReturnPath());
  const hasStarted = useRef(false);

  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  useEffect(() => {
    // The OAuth state is single-use: never send it twice (React StrictMode runs effects twice in dev).
    if (!code || !state || hasStarted.current) {
      return;
    }

    hasStarted.current = true;

    completeMercadoPagoOAuth(code, state)
      .then(() => setCompleteResult({ status: "success" }))
      .catch((completeError: unknown) =>
        setCompleteResult({
          status: "error",
          message:
            completeError instanceof Error
              ? completeError.message
              : "Não foi possível concluir a conexão com o Mercado Pago.",
        }),
      );
  }, [code, state]);

  const result: Result =
    code && state
      ? completeResult
      : {
          status: "error",
          message:
            error === "access_denied"
              ? "A autorização foi cancelada no Mercado Pago. Nenhuma conta foi conectada."
              : "O Mercado Pago não retornou uma autorização válida. Tente conectar novamente.",
        };

  const settingsPath =
    returnPath ?? (user?.roles.includes("Master") ? "/master/settings" : "/admin/settings");

  if (result.status === "loading") {
    return (
      <MercadoPagoReturnLayout
        title="Conectando..."
        tone="loading"
        description="Estamos concluindo a conexão da sua conta Mercado Pago."
      />
    );
  }

  return (
    <MercadoPagoReturnLayout
      title={result.status === "success" ? "Conta conectada" : "Conexão não concluída"}
      tone={result.status === "success" ? "success" : "error"}
      description={
        result.status === "success"
          ? "A conta Mercado Pago foi conectada. As cobranças já podem ser pagas online."
          : result.message
      }
      actionLabel="Voltar para configurações"
      onAction={() => navigate(settingsPath, { replace: true })}
    />
  );
}
