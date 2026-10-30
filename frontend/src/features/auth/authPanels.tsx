import type { ReactNode } from "react";
import {
  Bell,
  Check,
  FileText,
  House,
  Laptop,
  Lock,
  Mail,
  Pause,
  Receipt,
  ShieldCheck,
  UserRound,
  Vote,
  type LucideIcon,
} from "lucide-react";
import { MoraeMark } from "../../shared/components/MoraeMark";
import { getPasswordStrength, type PasswordStrength } from "../../shared/lib/password";

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

type PanelItem = { icon: LucideIcon; title: string; detail: string };

function PanelList({ items, className = "" }: { items: PanelItem[]; className?: string }) {
  return (
    <ul className={`mx-6 divide-y divide-linha pb-2 ${className}`}>
      {items.map((item) => (
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
  );
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

const protections: PanelItem[] = [
  { icon: Lock, title: "Só você sabe a nova senha", detail: "Nem a administração consegue ver" },
  { icon: Laptop, title: "Outros aparelhos são desconectados", detail: "Quem estava logado precisa entrar de novo" },
  { icon: FileText, title: "Seu histórico continua igual", detail: "Boletos, documentos e votos ficam onde estão" },
];

const strengthTones: Record<PasswordStrength["tone"], { bar: string; text: string; tile: string }> = {
  empty: { bar: "bg-linha", text: "text-tinta-suave", tile: "bg-campo text-tinta-suave" },
  weak: { bar: "bg-vermelho", text: "text-vermelho", tile: "bg-vermelho-suave text-vermelho" },
  medium: { bar: "bg-ambar", text: "text-ambar", tile: "bg-ambar-suave text-ambar" },
  good: { bar: "bg-verde", text: "text-verde", tile: "bg-verde-suave text-verde" },
};

// Without a password (success and missing-link states) the card shows the finished, strong state.
export function ResetPasswordPanel({ password }: { password?: string }) {
  const strength: PasswordStrength =
    password === undefined ? { score: 4, label: "Forte", tone: "good" } : getPasswordStrength(password);
  const tone = strengthTones[strength.tone];

  return (
    <PanelShell
      title={<>Senha nova,<br />conta <Highlight>protegida.</Highlight></>}
      subtitle="Escolha uma senha que só você saiba. A gente cuida do resto."
      notice={{ icon: Check, title: "Conta protegida", detail: "Tudo certo por aqui" }}
    >
      <div className="flex items-center gap-4 px-6 pb-5 pt-6">
        <span className={`grid size-12 place-items-center rounded-block transition-colors duration-300 ${tone.tile}`}>
          <ShieldCheck size={22} strokeWidth={1.7} />
        </span>
        <span className="flex-1">
          <span className="flex justify-between text-sm">
            <span className="text-tinta-suave">Força da senha</span>
            <span className={`font-semibold transition-colors duration-300 ${tone.text}`}>{strength.label}</span>
          </span>
          <span className="mt-2 flex gap-1.5">
            {[1, 2, 3, 4].map((bar) => (
              <span
                key={bar}
                className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ease-out ${bar <= strength.score ? tone.bar : "bg-linha"}`}
              />
            ))}
          </span>
        </span>
      </div>
      <PanelList items={protections} className="border-t border-linha" />
    </PanelShell>
  );
}


const residentBenefits: PanelItem[] = [
  { icon: Receipt, title: "Pagar o condomínio com Pix em segundos", detail: "O comprovante chega sozinho" },
  { icon: Bell, title: "Receber os avisos sem grupo de WhatsApp", detail: "Só o que é da sua torre" },
  { icon: Vote, title: "Votar nas assembleias de onde estiver", detail: "1 voto por unidade, com resultado na hora" },
];

const managementBenefits: PanelItem[] = [
  { icon: Receipt, title: "Cobranças com baixa automática", detail: "O dinheiro cai direto na conta do condomínio" },
  { icon: Bell, title: "Avisos por prédio e por público", detail: "Chegam no app e no sininho" },
  { icon: Vote, title: "Assembleias com quórum calculado", detail: "Resultado e ata no mesmo lugar" },
];

type InvitationPanelProps = {
  condominiumName?: string;
  personName?: string;
  roleLabel?: string;
  validUntil?: string;
  isResident?: boolean;
};

export function InvitationPanel({ condominiumName, personName, roleLabel, validUntil, isResident = true }: InvitationPanelProps) {
  return (
    <PanelShell
      title={<>Seu lugar no<br /><Highlight>{condominiumName ? `${condominiumName}.` : "Moraê."}</Highlight></>}
      subtitle="Já está tudo pronto. Falta só a sua senha."
      notice={{ icon: Check, title: "Convite válido", detail: validUntil ? `Até ${validUntil}` : "Crie sua senha para entrar" }}
    >
      <div className="flex items-center gap-4 bg-verde-suave/60 px-6 py-5">
        <span className="grid size-12 place-items-center rounded-block bg-verde text-superficie">
          <House size={22} strokeWidth={1.8} />
        </span>
        <span>
          <span className="block text-xs font-semibold tracking-[0.06em] text-tinta-suave">CONVITE</span>
          <span className="block font-display text-xl font-bold tracking-[-0.01em] text-tinta">{personName ?? "Seu acesso"}</span>
          {roleLabel && <span className="block text-sm text-tinta-suave">{roleLabel}</span>}
        </span>
      </div>
      <p className="px-6 pt-5 text-xs text-tinta-suave">Com o Moraê você vai</p>
      <PanelList items={isResident ? residentBenefits : managementBenefits} />
    </PanelShell>
  );
}

const keptData: PanelItem[] = [
  { icon: Receipt, title: "Histórico de pagamentos", detail: "Boletos e comprovantes" },
  { icon: FileText, title: "Documentos do condomínio", detail: "Atas, convenção e regimento" },
  { icon: Vote, title: "Votos e assembleias", detail: "Registrados com data e hora" },
  { icon: UserRound, title: "Seus dados pessoais", detail: "Protegidos pela LGPD" },
];

export function PausedAccessPanel({ pausedOn }: { pausedOn?: string }) {
  return (
    <PanelShell
      title={<>Nada foi<br /><Highlight>perdido.</Highlight></>}
      subtitle="Quando o acesso voltar, tudo estará do jeito que você deixou."
      notice={{ icon: Pause, title: "Acesso pausado", detail: pausedOn ? `Desde ${pausedOn}` : "Seus dados estão guardados" }}
    >
      <p className="px-6 pt-5 text-sm font-semibold text-tinta">Guardado com segurança</p>
      <PanelList items={keptData} />
    </PanelShell>
  );
}
