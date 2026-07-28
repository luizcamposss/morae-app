import { useAuth } from "../../app/providers/useAuth";

export function SuspendedAccessPage() {
  const { user, logout } = useAuth();

  return (
    <main className="min-h-screen bg-[#F3F4F6] px-5 py-8 text-[#111827]">
      <section className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-3xl items-center">
        <div className="w-full overflow-hidden rounded-[2rem] border border-[#E5E7EB] bg-white shadow-xl shadow-[#0B3D2E]/10">
          <div className="bg-[#0B3D2E] px-6 py-8 text-white">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-[#86EFAC]">
              MORAÊ
            </p>
            <h1 className="mt-4 text-3xl font-black tracking-tight">
              Acesso suspenso
            </h1>
            <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-[#DCFCE7]">
              Seu acesso à plataforma foi pausado. Isso não apaga seus dados, apenas
              bloqueia a navegação enquanto a administração revisa o vínculo.
            </p>
          </div>

          <div className="space-y-5 px-6 py-6">
            <div className="rounded-3xl border border-[#FECACA] bg-[#FDECEC] p-5">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-[#B42318]">
                Notificação do sistema
              </p>
              <h2 className="mt-3 text-xl font-black text-[#7A271A]">
                Olá, {user?.personName ?? "usuário"}. Seu acesso está temporariamente bloqueado.
              </h2>
              <p className="mt-3 text-sm font-semibold leading-6 text-[#B42318]">
                {user?.suspensionReason?.trim()
                  ? user.suspensionReason
                  : "Nenhum motivo foi informado no momento da suspensão."}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <InfoBlock
                label="E-mail"
                value={user?.email ?? "Não informado"}
              />
              <InfoBlock
                label="Suspenso em"
                value={user?.suspendedAt ? formatDate(user.suspendedAt) : "Data não informada"}
              />
            </div>

            <div className="rounded-3xl border border-[#E5E7EB] bg-[#F9FAFB] p-5">
              <h3 className="text-base font-black text-[#111827]">
                O que fazer agora?
              </h3>
              <p className="mt-2 text-sm font-semibold leading-6 text-[#6B7280]">
                Entre em contato com o administrador do condomínio ou com o suporte
                institucional responsável pelo seu cadastro para solicitar a reativação.
              </p>
            </div>

            <button
              type="button"
              onClick={logout}
              className="h-12 w-full cursor-pointer rounded-2xl bg-[#16A34A] text-sm font-extrabold text-white shadow-lg shadow-[#16A34A]/20 transition hover:bg-[#0B3D2E]"
            >
              Sair da conta
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-[#E5E7EB] bg-white p-4">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-[#9CA3AF]">
        {label}
      </p>
      <p className="mt-2 text-sm font-extrabold text-[#111827]">{value}</p>
    </div>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
