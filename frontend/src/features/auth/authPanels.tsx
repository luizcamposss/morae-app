import type { ReactNode } from "react";
import { Check, FileText, Laptop, Lock, Mail, ShieldCheck, type LucideIcon } from "lucide-react";
import { MoraeMark } from "../../shared/components/MoraeMark";

type PanelShellProps = {
  title: ReactNode;
  subtitle?: string;
  notice: { icon: LucideIcon; title: string; detail: string };
  children: ReactNode;
};

// Common shape of the access brand panels (Figma → App → Acesso): headline, sample card, floating notice.
function PanelShell({ title, subtitle, notice, children }: PanelShellProps) {
  return (
    <>
      <p className="max-w-[560px] font-display text-[40px] font-bold leading-[1.08] tracking-[-0.015em] text-tinta">{title}</p>
      {subtitle && <p className="mt-3 text-base text-tinta-suave">{subtitle}</p>}

      <div className="relative mt-10 max-w-[600px]">
        <div className="overflow-hidden rounded-card bg-superficie shadow-float">{children}</div>

        <div className="absolute -right-6 -top-8 flex items-center gap-3 rounded-block bg-superficie py-3 pl-3 pr-5 shadow-float">
          <span className="grid size-9 place-items-center rounded-[9px] bg-verde text-superficie">
            <notice.icon size={18} strokeWidth={2} />
          </span>
          <span>
            <span className="block text-sm font-semibold text-tinta">{notice.title}</span>
            <span className="block text-xs text-tinta-suave">{notice.detail}</span>
          </span>
        </div>
      </div>
    </>
  );
}

function Highlight({ children }: { children: ReactNode }) {
  return <span className="text-verde">{children}</span>;
}

export function LoginPanel() {
  return (
    <PanelShell
      title={<>O condomínio inteiro, <Highlight>em dia</Highlight>, unidade por unidade.</>}
      notice={{ icon: Check, title: "Pix recebido · Apto 302", detail: "Baixa automática · agora" }}
    >
      <div className="p-6">
        <div className="flex items-baseline justify-between text-sm text-tinta-suave">
          <span>Residencial Jardins · Outubro</span>
          <span className="text-xs">exemplo</span>
        </div>
        <p className="mt-4 font-display text-[30px] font-bold leading-none tracking-[-0.015em] text-tinta tabular-nums">
          53 de 60 em dia
        </p>
        <div className="mt-5 flex h-2 gap-1">
          <span className="flex-[53] rounded-full bg-verde" />
          <span className="flex-[4] rounded-full bg-ambar" />
          <span className="flex-[3] rounded-full bg-vermelho" />
        </div>
      </div>
    </PanelShell>
  );
}

export function ForgotPasswordPanel() {
  return (
    <PanelShell
      title={<>Acontece com<br /><Highlight>todo mundo.</Highlight></>}
      subtitle="Em um minuto você está de volta. O link chega no seu e-mail."
      notice={{ icon: Mail, title: "Novo e-mail", detail: "Caixa de entrada · agora" }}
    >
      <div className="flex items-center gap-3 bg-campo px-6 py-4">
        <span className="grid size-9 place-items-center rounded-full bg-verde-suave">
          <MoraeMark size={18} />
        </span>
        <span className="flex-1">
          <span className="block text-sm font-semibold text-tinta">Moraê</span>
          <span className="block text-xs text-tinta-suave">para voce@exemplo.com</span>
        </span>
        <span className="text-xs text-tinta-suave">agora</span>
      </div>
      <div className="p-6">
        <p className="font-display text-xl font-bold tracking-[-0.01em] text-tinta">Redefinir sua senha</p>
        <p className="mt-2 text-sm leading-relaxed text-tinta-suave">
          Oi! Recebemos um pedido para criar uma nova senha na sua conta do Moraê. Se não foi você, é só ignorar este e-mail.
        </p>
        <span className="mt-5 inline-flex rounded-full bg-verde px-5 py-2.5 text-sm font-semibold text-verde-tinta">Criar nova senha</span>
        <p className="mt-4 text-xs text-tinta-suave">O link vale por 1 hora.</p>
      </div>
    </PanelShell>
  );
}

const protections: Array<{ icon: LucideIcon; title: string; detail: string }> = [
  { icon: Lock, title: "Só você sabe a nova senha", detail: "Nem a administração consegue ver" },
  { icon: Laptop, title: "Outros aparelhos são desconectados", detail: "Quem estava logado precisa entrar de novo" },
  { icon: FileText, title: "Seu histórico continua igual", detail: "Boletos, documentos e votos ficam onde estão" },
];

export function ResetPasswordPanel() {
  return (
    <PanelShell
      title={<>Senha nova,<br />conta <Highlight>protegida.</Highlight></>}
      subtitle="Escolha uma senha que só você saiba. A gente cuida do resto."
      notice={{ icon: Check, title: "Conta protegida", detail: "Tudo certo por aqui" }}
    >
      <div className="flex items-center gap-4 px-6 pb-5 pt-6">
        <span className="grid size-12 place-items-center rounded-block bg-verde-suave text-verde">
          <ShieldCheck size={22} strokeWidth={1.7} />
        </span>
        <span className="flex-1">
          <span className="flex justify-between text-sm">
            <span className="text-tinta-suave">Força da senha</span>
            <span className="font-semibold text-verde">Forte</span>
          </span>
          <span className="mt-2 flex gap-1.5">
            {[0, 1, 2, 3].map((bar) => (
              <span key={bar} className="h-1.5 flex-1 rounded-full bg-verde" />
            ))}
          </span>
        </span>
      </div>
      <ul className="mx-6 divide-y divide-linha border-t border-linha pb-2">
        {protections.map((item) => (
          <li key={item.title} className="flex items-center gap-3 py-3.5">
            <span className="grid size-9 place-items-center rounded-[9px] bg-campo text-tinta-suave">
              <item.icon size={17} strokeWidth={1.7} />
            </span>
            <span>
              <span className="block text-sm font-semibold text-tinta">{item.title}</span>
              <span className="block text-xs text-tinta-suave">{item.detail}</span>
            </span>
          </li>
        ))}
      </ul>
    </PanelShell>
  );
}
