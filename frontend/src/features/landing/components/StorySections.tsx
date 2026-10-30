import { ArrowDown, CheckCheck, CircleAlert, CircleCheck, Droplet, Megaphone, Users } from "lucide-react";
import { BuildingStory, type StoryArrow } from "./BuildingStory";
import { NoteCard } from "./NoteCard";

// Hand-drawn arrows exported from the Figma sections (shared by both scenes where they match).
const ARROW_01: StoryArrow = { x: 342, y: 661.6, curve: [14, 14, "M 0 0 C 64.07 9.93 123.4 32.37 178 67.3"], head: [184, 74.3, "M 0 6.5 L 8 7 L 4.1 0"] };
const ARROW_03: StoryArrow = { x: 386, y: 972.5, curve: [14, 14, "M 0 0 C 39.87 13.87 80.93 21.17 123.2 21.9"], head: [130.1, 31.9, "M 0 7.7 L 7.1 4 L 0.1 0"] };
const ARROW_04: StoryArrow = { x: 903, y: 357.8, curve: [14, 14, "M 167 0 C 112.8 18.2 57.13 25.8 0 22.8"], head: [14, 33.3, "M 7.2 0 L 0 3.5 L 6.8 7.7"] };

export function PainsSection() {
  return (
    <BuildingStory
      eyebrow="ANTES DO MORAÊ"
      title={<>Todo condomínio tem as mesmas <span className="text-vermelho">quatro dores</span>.</>}
      state="antes"
      originY={258}
      arrows={[
        ARROW_01,
        ARROW_03,
        ARROW_04,
        { x: 912, y: 584.6, curve: [14, 14, "M 114 0 C 79.47 25.33 41.47 43.43 0 54.3"], head: [14, 62.8, "M 5.8 0 L 0 5.5 L 7.8 7.4"] },
        { x: 854.4, y: 988.9, curve: [14, 14, "M 171.6 0 C 114.6 8.2 57.4 9.73 0 4.6"], head: [14, 15.4, "M 7.3 0 L 0 3.2 L 6.7 7.6"] },
      ]}
      notes={[
        { x: 96, y: 608.6, content: <NoteCard number="01" icon={CircleAlert} tone="vermelho" title="Boleto vencido · Apto 301" detail="R$ 650,00 · 12 dias e ninguém cobrou" /> },
        { x: 1044, y: 538.6, content: <GroupChat /> },
        { x: 1044, y: 971.4, content: <NoteCard number="02" icon={Megaphone} tone="ambar" title="Aviso colado na portaria" detail="Ninguém sabe quem leu." /> },
        { x: 78, y: 955, content: <NoteCard number="03" icon={Users} tone="ambar" title="Assembleia de ontem" detail="8 de 60 unidades. Sem quórum, de novo." /> },
        { x: 1044, y: 304.8, content: <NoteCard number="04" icon={Droplet} tone="ambar" title="Limpeza da caixa d’água" detail="A última foi… ninguém lembra." /> },
      ]}
      footer={
        <p className="flex flex-col items-center gap-3 text-center font-display text-[clamp(1.5rem,3vw,2rem)] font-bold leading-tight text-tinta">
          Vamos resolver uma de cada vez.
          <ArrowDown size={28} strokeWidth={2} className="text-verde" aria-hidden />
        </p>
      }
    />
  );
}

export function AfterSection() {
  return (
    <BuildingStory
      eyebrow="DEPOIS DO MORAÊ"
      title={<>O mesmo prédio. Agora, <span className="text-verde">em dia</span>.</>}
      state="depois"
      originY={201}
      arrows={[
        ARROW_01,
        ARROW_03,
        ARROW_04,
        { x: 914, y: 638.9, curve: [14, 14, "M 112 1.2 C 74.6 7.47 37.27 7.07 0 0"], head: [14, 11.5, "M 7.6 0 L 0 2.5 L 6.2 7.6"] },
      ]}
      notes={[
        { x: 96, y: 608.6, content: <NoteCard number="01" icon={CircleCheck} tone="verde" title="Pix recebido · Apto 301" detail="R$ 650,00 · baixa automática, sem cobrar ninguém" /> },
        { x: 1044, y: 622.6, content: <NoteCard number="02" icon={Megaphone} tone="verde" title="Aviso no app · Torre B" detail="24 de 24 moradores avisados" /> },
        { x: 78, y: 955, content: <NoteCard number="03" icon={Users} tone="verde" title="Assembleia com quórum" detail="40 de 60 unidades votaram online" /> },
        { x: 1044, y: 304.8, content: <NoteCard number="04" icon={Droplet} tone="verde" title="Caixa d’água limpa" detail="Próxima limpeza já agendada" /> },
      ]}
    />
  );
}

const CHAT = [
  { text: "Mandei o aviso no grupo.\nAlguém viu?", time: "09:12", mine: true },
  { text: "Que aviso?", time: "09:40", mine: false },
  { text: "Já paguei. Mando o comprovante\npra quem?", time: "10:03", mine: false },
];

// The condominium WhatsApp group: where notices and receipts get lost today.
function GroupChat() {
  return (
    <div className="flex w-[262px] flex-col gap-2 rounded-2xl bg-superficie px-3.5 pb-3.5 pt-3 shadow-[0_14px_34px_-8px_rgb(15_61_62/0.12)]">
      <div className="flex items-center gap-2.5">
        <span className="grid size-[30px] place-items-center rounded-full bg-campo text-tinta-suave">
          <Users size={16} aria-hidden />
        </span>
        <span className="flex flex-col">
          <span className="text-[14px] font-semibold leading-tight text-tinta">Cond. Jardim · Moradores</span>
          <span className="text-[12px] leading-tight text-vermelho">312 mensagens não lidas</span>
        </span>
      </div>
      {CHAT.map((message) => (
        <div
          key={message.time}
          className={`flex flex-col items-end gap-0.5 rounded-xl px-3 pb-1.5 pt-2 ${message.mine ? "self-end bg-verde-suave" : "self-start bg-campo"}`}
        >
          <span className="whitespace-pre-line text-[14px] font-medium leading-snug text-tinta">{message.text}</span>
          <span className="flex items-center gap-1 text-[10px] text-tinta-suave">
            {message.time}
            {message.mine && <CheckCheck size={12} aria-label="lida" />}
          </span>
        </div>
      ))}
    </div>
  );
}
