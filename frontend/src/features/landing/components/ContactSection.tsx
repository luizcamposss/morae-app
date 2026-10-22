import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { ArrowRight, CircleAlert } from "lucide-react";
import { MoraeMark } from "../../../shared/components/MoraeMark";
import { apiRequest } from "../../../shared/lib/api/apiClient";
import { loadCommercialWhatsApp, useCommercialWhatsApp, whatsappLink } from "../../../shared/hooks/useCommercialWhatsApp";
import { pains, startSteps, type PainId } from "../landingContent";

type Role = "admin" | "sindico";
type ContactSectionProps = { pain: PainId };
type FieldName = "name" | "whatsApp" | "units";
type FieldErrors = Partial<Record<FieldName, string>>;

const roles: { id: Role; label: string; profile: number }[] = [
  // profile = LandingContactProfileType on the backend (docs/ai/api.md).
  { id: "admin", label: "Administrador(a)", profile: 1 },
  { id: "sindico", label: "Síndico(a)", profile: 2 },
];

// Same limits as LandingContactService on the backend.
const NAME_MIN = 2;
const NAME_MAX = 120;
const UNITS_MAX = 10000;

// Example shown in the preview until the visitor types their own data.
const EXAMPLE = { name: "Carla", units: "60" };

const NETWORK_ERROR = "Não conseguimos enviar agora. Confira sua internet e tente de novo.";

