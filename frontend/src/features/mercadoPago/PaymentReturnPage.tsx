import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../app/providers/useAuth";
import { getDefaultRouteByRoles } from "../auth/authRedirect";
import { MercadoPagoReturnLayout } from "./MercadoPagoReturnLayout";
import { getCheckoutReturnPath } from "./returnPath";

// The final charge status comes from the Mercado Pago webhook, not from this redirect,
// so this page only tells the payer what to expect.
const results = {
  success: {
    title: "Pagamento enviado",
    tone: "success",
    description:
      "O Mercado Pago aprovou o pagamento. A cobrança será marcada como paga assim que a confirmação chegar, o que costuma levar poucos instantes.",
  },
  pending: {
    title: "Pagamento em processamento",
    tone: "warning",
    description:
      "O pagamento está pendente no Mercado Pago (por exemplo, um Pix ou boleto ainda não compensado). A cobrança será atualizada automaticamente quando ele for aprovado.",
  },
  failure: {
    title: "Pagamento não concluído",
    tone: "error",
    description:
      "O pagamento não foi aprovado ou foi cancelado. Nenhum valor foi cobrado; você pode tentar novamente.",
  },
} as const;

export function PaymentReturnPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [returnPath] = useState(() => getCheckoutReturnPath());

  const resultKey = searchParams.get("result");
  const result =
    resultKey === "success" || resultKey === "pending" || resultKey === "failure"
      ? results[resultKey]
      : results.failure;

  const backPath = returnPath ?? getDefaultRouteByRoles(user?.roles ?? []);

  return (
    <MercadoPagoReturnLayout
      title={result.title}
      tone={result.tone}
      description={result.description}
      actionLabel="Voltar para as cobranças"
      onAction={() => navigate(backPath, { replace: true })}
    />
  );
}
