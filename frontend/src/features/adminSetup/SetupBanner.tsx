import { useEffect, useState } from "react";
import { ChevronRight, X } from "lucide-react";
import { Link } from "react-router-dom";
import { ButtonLink } from "../../shared/components/Button";
import { getCondominiumFinancialAccount } from "../financialAccounts/financialAccountService";
import type { DashboardData } from "../adminDashboard/dashboardData";
import { SETUP_STEPS, dismissSetup, fetchMercadoPagoConnected, isSetupDismissed, setupProgress } from "./setupData";

type Receiving = { condominiumId: number; hasPixKey: boolean; isMercadoPagoConnected: boolean };

// Admin home: a highlighted card while the condominium is empty, then a small
// "Continuar configuração" until every step of /admin/setup is done.
export function SetupBanner({ dashboard }: { dashboard: DashboardData }) {
  const { condominiumId } = dashboard;
  const [receiving, setReceiving] = useState<Receiving | null>(null);
  const [dismissed, setDismissed] = useState<number | null>(null);

  useEffect(() => {
    let isMounted = true;

    Promise.all([getCondominiumFinancialAccount(condominiumId).catch(() => null), fetchMercadoPagoConnected(condominiumId)]).then(
      ([account, isMercadoPagoConnected]) => isMounted && setReceiving({ condominiumId, hasPixKey: Boolean(account?.pixKey), isMercadoPagoConnected }),
    );

    return () => {
      isMounted = false;
    };
  }, [condominiumId]);

  if (!receiving || receiving.condominiumId !== condominiumId) return null;

  const progress = setupProgress({ ...dashboard, ...receiving });
  const total = SETUP_STEPS.length;

  if (!progress.buildings || !progress.units) {
    return (
      <section className="mb-10 flex flex-col gap-5 rounded-card bg-tinta p-6 text-white shadow-whisper sm:flex-row sm:items-center sm:justify-between sm:p-8">
        <div className="min-w-0">
          <p className="text-[13px] font-medium text-white/70">Primeiros passos</p>
          <h2 className="mt-1 font-display text-[26px] font-bold leading-tight tracking-[-0.01em]">Monte seu condomínio em 4 passos</h2>
          <p className="mt-2 max-w-xl text-[15px] text-white/80">Prédios, unidades geradas sozinhas, moradores e recebimento. Dá para parar e continuar depois.</p>
        </div>
        <ButtonLink to="/admin/setup" variant="accent" className="shrink-0">
          {progress.doneCount ? `Continuar (${progress.doneCount} de ${total})` : "Começar agora"}
        </ButtonLink>
      </section>
    );
  }

  if (progress.doneCount === total || dismissed === condominiumId || isSetupDismissed(condominiumId)) return null;

  return (
    <div className="mb-8 flex items-center gap-2 rounded-card bg-superficie pr-2 shadow-whisper">
      <Link to="/admin/setup" className="flex min-w-0 flex-1 items-center gap-4 rounded-card px-5 py-4 transition-colors hover:bg-campo/60">
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-semibold text-tinta">
            Continuar configuração ({progress.doneCount} de {total})
          </span>
          <span className="mt-2 block h-1.5 max-w-xs overflow-hidden rounded-full bg-campo" aria-hidden>
            <span className="block h-full rounded-full bg-verde" style={{ width: `${(progress.doneCount / total) * 100}%` }} />
          </span>
        </span>
        <ChevronRight size={18} strokeWidth={1.8} aria-hidden className="shrink-0 text-tinta-suave" />
      </Link>
      <button
        type="button"
        onClick={() => {
          dismissSetup(condominiumId);
          setDismissed(condominiumId);
        }}
        className="grid size-9 shrink-0 place-items-center rounded-full text-tinta-suave transition-colors hover:bg-campo hover:text-tinta"
        aria-label="Dispensar aviso de configuração"
      >
        <X size={17} strokeWidth={1.8} aria-hidden />
      </button>
    </div>
  );
}