export function ContactSection({ pain }: ContactSectionProps) {
  const [name, setName] = useState("");
  const [whatsApp, setWhatsApp] = useState("");
  const [units, setUnits] = useState("");
  const [role, setRole] = useState<Role>("admin");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [isSending, setIsSending] = useState(false);
  const [submitError, setSubmitError] = useState("");
  // Set once the lead is saved; the form gives way to the confirmation.
  const [sent, setSent] = useState<{ phone: string; message: string; openedTab: boolean } | null>(null);
  const whatsAppNumber = useCommercialWhatsApp();
  const fieldId = useId();
  const successHeadingRef = useRef<HTMLHeadingElement>(null);
  const selectedPain = pains.find((item) => item.id === pain) ?? pains[0];

  const firstName = collapseSpaces(name).split(" ")[0];
  const message =
    `Oi! Sou ${firstName || EXAMPLE.name}, ${role === "admin" ? "administrador(a)" : "síndico(a)"} de um condomínio com ` +
    `${units || EXAMPLE.units} unidades. Hoje o que mais pesa é ${selectedPain.selectorLabel}. Quero ver o Moraê funcionando.`;

  useEffect(() => {
    if (sent) successHeadingRef.current?.focus();
  }, [sent]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSending) return;

    const nextErrors = validate(name, whatsApp, units);
    setErrors(nextErrors);
    setSubmitError("");
    const firstInvalid = (["name", "whatsApp", "units"] as const).find((field) => nextErrors[field]);
    if (firstInvalid) {
      document.getElementById(`${fieldId}-${firstInvalid}`)?.focus();
      return;
    }

    // Pop-up blockers only allow window.open inside the click itself, not after an await.
    // So the WhatsApp tab opens blank right now and only goes to wa.me once the lead is saved;
    // if saving fails, the tab closes and the visitor is back on the filled form with the error.
    const number = whatsAppNumber;
    const waTab = number ? openPendingTab() : null;
    if (!number) void loadCommercialWhatsApp(); // a failed first load gets another chance for the confirmation link

    setIsSending(true);
    try {
      await apiRequest("/api/public/contacts", {
        method: "POST",
        body: {
          name: collapseSpaces(name),
          whatsApp,
          unitCount: Number(units),
          profile: roles.find((option) => option.id === role)!.profile,
          pain,
        },
      });

      if (waTab && number) waTab.location.href = whatsappLink(number, message);
      setSent({ phone: formatPhone(whatsApp), message, openedTab: Boolean(waTab) });
    } catch (error) {
      waTab?.close();
      setSubmitError(toVisitorMessage(error));
    } finally {
      setIsSending(false);
    }
  }

  function updateField(field: FieldName, value: string) {
    if (field === "name") setName(value);
    if (field === "whatsApp") setWhatsApp(value);
    if (field === "units") setUnits(value);
    // The error goes away as soon as the visitor fixes the field.
    if (errors[field]) setErrors((current) => ({ ...current, [field]: validate(
      field === "name" ? value : name,
      field === "whatsApp" ? value : whatsApp,
      field === "units" ? value : units,
    )[field] }));
  }

  return (
    <section id="contato" className="scroll-mt-4 bg-fundo px-4 pb-24 pt-20 sm:px-8 lg:pb-[140px] lg:pt-[140px]">
      <header className="mx-auto max-w-[960px] text-center">
        <h2 className="font-display text-[clamp(2.5rem,5.4vw,4rem)] font-bold leading-[1.02] tracking-[-0.025em] text-tinta max-lg:text-balance">
          Veja o seu condomínio <span className="text-verde">recebendo em dia</span>.
        </h2>
        <p className="mt-5 text-[clamp(1.0625rem,1.5vw,1.25rem)] text-pretty text-tinta-suave">
          Deixe seu contato e a gente te chama no WhatsApp para mostrar o Moraê funcionando.
        </p>
      </header>

      <div className="mx-auto mt-12 max-w-[1000px] rounded-card border border-linha bg-superficie p-5 shadow-[0_24px_56px_-12px_rgb(15_61_62/0.12)] sm:p-8">
        {sent ? (
          <div className="flex flex-col items-center gap-5 px-2 py-8 text-center sm:py-12" role="status">
            <MoraeMark size={64} motion="chegada" />
            <div className="flex max-w-[520px] flex-col gap-3">
              <h3
                ref={successHeadingRef}
                tabIndex={-1}
                className="font-display text-[clamp(1.75rem,3vw,2.25rem)] font-bold leading-[1.1] tracking-[-0.015em] text-tinta outline-none"
              >
                Recebemos seu contato.
              </h3>
              <p className="text-[17px] leading-[1.5] text-pretty text-tinta-suave">
                Uma pessoa do time te chama em breve no WhatsApp{" "}
                <span className="whitespace-nowrap font-semibold text-tinta tabular-nums">{sent.phone}</span>.
              </p>
              {whatsAppNumber && (
                <p className="text-[15px] leading-[1.5] text-pretty text-tinta-suave">
                  {sent.openedTab
                    ? "A conversa também abriu em outra aba, com a mensagem pronta. Se ela não apareceu, use o botão abaixo."
                    : "Se quiser adiantar, a conversa já está pronta no nosso WhatsApp."}
                </p>
              )}
            </div>
            <div className="flex flex-col items-center gap-3 sm:flex-row">
              {whatsAppNumber && (
                <a
                  href={whatsappLink(whatsAppNumber, sent.message)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group inline-flex h-12 items-center justify-center gap-3 rounded-full bg-verde px-6 text-[17px] font-bold text-verde-tinta transition-colors duration-150 hover:bg-verde-forte focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-verde"
                >
                  Abrir conversa no WhatsApp
                  <ArrowRight size={20} strokeWidth={2.4} aria-hidden className="transition-transform duration-200 ease-out-expo group-hover:translate-x-1" />
                </a>
              )}
              <button
                type="button"
                onClick={() => setSent(null)}
                className="inline-flex h-12 items-center justify-center rounded-full bg-campo px-5 text-[15px] font-semibold text-tinta transition-colors duration-150 hover:bg-menu focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-verde"
              >
                Corrigir meus dados
              </button>
            </div>
          </div>
        ) : (
          <form noValidate onSubmit={handleSubmit} aria-busy={isSending} className="grid gap-8 lg:grid-cols-[1fr_380px]">
            <div className="flex flex-col gap-5">
              <p className="inline-flex w-fit items-center gap-2 rounded-chip bg-verde-suave px-2.5 py-1.5 text-[13px] font-semibold text-verde-tinta">
                <span className="size-2 rounded-full bg-verde" />
                Você escolheu: {selectedPain.formLabel}
              </p>

              <Field
                id={`${fieldId}-name`}
                label="Seu nome"
                placeholder="Ex.: Carla Mendes"
                autoComplete="name"
                maxLength={NAME_MAX}
                value={name}
                error={errors.name}
                disabled={isSending}
                onChange={(value) => updateField("name", value)}
              />

              <div className="grid gap-4 sm:grid-cols-[1fr_200px]">
                <Field
                  id={`${fieldId}-whatsApp`}
                  label="Seu WhatsApp, com DDD"
                  placeholder="(11) 99999-9999"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  maxLength={20}
                  value={whatsApp}
                  error={errors.whatsApp}
                  disabled={isSending}
                  onChange={(value) => updateField("whatsApp", value.replace(/[^\d\s()+-]/g, ""))}
                />
                <Field
                  id={`${fieldId}-units`}
                  label="Quantas unidades?"
                  placeholder="Ex.: 60"
                  inputMode="numeric"
                  value={units}
                  error={errors.units}
                  disabled={isSending}
                  onChange={(value) => updateField("units", value.replace(/\D/g, "").replace(/^0+/, "").slice(0, 5))}
                />
              </div>

              <fieldset className="flex flex-col gap-2" disabled={isSending}>
                <legend className="mb-2 text-[14px] font-semibold text-tinta">Você é</legend>
                <div className="grid grid-cols-2 gap-2">
                  {roles.map((option) => (
                    <label
                      key={option.id}
                      className={`grid h-12 cursor-pointer place-items-center rounded-full text-[15px] font-semibold transition-colors duration-150 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-verde has-[:disabled]:cursor-default ${role === option.id ? "bg-tinta text-white" : "border border-linha bg-superficie text-tinta hover:bg-campo"}`}
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

              <p className="text-[13px] font-medium text-tinta-suave">Sem cadastro. Quem responde é uma pessoa do time, pelo WhatsApp.</p>
            </div>

            <div className="flex flex-col gap-5">
              {whatsAppNumber ? (
                <div className="flex flex-1 flex-col gap-3 rounded-block bg-campo p-[18px]">
                  <p className="text-[13px] font-semibold text-tinta-suave">Ao enviar, o WhatsApp abre com esta mensagem</p>
                  <p className="rounded-xl bg-verde-suave px-3.5 py-3 text-[15px] leading-[1.45] text-tinta">{message}</p>
                  <p className="text-[13px] text-tinta-suave">Você revisa antes de mandar. Seu contato fica salvo mesmo se não mandar.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-2 rounded-block bg-campo p-[18px]">
                  <p className="text-[13px] font-semibold text-tinta-suave">Depois de enviar</p>
                  <p className="text-[15px] leading-[1.45] text-tinta">
                    Seu contato chega direto para o nosso time, e uma pessoa te chama no WhatsApp que você informou.
                  </p>
                </div>
              )}

              {submitError && (
                <div role="alert" className="flex gap-3 rounded-field bg-vermelho-suave px-4 py-3 text-[14px] leading-snug text-tinta">
                  <CircleAlert size={18} strokeWidth={2} aria-hidden className="mt-px shrink-0 text-vermelho" />
                  <p>
                    <span className="font-semibold">{submitError}</span>
                    {whatsAppNumber && (
                      <>
                        {" "}Se preferir,{" "}
                        <a
                          href={whatsappLink(whatsAppNumber, message)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-semibold text-tinta underline underline-offset-4 hover:text-tinta-forte"
                        >
                          fale direto no WhatsApp
                        </a>
                        .
                      </>
                    )}
                  </p>
                </div>
              )}

              <button
                type="submit"
                disabled={isSending}
                className="group mt-auto inline-flex h-12 items-center justify-center gap-3 rounded-full bg-verde px-6 text-[18px] font-bold text-verde-tinta transition-colors duration-150 hover:bg-verde-forte focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-verde disabled:cursor-wait disabled:hover:bg-verde"
              >
                {isSending ? (
                  <>
                    <MoraeMark size={22} motion="respiro" className="[&_svg]:text-verde-tinta" />
                    Enviando…
                  </>
                ) : (
                  <>
                    {whatsAppNumber ? "Enviar e abrir o WhatsApp" : "Enviar contato"}
                    <ArrowRight size={20} strokeWidth={2.4} aria-hidden className="transition-transform duration-200 ease-out-expo group-hover:translate-x-1" />
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>

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

function collapseSpaces(value: string) {
  return value.trim().split(/\s+/).filter(Boolean).join(" ");
}

function validate(name: string, whatsApp: string, units: string): FieldErrors {
  const nameLength = collapseSpaces(name).length;
  const digits = whatsApp.replace(/\D/g, "").length;
  const unitCount = Number(units);

  return {
    name:
      nameLength < NAME_MIN
        ? "Escreva seu nome."
        : nameLength > NAME_MAX
          ? `O nome pode ter no máximo ${NAME_MAX} caracteres.`
          : undefined,
    whatsApp: digits < 10 || digits > 13 ? "Use DDD + número, ex.: (11) 99999-9999." : undefined,
    units:
      units && Number.isInteger(unitCount) && unitCount >= 1 && unitCount <= UNITS_MAX
        ? undefined
        : "De 1 a 10.000 unidades.",
  };
}

// "(11) 99999-9999" for Brazilian numbers (with or without the 55); anything else stays as typed.
function formatPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  const local = digits.length >= 12 && digits.startsWith("55") ? digits.slice(2) : digits;
  if (local.length === 11) return `(${local.slice(0, 2)}) ${local.slice(2, 7)}-${local.slice(7)}`;
  if (local.length === 10) return `(${local.slice(0, 2)}) ${local.slice(2, 6)}-${local.slice(6)}`;
  return value.trim();
}

// Opens the WhatsApp tab during the click (see handleSubmit). Null when the browser blocks it anyway.
function openPendingTab() {
  const tab = window.open("", "_blank");
  if (!tab) return null;

  // Same protection as rel="noopener": wa.me must not reach back into the landing page.
  tab.opener = null;
  try {
    tab.document.title = "Abrindo o WhatsApp…";
    tab.document.body.style.cssText = "font:500 17px system-ui,sans-serif;color:#0f3d3e;background:#edf0ea;display:grid;place-items:center;min-height:100vh;margin:0";
    tab.document.body.textContent = "Abrindo o WhatsApp…";
  } catch {
    // The blank tab is only a placeholder; the redirect below still works without the text.
  }
  return tab;
}

// The API answers 400/429 with a Portuguese message; network and server failures get a plain one.
function toVisitorMessage(error: unknown) {
  if (!(error instanceof Error) || error instanceof TypeError) return NETWORK_ERROR;
  if (/^(Erro ao comunicar|Resposta inv)/.test(error.message) || !error.message) return NETWORK_ERROR;
  return error.message;
}

type FieldProps = {
  id: string;
  label: string;
  placeholder: string;
  value: string;
  error?: string;
  type?: "text" | "tel";
  autoComplete?: string;
  inputMode?: "numeric" | "tel";
  maxLength?: number;
  disabled?: boolean;
  onChange: (value: string) => void;
};

function Field({ id, label, placeholder, value, error, type = "text", autoComplete, inputMode, maxLength, disabled, onChange }: FieldProps) {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <label htmlFor={id} className="text-[14px] font-semibold text-tinta">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        placeholder={placeholder}
        autoComplete={autoComplete}
        inputMode={inputMode}
        maxLength={maxLength}
        disabled={disabled}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        onChange={(event) => onChange(event.target.value)}
        className={`h-[52px] w-full min-w-0 rounded-field border bg-superficie px-4 text-[17px] font-medium text-tinta outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-tinta-suave/80 focus:ring-2 disabled:opacity-60 ${error ? "border-vermelho focus:ring-vermelho/20" : "border-linha focus:border-verde focus:ring-verde/25"}`}
      />
      {error && (
        <p id={`${id}-error`} className="text-[13px] font-medium text-vermelho">
          {error}
        </p>
      )}
    </div>
  );
}
