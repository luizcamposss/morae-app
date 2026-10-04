import { useEffect, useState } from "react";
import { getMercadoPagoConnectionStatus } from "./mercadoPagoService";

// Whether the receiving Mercado Pago account is connected: the platform account when
// condominiumId is omitted, that condominium's account otherwise. refreshKey re-checks it
// (e.g. after coming back from the connection panel).
export function useMercadoPagoConnected(
  condominiumId: number | null | undefined,
  { skip = false, refreshKey }: { skip?: boolean; refreshKey?: unknown } = {},
) {
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (skip) {
      return;
    }

    let isMounted = true;

    getMercadoPagoConnectionStatus(condominiumId)
      .then((status) => {
        if (isMounted) {
          setIsConnected(status.isConnected);
        }
      })
      .catch(() => {
        if (isMounted) {
          setIsConnected(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [condominiumId, skip, refreshKey]);

  return !skip && isConnected;
}

export function describePaymentMethods(hasPixKey: boolean, hasMercadoPago: boolean, chargesLabel: string) {
  if (hasMercadoPago && hasPixKey) {
    return {
      value: "Mercado Pago + Pix normal",
      description: `As ${chargesLabel} podem ser pagas online pelo Mercado Pago; a chave Pix fica como alternativa manual.`,
      tone: "success" as const,
    };
  }

  if (hasMercadoPago) {
    return {
      value: "Mercado Pago",
      description: `As ${chargesLabel} são pagas online pelo Mercado Pago (Pix, cartão e boleto).`,
      tone: "success" as const,
    };
  }

  if (hasPixKey) {
    return {
      value: "Pix normal",
      description: `As ${chargesLabel} usam a chave Pix cadastrada.`,
      tone: "success" as const,
    };
  }

  return {
    value: "Nenhum método configurado",
    description: `Cadastre uma chave Pix ou conecte o Mercado Pago para liberar a criação de ${chargesLabel}.`,
    tone: "warning" as const,
  };
}
