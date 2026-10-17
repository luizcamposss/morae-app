import type { describePaymentMethods } from "../mercadoPago/useMercadoPagoConnected";

type ReceivingStatusProps = {
  title: string;
  isLoading: boolean;
  summary: ReturnType<typeof describePaymentMethods>;
};

// Where the money of a screen's charges lands: green when some method is set, amber otherwise.
export function ReceivingStatus({ title, isLoading, summary }: ReceivingStatusProps) {
  return (
    <div className={`rounded-card px-5 py-4 ${summary.tone === "success" ? "bg-verde-suave/70" : "bg-ambar-suave"}`}>
      <p className="text-[13px] font-semibold text-tinta-suave">{title}</p>
      <p className="mt-1 font-display text-xl font-bold tracking-[-0.01em] text-tinta">{isLoading ? "Verificando…" : summary.value}</p>
      <p className="mt-1 text-sm text-tinta-suave">{summary.description}</p>
    </div>
  );
}
