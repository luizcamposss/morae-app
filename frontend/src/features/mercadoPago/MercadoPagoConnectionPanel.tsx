import { useEffect, useState } from "react";
import {
  getMercadoPagoConnectionStatus,
  startMercadoPagoOAuth,
} from "./mercadoPagoService";
import type { MercadoPagoConnectionStatus } from "./types";

type MercadoPagoConnectionPanelProps = {
  contextLabel: string;
  onBack: () => void;
};

export function MercadoPagoConnectionPanel({
  contextLabel,
  onBack,
}: MercadoPagoConnectionPanelProps) {
  const [connection, setConnection] = useState<MercadoPagoConnectionStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function loadConnection() {
    try {
      setIsLoading(true);
      setErrorMessage("");
      setConnection(await getMercadoPagoConnectionStatus());
    } catch (error) {
      setConnection(null);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Nao foi possivel carregar a conexao Mercado Pago.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadConnection();
  }, []);

  async function handleConnect() {
    try {
      setIsConnecting(true);
      setErrorMessage("");

      const result = await startMercadoPagoOAuth();
      window.location.assign(result.authorizationUrl);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Nao foi possivel iniciar a conexao com Mercado Pago.",
      );
      setIsConnecting(false);
    }
  }

  const isConnected = Boolean(connection?.isConnected);

  return (
    <div className="space-y-5">
      <div
        className={`rounded-2xl border px-5 py-4 ${
          isConnected
            ? "border-[#BBF7D0] bg-[#ECFDF5] text-[#065F46]"
            : "border-[#FDE68A] bg-[#FFFBEB] text-[#92400E]"
        }`}
      >
        <p className="text-xs font-black uppercase tracking-[0.16em]">Mercado Pago</p>
        <p className="mt-1 text-lg font-black text-[#111827]">
          {isLoading
            ? "Verificando conexao..."
            : isConnected
              ? "Conta conectada"
              : "Conta nao conectada"}
        </p>
        <p className="mt-1 text-sm font-semibold leading-6">
          {isConnected
            ? `${contextLabel} ja pode usar a conta Mercado Pago conectada.`
            : `Conecte a conta Mercado Pago para ativar recebimentos automaticos em ${contextLabel}.`}
        </p>
      </div>

      {isConnected && connection && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <InfoItem
            label="Usuario MP"
            value={connection.mercadoPagoUserId?.toString() ?? "-"}
          />
          <InfoItem label="Ambiente" value={connection.liveMode ? "Producao" : "Teste"} />
          <InfoItem label="Escopo" value={connection.scope || "-"} />
          <InfoItem label="Atualizado em" value={formatDateTime(connection.updatedAt)} />
        </div>
      )}

      {errorMessage && (
        <div className="rounded-2xl border border-[#FECACA] bg-[#FDECEC] px-4 py-3 text-sm font-bold text-[#B42318]">
          {errorMessage}
        </div>
      )}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
        <button
          type="button"
          onClick={onBack}
          className="h-11 cursor-pointer rounded-2xl border border-[#E5E7EB] bg-white px-5 text-sm font-black text-[#6B7280] transition hover:bg-[#F3F4F6] hover:text-[#111827]"
        >
          Voltar
        </button>

        <button
          type="button"
          onClick={() => void handleConnect()}
          disabled={isLoading || isConnecting}
          className="h-11 cursor-pointer rounded-2xl bg-[#0284C7] px-5 text-sm font-black text-white shadow-sm shadow-[#0284C7]/25 transition hover:bg-[#075985] disabled:cursor-not-allowed disabled:bg-[#9CA3AF]"
        >
          {isConnecting
            ? "Abrindo Mercado Pago..."
            : isConnected
              ? "Reconectar Mercado Pago"
              : "Conectar Mercado Pago"}
        </button>
      </div>
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] px-4 py-3">
      <p className="text-xs font-black uppercase tracking-[0.14em] text-[#6B7280]">
        {label}
      </p>
      <p className="mt-1 break-all text-sm font-black text-[#111827]">{value}</p>
    </div>
  );
}

function formatDateTime(value?: string | null) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}
