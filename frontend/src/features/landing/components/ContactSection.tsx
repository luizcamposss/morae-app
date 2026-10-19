import { useId, useState, type FormEvent } from "react";
import { ArrowRight } from "lucide-react";
import { pains, startSteps, type PainId } from "../landingContent";
import { whatsappLink } from "../whatsapp";

type Role = "admin" | "sindico";
type ContactSectionProps = { pain: PainId };

const roles: { id: Role; label: string }[] = [
  { id: "admin", label: "Administrador(a)" },
  { id: "sindico", label: "Síndico(a)" },
];

// Example shown in the preview until the visitor types their own data.
const EXAMPLE = { name: "Carla", units: "60" };

export function ContactSection({ pain }: ContactSectionProps) {
  const [name, setName] = useState("");
  const [units, setUnits] = useState("");
  const [role, setRole] = useState<Role>("admin");
  const [errors, setErrors] = useState<{ name?: string; units?: string }>({});
  const fieldId = useId();
  const selectedPain = pains.find((item) => item.id === pain) ?? pains[0];

  const firstName = name.trim().split(/\s+/)[0];
  const message =
    `Oi! Sou ${firstName || EXAMPLE.name}, ${role === "admin" ? "administrador(a)" : "síndico(a)"} de um condomínio com ` +
    `${units || EXAMPLE.units} unidades. Hoje o que mais pesa é ${selectedPain.selectorLabel}. Quero ver o Moraê funcionando.`;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const unitCount = Number(units);
    const nextErrors = {
      name: name.trim() ? undefined : "Escreva seu nome para a mensagem sair pronta.",
      units: Number.isInteger(unitCount) && unitCount > 0 ? undefined : "Informe quantas unidades o condomínio tem.",
    };
    setErrors(nextErrors);
    if (nextErrors.name || nextErrors.units) return;

    window.open(whatsappLink(message), "_blank", "noopener,noreferrer");
  }

  return (
    <section id="contato" className="scroll-mt-4 bg-fundo px-4 pb-24 pt-20 sm:px-8 lg:pb-[140px] lg:pt-[140px]">
      <header className="mx-auto max-w-[960px] text-center">
        <h2 className="font-display text-[clamp(2.5rem,5.4vw,4rem)] font-bold leading-[1.02] tracking-[-0.025em] text-tinta max-lg:text-balance">
          Veja o seu condomínio <span className="text-verde">recebendo em dia</span>.
        </h2>
        <p className="mt-5 text-[clamp(1.0625rem,1.5vw,1.25rem)] text-pretty text-tinta-suave">
          Preencha aqui e a conversa já abre no nosso WhatsApp, com a mensagem pronta.
        </p>
      </header>

      <form
        noValidate
        onSubmit={handleSubmit}
        className="mx-auto mt-12 grid max-w-[1000px] gap-8 rounded-card border border-linha bg-superficie p-5 shadow-[0_24px_56px_-12px_rgb(15_61_62/0.12)] sm:p-8 lg:grid-cols-[1fr_380px]"
      >
        <div className="flex flex-col gap-5">
          <p className="inline-flex w-fit items-center gap-2 rounded-chip bg-verde-suave px-2.5 py-1.5 text-[13px] font-semibold text-verde-tinta">
            <span className="size-2 rounded-full bg-verde" />
            Você escolheu: {selectedPain.formLabel}
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              id={`${fieldId}-name`}
              label="Seu nome"
              placeholder="Ex.: Carla Mendes"
              autoComplete="name"
              value={name}
              error={errors.name}
              onChange={setName}
            />
            <Field
              id={`${fieldId}-units`}
              label="Quantas unidades?"
              placeholder="Ex.: 60"
              inputMode="numeric"
              value={units}
              error={errors.units}
              onChange={(value) => setUnits(value.replace(/\D/g, "").slice(0, 4))}
            />
          </div>

          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-[14px] font-semibold text-tinta">Você é</legend>
            <div className="grid grid-cols-2 gap-2">
              {roles.map((option) => (
                <label
                  key={option.id}
                  className={`grid h-12 cursor-pointer place-items-center rounded-full text-[15px] font-semibold transition-colors duration-150 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-verde ${role === option.id ? "bg-tinta text-white" : "border border-linha bg-superficie text-tinta hover:bg-campo"}`}
                >
                  <input
                    type="radio"
                    name="role"
                    value={option.id}
                    checked={role === option.id}
                    onChange={() => setRole(option.id)}
                    className="sr-only"
                  />
                  {option.label}
                </label>
              ))}
            </div>
          </fieldset>

          <p className="text-[13px] font-medium text-tinta-suave">Sem cadastro. A resposta vem de uma pessoa do time, no mesmo chat.</p>
        </div>

        <div className="flex flex-col gap-5">
          <div className="flex flex-1 flex-col gap-3 rounded-block bg-campo p-[18px]" aria-live="polite">
            <p className="text-[13px] font-semibold text-tinta-suave">Vai abrir assim no WhatsApp</p>
            <p className="rounded-xl bg-verde-suave px-3.5 py-3 text-[15px] leading-[1.45] text-tinta">{message}</p>
            <p className="text-[13px] text-tinta-suave">Você revisa antes de enviar.</p>
          </div>
          <button
            type="submit"
            className="group inline-flex h-12 items-center justify-center gap-3 rounded-full bg-verde px-6 text-[18px] font-bold text-verde-tinta transition-colors duration-150 hover:bg-verde-forte focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-verde"
          >
            Abrir conversa no WhatsApp
            <ArrowRight size={20} strokeWidth={2.4} aria-hidden className="transition-transform duration-200 ease-out-expo group-hover:translate-x-1" />
          </button>
        </div>
      </form>

      <ol className="mx-auto mt-12 grid max-w-[1000px] gap-8 sm:grid-cols-3 sm:gap-8">
        {startSteps.map((step, index) => {
          const last = index === startSteps.length - 1;
          return (
            <li key={step.title} className="flex flex-col gap-3">
              <span className="flex items-center gap-3">
                <span className={`grid size-10 shrink-0 place-items-center rounded-full font-display text-[18px] font-bold text-white ${last ? "bg-verde" : "bg-tinta"}`}>
                  {index + 1}
                </span>
                {!last && <span aria-hidden className="hidden h-0.5 flex-1 bg-linha sm:block" />}
              </span>
              <span className="flex flex-col gap-0.5">
                <span className="text-[17px] font-semibold text-tinta">{step.title}</span>
                <span className="text-[15px] leading-snug text-tinta-suave">{step.text}</span>
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

type FieldProps = {
  id: string;
  label: string;
  placeholder: string;
  value: string;
  error?: string;
  autoComplete?: string;
  inputMode?: "numeric";
  onChange: (value: string) => void;
};

function Field({ id, label, placeholder, value, error, autoComplete, inputMode, onChange }: FieldProps) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-[14px] font-semibold text-tinta">
        {label}
      </label>
      <input
        id={id}
        value={value}
        placeholder={placeholder}
        autoComplete={autoComplete}
        inputMode={inputMode}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        onChange={(event) => onChange(event.target.value)}
        className={`h-[52px] rounded-field border bg-superficie px-4 text-[17px] font-medium text-tinta outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-tinta-suave/80 focus:border-verde focus:ring-2 focus:ring-verde/25 ${error ? "border-vermelho" : "border-linha"}`}
      />
      {error && (
        <p id={`${id}-error`} className="text-[13px] font-medium text-vermelho">
          {error}
        </p>
      )}
    </div>
  );
}
