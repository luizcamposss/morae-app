import { Bell, CircleAlert, Receipt, Wallet, type LucideIcon } from "lucide-react";
import { Chapter, SceneHalo } from "./Chapter";
import { FitStage } from "./FitStage";
import { NoteCard, PixToast } from "./NoteCard";
import { UnitGridPanel } from "./UnitGridPanel";

const features: { icon: LucideIcon; title: string; text: string }[] = [
  { icon: Wallet, title: "Pix, cartão ou boleto", text: "O morador escolhe como pagar, direto no app." },
  { icon: Bell, title: "Lembrete automático", text: "3 dias antes e 1 dia depois do vencimento." },
  { icon: Receipt, title: "Comprovante na hora", text: "Por e-mail e no app, sem pedir para ninguém." },
];

// The month of one charge, told by the notifications around the panel.
const notes = [
  { x: 24, y: 24, node: <NoteCard compact icon={Bell} tone="ambar" title="Lembrete enviado · Apto 306" detail="07/10 · vence em 3 dias · e-mail e app" /> },
  { x: 390, y: 34, node: <PixToast unit="306" /> },
  { x: 467, y: 511, node: <NoteCard compact icon={Receipt} tone="verde" title="Comprovante enviado · Apto 306" detail="10/10, 09:41 · por e-mail e no app" /> },
  { x: -24, y: 519, node: <NoteCard compact icon={CircleAlert} tone="vermelho" title="Venceu ontem · Apto 409" detail="Novo lembrete enviado · 1 dia depois" /> },
];

export function ChapterReceive() {
  return (
    <Chapter
      id="receber"
      number="01"
      textWidth={524}
      largeTitle
      title={<>O morador paga no app.<br /><span className="text-verde">A baixa é sozinha</span>.</>}
      text="O Moraê cobra, lembra e confere por você. Você só acompanha o painel."
      details={
        <ul className="flex flex-col gap-5">
          {features.map(({ icon: Icon, title, text }) => (
            <li key={title} className="flex items-center gap-4">
              <span className="grid size-11 shrink-0 place-items-center rounded-[11px] bg-verde-suave text-verde">
                <Icon size={20} aria-hidden />
              </span>
              <span className="flex flex-col gap-0.5">
                <span className="text-[17px] font-semibold text-tinta">{title}</span>
                <span className="text-[15px] text-tinta-suave">{text}</span>
              </span>
            </li>
          ))}
        </ul>
      }
    >
      <div className="hidden lg:block">
        <FitStage width={740} height={592}>
          <SceneHalo className="-left-20 -top-[60px] h-[712px] w-[900px]" />
          <UnitGridPanel variant="compact" title="Cobranças · Outubro" selectedUnit="306" className="absolute left-[134px] top-[74px] w-[532px]" />
          {notes.map((note, index) => (
            <div key={index} className="absolute whitespace-nowrap" style={{ left: note.x, top: note.y }}>
              {note.node}
            </div>
          ))}
        </FitStage>
      </div>

      <div className="mx-auto flex max-w-[560px] flex-col gap-3 lg:hidden">
        <UnitGridPanel variant="compact" title="Cobranças · Outubro" selectedUnit="306" />
        {notes.map((note, index) => (
          <div key={index} className="[&>*]:w-full">
            {note.node}
          </div>
        ))}
      </div>
    </Chapter>
  );
}
