import { useAuth } from "../../app/providers/useAuth";
import { Pause } from "lucide-react";
import { Button, ButtonLink } from "../../shared/components/Button";
import { formatDate } from "../../shared/lib/date";
import { AuthLayout } from "./AuthLayout";
import { PausedAccessPanel } from "./authPanels";

export function SuspendedAccessPage() {
  const { user, logout } = useAuth();

  const isInactiveCondominium = Boolean(user?.isCondominiumInactive && !user.isSuspended);
  const isAdmin = user?.roles.includes("Admin") ?? false;
  const reason = user?.suspensionReason?.trim();

  return (
    <AuthLayout panel={<PausedAccessPanel pausedOn={user?.suspendedAt ? formatDate(user.suspendedAt) : undefined} />}>
      <span className="grid size-14 place-items-center rounded-block bg-ambar-suave text-ambar">
        <Pause size={24} strokeWidth={2} aria-hidden />
      </span>
      <h1 className="mt-6 font-display text-[34px] font-bold leading-[1.12] tracking-[-0.015em] text-tinta">
        Seu acesso está pausado
      </h1>
      <p className="mt-2 text-[15px] leading-relaxed text-tinta-suave">
        {isInactiveCondominium
          ? "O condomínio está com a assinatura do Moraê inativa. Seus dados continuam guardados e nada foi apagado."
          : "O seu acesso foi pausado pela administração. Seus dados continuam guardados e nada foi apagado."}
      </p>

      {!isInactiveCondominium && (
        <div className="mt-6 rounded-block bg-campo px-5 py-4">
          <p className="text-sm font-semibold text-tinta">Motivo informado</p>
          <p className="mt-1 text-sm leading-relaxed text-tinta-suave">
            {reason || "A administração não informou um motivo. Fale com ela para pedir a reativação."}
          </p>
        </div>
      )}

      <div className="mt-8 flex flex-col gap-3">
        {isInactiveCondominium && isAdmin && (
          <ButtonLink to="/admin/finance/receivables" fullWidth>
            Ver a mensalidade do Moraê
          </ButtonLink>
        )}
        <Button variant={isInactiveCondominium && isAdmin ? "quiet" : "primary"} fullWidth onClick={logout}>
          Entrar com outra conta
        </Button>
      </div>
    </AuthLayout>
  );
}
