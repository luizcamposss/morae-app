import type { ReactNode } from "react";
import { PowerOff } from "lucide-react";
import { ButtonLink } from "../../shared/components/Button";
import { PageHeader } from "../../shared/layout/PageHeader";
import { useModuleEnabled, type ModuleRequirement } from "./modules";

type ModuleRouteProps = {
  requirement: ModuleRequirement;
  screenName?: string;
  // Only the Admin can turn modules on, so only he gets the shortcut to the settings.
  isAdminArea: boolean;
  children: ReactNode;
};

// A screen opened by URL (or an old link) while its module is off in the active condominium.
export function ModuleRoute({ requirement, screenName, isAdminArea, children }: ModuleRouteProps) {
  const isEnabled = useModuleEnabled(requirement);

  if (isEnabled) return children;

  return (
    <>
      <PageHeader title={screenName ?? "Área desligada"} />
      <section className="flex max-w-xl flex-col items-start gap-4 rounded-block bg-superficie p-6 shadow-whisper">
        <span className="grid size-10 place-items-center rounded-field bg-menu text-tinta-suave">
          <PowerOff size={20} strokeWidth={1.75} aria-hidden />
        </span>
        <div>
          <h2 className="font-semibold text-tinta">Esta área está desligada neste condomínio</h2>
          <p className="mt-1 text-sm text-tinta-suave">
            {isAdminArea
              ? "Nada foi apagado: ligando o módulo de novo, tudo volta como estava."
              : "Se você precisa dela, fale com a administração do condomínio."}
          </p>
        </div>
        {isAdminArea && (
          <ButtonLink to="/admin/settings#modules" size="sm">
            Ligar nos Ajustes
          </ButtonLink>
        )}
      </section>
    </>
  );
}
