import { useEffect, useState } from "react";
import { CircleCheck, Link2, TriangleAlert } from "lucide-react";
import { Button } from "../../shared/components/Button";
import { formatDateTime } from "../../shared/lib/date";
import { disconnectMercadoPago, getMercadoPagoConnectionStatus, startMercadoPagoOAuth } from "./mercadoPagoService";
import { saveOAuthReturnPath } from "./returnPath";
import type { MercadoPagoConnectionStatus } from "./types";

type MercadoPagoConnectionPanelProps = {
  contextLabel: string;
  // Omit for the platform account (Master); pass the active condominium for its account (Admin).
  condominiumId?: number | null;
  // The logged-in unit owner's own account (Meus aluguéis).
  asOwner?: boolean;
  // Inside a dialog: the "Voltar" button. Omit on a page.
  onBack?: () => void;
};

export function MercadoPagoConnectionPanel({ contextLabel, condominiumId, asOwner = false, onBack }: MercadoPagoConnectionPanelProps) {
  const [connection, setConnection] = useState<MercadoPagoConnectionStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [isConfirmingDisconnect, setIsConfirmingDisconnect] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    getMercadoPagoConnectionStatus(condominiumId, asOwner)
      .then((result) => isMounted && setConnection(result))
      .catch((error) => {
        if (!isMounted) return;
        setConnection(null);
        setErrorMessage(error instanceof Error ? error.message : "Não foi possível carregar a conexão com o Mercado Pago.");
      })
      .finally(() => isMounted && setIsLoading(false));

    return () => {
      isMounted = false;
    };
  }, [condominiumId, asOwner]);

  async function handleConnect() {
    try {
      setIsConnecting(true);
      setErrorMessage("");
      const result = await startMercadoPagoOAuth(condominiumId, asOwner);
      saveOAuthReturnPath();
      window.location.assign(result.authorizationUrl);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Não foi possível iniciar a conexão com o Mercado Pago.");
      setIsConnecting(false);
    }
  }

  async function handleDisconnect() {
    try {
      setIsDisconnecting(true);
      setErrorMessage("");
      await disconnectMercadoPago(condominiumId, asOwner);
      setConnection(await getMercadoPagoConnectionStatus(condominiumId, asOwner));
      setIsConfirmingDisconnect(false);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Não foi possível desconectar o Mercado Pago.");
    } finally {
      setIsDisconnecting(false);
    }
  }

  const isConnected = Boolean(connection?.isConnected);
  const isBusy = isLoading || isConnecting || isDisconnecting;

  return (
    <div className="flex flex-col gap-4">
      <div className={`flex items-start gap-3 rounded-block px-4 py-4 ${isConnected ? "bg-verde-suave" : "bg-ambar-suave"}`}>
        {isConnected ? (
          <CircleCheck size={20} strokeWidth={1.8} aria-hidden className="mt-0.5 shrink-0 text-verde" />
        ) : (
          <TriangleAlert size={20} strokeWidth={1.8} aria-hidden className="mt-0.5 shrink-0 text-ambar" />
        )}
        <div>
          <p className="text-[15px] font-semibold text-tinta">
            {isLoading ? "Verificando conexão…" : isConnected ? "Conta conectada" : "Conta não conectada"}
          </p>
          <p className="mt-0.5 text-sm text-tinta-suave">
            {isConnected
              ? `Os pagamentos online de ${contextLabel} caem nesta conta do Mercado Pago.`
              : `Conecte uma conta do Mercado Pago para receber pagamentos online de ${contextLabel} (Pix, cartão e boleto).`}
          </p>
        </div>
      </div>

      {isConnected && connection && (
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 rounded-block bg-campo px-4 py-4 text-sm">
          <Info label="Usuário Mercado Pago" value={connection.mercadoPagoUserId?.toString() ?? "–"} />
          <Info label="Ambiente" value={connection.liveMode ? "Produção" : "Teste"} />
          <Info label="Conectada em" value={formatDateTime(connection.connectedAt)} />
          <Info label="Atualizada em" value={formatDateTime(connection.updatedAt)} />
        </dl>
      )}

      {errorMessage && (
        <p role="alert" className="rounded-field bg-vermelho-suave px-4 py-3 text-sm font-medium text-vermelho">
          {errorMessage}
        </p>
      )}

      {isConfirmingDisconnect && (
        <div className="rounded-block bg-vermelho-suave/60 px-4 py-4">
          <p className="text-sm text-tinta">
            Ao desconectar, as cobranças novas não poderão ser pagas pelo Mercado Pago até uma conta ser conectada de novo.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" variant="quiet" onClick={() => setIsConfirmingDisconnect(false)} disabled={isDisconnecting}>
              Manter conectada
            </Button>
            <Button size="sm" variant="danger" onClick={() => void handleDisconnect()} isLoading={isDisconnecting} loadingText="Desconectando…">
              Desconectar
            </Button>
          </div>
        </div>
      )}

      <div className="flex flex-wrap justify-between gap-3">
        {onBack ? (
          <Button variant="quiet" onClick={onBack}>
            Voltar
          </Button>
        ) : (
          <span />
        )}
        {isConnected ? (
          !isConfirmingDisconnect && (
            <button
              type="button"
              onClick={() => setIsConfirmingDisconnect(true)}
              disabled={isBusy}
              className="rounded-full px-3 text-sm font-semibold text-vermelho hover:underline disabled:opacity-60"
            >
              Desconectar conta
            </button>
          )
        ) : (
          <Button variant="accent" onClick={() => void handleConnect()} disabled={isBusy} isLoading={isConnecting} loadingText="Abrindo o Mercado Pago…">
            <Link2 size={16} strokeWidth={2} aria-hidden />
            Conectar Mercado Pago
          </Button>
        )}
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-tinta-suave">{label}</dt>
      <dd className="mt-0.5 font-medium text-tinta">{value}</dd>
    </div>
  );
}
