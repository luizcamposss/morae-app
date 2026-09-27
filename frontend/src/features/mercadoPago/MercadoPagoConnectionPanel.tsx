import { useEffect, useState } from "react";
import {
  disconnectMercadoPago,
  getMercadoPagoConnectionStatus,
  startMercadoPagoOAuth,
} from "./mercadoPagoService";
import { saveOAuthReturnPath } from "./returnPath";
import type { MercadoPagoConnectionStatus } from "./types";

type MercadoPagoConnectionPanelProps = {
  contextLabel: string;
  // Omit for the platform account (Master); pass the active condominium for its account (Admin).
  condominiumId?: number | null;
  onBack: () => void;
};

export function MercadoPagoConnectionPanel({
  contextLabel,
  condominiumId,
  onBack,
}: MercadoPagoConnectionPanelProps) {
  const [connection, setConnection] = useState<MercadoPagoConnectionStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [isConfirmingDisconnect, setIsConfirmingDisconnect] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadConnection() {
      try {
        setIsLoading(true);
        setErrorMessage("");
        const result = await getMercadoPagoConnectionStatus(condominiumId);

        if (isMounted) {
          setConnection(result);
        }
      } catch (error) {
        if (isMounted) {
          setConnection(null);
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "Não foi possível carregar a conexão com o Mercado Pago.",
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadConnection();

    return () => {
      isMounted = false;
    };
  }, [condominiumId]);

  async function handleConnect() {
    try {
      setIsConnecting(true);
      setErrorMessage("");

      const result = await startMercadoPagoOAuth(condominiumId);
      saveOAuthReturnPath();
      window.location.assign(result.authorizationUrl);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível iniciar a conexão com o Mercado Pago.",
      );
      setIsConnecting(false);
    }
  }

  async function handleDisconnect() {
    try {
      setIsDisconnecting(true);
      setErrorMessage("");

      await disconnectMercadoPago(condominiumId);
      setConnection(await getMercadoPagoConnectionStatus(condominiumId));
      setIsConfirmingDisconnect(false);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível desconectar o Mercado Pago.",
      );
    } finally {
      setIsDisconnecting(false);
    }
  }

  const isConnected = Boolean(connection?.isConnected);
  const isBusy = isLoading || isConnecting || isDisconnecting;

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
            ? "Verificando conexão..."
            : isConnected
              ? "Conta conectada"
              : "Conta não conectada"}
        </p>
        <p className="mt-1 text-sm font-semibold leading-6">
          {isConnected
            ? `Os pagamentos online de ${contextLabel} caem nesta conta Mercado Pago.`
            : `Conecte uma conta Mercado Pago para receber pagamentos online de ${contextLabel}.`}
        </p>
      </div>

      {isConnected && connection && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <InfoItem
            label="Usuário MP"
            value={connection.mercadoPagoUserId?.toString() ?? "-"}
          />
          <InfoItem label="Ambiente" value={connection.liveMode ? "Produção" : "Teste"} />
          <InfoItem label="Conectada em" value={formatDateTime(connection.connectedAt)} />
          <InfoItem label="Atualizada em" value={formatDateTime(connection.updatedAt)} />
        </div>
      )}

      {errorMessage && (
        <div className="rounded-2xl border border-[#FECACA] bg-[#FDECEC] px-4 py-3 text-sm font-bold text-[#B42318]">
          {errorMessage}
        </div>
      )}

      {isConfirmingDisconnect && (
        <div className="space-y-3 rounded-2xl border border-[#FECACA] bg-[#FFF5F5] px-4 py-4">
          <p className="text-sm font-bold leading-6 text-[#7A271A]">
            Ao desconectar, novas cobranças não poderão ser pagas pelo Mercado Pago até que
            uma conta seja conectada novamente. Deseja continuar?
          </p>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => setIsConfirmingDisconnect(false)}
              disabled={isDisconnecting}
              className="h-10 cursor-pointer rounded-xl border border-[#E5E7EB] bg-white px-4 text-sm font-black text-[#6B7280] transition hover:bg-[#F3F4F6] disabled:cursor-not-allowed"
            >
              Manter conectada
            </button>
            <button
              type="button"
              onClick={() => void handleDisconnect()}
              disabled={isDisconnecting}
              className="h-10 cursor-pointer rounded-xl bg-[#B42318] px-4 text-sm font-black text-white transition hover:bg-[#7A271A] disabled:cursor-not-allowed disabled:bg-[#9CA3AF]"
            >
              {isDisconnecting ? "Desconectando..." : "Desconectar"}
            </button>
          </div>
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

        <div className="flex flex-col-reverse gap-3 sm:flex-row">
          {isConnected && !isConfirmingDisconnect && (
            <button
              type="button"
              onClick={() => setIsConfirmingDisconnect(true)}
              disabled={isBusy}
              className="h-11 cursor-pointer rounded-2xl border border-[#FECACA] bg-white px-5 text-sm font-black text-[#B42318] transition hover:bg-[#FDECEC] disabled:cursor-not-allowed disabled:text-[#9CA3AF]"
            >
              Desconectar
            </button>
          )}

          <button
            type="button"
            onClick={() => void handleConnect()}
            disabled={isBusy}
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
