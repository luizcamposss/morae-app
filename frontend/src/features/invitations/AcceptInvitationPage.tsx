import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { acceptInvitation, getInvitationByToken } from "./invitationService";
import type { InvitationResponse } from "./types";
import logoMorae from "../../assets/logo-morae.svg";

function getRoleLabel(invitation: InvitationResponse) {
  if (invitation.roleName) {
    if (invitation.roleName === "Resident") return "Morador";
    if (invitation.roleName === "Syndic") return "Síndico";
    return invitation.roleName;
  }

  if (invitation.role === 2) return "Admin";
  if (invitation.role === 3) return "Síndico";
  return "Morador";
}

export function AcceptInvitationPage() {
  const { token = "" } = useParams();
  const navigate = useNavigate();

  const [invitation, setInvitation] = useState<InvitationResponse | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    async function loadInvitation() {
      try {
        setErrorMessage("");
        setIsLoading(true);

        const result = await getInvitationByToken(token);
        setInvitation(result);
        setEmail(result.email);
      } catch (error) {
        if (error instanceof Error) {
          setErrorMessage(error.message);
        } else {
          setErrorMessage("Não foi possível carregar o convite.");
        }
      } finally {
        setIsLoading(false);
      }
    }

    if (!token) {
      setErrorMessage("Token de convite inválido.");
      setIsLoading(false);
      return;
    }

    void loadInvitation();
  }, [token]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    if (!email.trim()) {
      setErrorMessage("Informe o e-mail que recebeu o convite.");
      return;
    }

    if (!password) {
      setErrorMessage("Defina uma senha para ativar seu acesso.");
      return;
    }

    if (password.length < 6) {
      setErrorMessage("A senha precisa ter pelo menos 6 caracteres.");
      return;
    }

    setIsSubmitting(true);

    try {
      await acceptInvitation({
        token,
        email,
        password,
      });

      setSuccessMessage("Convite aceito com sucesso. Você já pode fazer login.");

      window.setTimeout(() => {
        navigate("/login");
      }, 1200);
    } catch (error) {
      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("Não foi possível aceitar o convite.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="relative flex min-h-[100svh] items-stretch justify-center overflow-hidden bg-[#F3F4F6] text-[#111827] sm:items-center sm:bg-[#DCFCE7] sm:px-6 sm:py-8">
      <div className="absolute left-[-18rem] top-[-20rem] hidden h-[32rem] w-[32rem] rounded-full bg-[#86EFAC]/55 blur-3xl sm:block" />
      <div className="absolute bottom-[-22rem] right-[-18rem] hidden h-[38rem] w-[38rem] rounded-full bg-[#22C55E]/20 blur-3xl sm:block" />
      <div className="absolute inset-x-0 bottom-0 hidden h-1/2 bg-gradient-to-t from-white/60 to-transparent sm:block" />

      <section className="relative flex min-h-[100svh] w-full max-w-5xl flex-col overflow-hidden bg-white shadow-none sm:min-h-0 sm:rounded-[2.35rem] sm:shadow-2xl sm:shadow-[#0B3D2E]/20 sm:ring-1 sm:ring-white/80 lg:grid lg:grid-cols-[0.9fr_1.1fr]">
        <aside className="relative min-h-[18rem] overflow-hidden bg-[#0B3D2E] px-6 pb-14 pt-6 text-white sm:min-h-72 sm:px-9 sm:pb-10 lg:min-h-[38rem]">
          <div className="absolute left-[-42px] top-[-42px] size-32 rounded-full bg-[#86EFAC]/70" />
          <div className="absolute left-8 top-16 h-12 w-28 rounded-full bg-[#86EFAC]/55" />
          <div className="absolute bottom-0 left-0 h-28 w-full bg-gradient-to-t from-[#052E20]/35 to-transparent" />
          <div className="absolute right-6 top-7 flex size-24 items-center justify-center rounded-[2rem] bg-white/10 shadow-lg shadow-[#052E20]/20 ring-1 ring-white/10 sm:right-8 sm:top-8 sm:size-28">
            <img
              src={logoMorae}
              alt="Logo MORAÊ"
              className="h-16 w-16 object-contain drop-shadow-sm sm:h-20 sm:w-20"
            />
          </div>

          <div className="relative flex h-full flex-col">
            <div className="mt-24 max-w-sm sm:mt-28 lg:mt-36">
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-extrabold uppercase tracking-[0.2em] text-[#86EFAC] ring-1 ring-white/10">
                Primeiro acesso
              </span>
              <h1 className="mt-5 text-[2.7rem] font-black leading-none tracking-tight sm:text-5xl">
                Seu acesso ao MORAÊ está quase pronto.
              </h1>
              <p className="mt-5 text-sm font-semibold leading-7 text-white/78">
                Confirme o convite, crie sua senha e entre no painel do seu condomínio com segurança.
              </p>
            </div>
          </div>
        </aside>

        <section className="relative -mt-12 flex-1 rounded-t-[2rem] bg-[#F3F4F6] px-5 pb-6 pt-6 sm:-mt-8 sm:px-8 sm:pb-8 sm:pt-8 lg:mt-0 lg:rounded-none lg:bg-white lg:p-10">
          <img
            src={logoMorae}
            alt="Logo MORAÊ"
            className="absolute right-5 top-5 h-12 w-12 object-contain sm:right-8 sm:top-8"
          />

          <div className="mb-7">
            <h2 className="text-2xl font-black tracking-tight text-[#0B3D2E]">
              Aceitar convite
            </h2>
            <p className="mt-1 text-sm font-semibold leading-6 text-[#6B7280]">
              Confira os dados do convite e defina a senha do seu novo acesso.
            </p>
          </div>

          {isLoading && (
            <div className="rounded-2xl border border-[#E5E7EB] bg-white px-4 py-4 text-sm font-bold text-[#6B7280]">
              Carregando convite...
            </div>
          )}

          {errorMessage && (
            <div role="alert" className="rounded-2xl border border-[#FECACA] bg-[#FDECEC] px-4 py-3 text-sm font-bold leading-5 text-[#B42318]">
              {errorMessage}
            </div>
          )}

          {successMessage && (
            <div role="status" className="rounded-2xl border border-[#BBF7D0] bg-[#DCFCE7] px-4 py-3 text-sm font-bold leading-5 text-[#0B3D2E]">
              {successMessage}
            </div>
          )}

          {!isLoading && invitation && (
            <form className="mt-6 space-y-5" onSubmit={handleSubmit} noValidate>
              <div>
                <p className="mb-4 text-xs font-extrabold uppercase tracking-[0.22em] text-[#16A34A]">
                  Dados do convite
                </p>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <ReadOnlyField label="Nome" value={invitation.personName} placeholder="Nome do convidado" />
                  <ReadOnlyField label="Condomínio" value={invitation.condominiumName} placeholder="Condomínio vinculado" />
                  <ReadOnlyField label="Vínculo" value={getRoleLabel(invitation)} placeholder="Perfil de acesso" />
                  <ReadOnlyField
                    label="Expira em"
                    value={new Date(invitation.expiresAt).toLocaleString("pt-BR")}
                    placeholder="Data de expiração"
                  />
                </div>
              </div>

              <Field
                label="E-mail"
                type="email"
                value={email}
                onChange={setEmail}
                placeholder="Ex.: voce@email.com"
              />

              <PasswordField
                value={password}
                isVisible={isPasswordVisible}
                onChange={setPassword}
                onToggleVisibility={() => setIsPasswordVisible((current) => !current)}
              />

              <button
                type="submit"
                disabled={isSubmitting}
                className="h-12 w-full cursor-pointer rounded-2xl bg-[#16A34A] text-sm font-black text-white shadow-lg shadow-[#16A34A]/25 transition hover:-translate-y-0.5 hover:bg-[#0B3D2E] focus:outline-none focus:ring-4 focus:ring-[#86EFAC]/40 disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-70"
              >
                {isSubmitting ? "Ativando acesso..." : "Ativar meu acesso"}
              </button>
            </form>
          )}
        </section>
      </section>
    </main>
  );
}

type FieldProps = {
  label: string;
  type: "email" | "password";
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
};

function Field({ label, type, value, onChange, placeholder }: FieldProps) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-extrabold text-[#111827]">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-11 w-full rounded-2xl border border-[#E5E7EB] bg-white px-4 text-sm font-bold text-[#111827] outline-none transition placeholder:text-[#9CA3AF] focus:border-[#22C55E] focus:ring-4 focus:ring-[#86EFAC]/30"
      />
    </label>
  );
}

function PasswordField({
  value,
  isVisible,
  onChange,
  onToggleVisibility,
}: {
  value: string;
  isVisible: boolean;
  onChange: (value: string) => void;
  onToggleVisibility: () => void;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-extrabold text-[#111827]">
        Senha
      </span>
      <div className="flex h-12 items-center rounded-2xl border border-[#E5E7EB] bg-white shadow-sm transition focus-within:border-[#16A34A] focus-within:ring-4 focus-within:ring-[#86EFAC]/30">
        <input
          type={isVisible ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Mínimo 6 caracteres"
          autoComplete="new-password"
          className="h-full min-w-0 flex-1 rounded-2xl bg-transparent px-4 text-sm font-bold text-[#111827] outline-none placeholder:text-[#9CA3AF]"
        />
        <button
          type="button"
          aria-label={isVisible ? "Ocultar senha" : "Mostrar senha"}
          onClick={onToggleVisibility}
          className="mr-2 flex size-9 cursor-pointer items-center justify-center rounded-xl text-[#16A34A] transition hover:bg-[#DCFCE7] hover:text-[#0B3D2E]"
        >
          {isVisible ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      </div>
    </label>
  );
}

function ReadOnlyField({
  label,
  value,
  placeholder,
}: {
  label: string;
  value: string;
  placeholder: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-extrabold text-[#111827]">
        {label}
      </span>
      <input
        type="text"
        value={value}
        readOnly
        placeholder={placeholder}
        className="h-11 w-full rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] px-4 text-sm font-bold text-[#111827] outline-none placeholder:text-[#9CA3AF]"
      />
    </label>
  );
}

function EyeIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="size-5"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
    >
      <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
      <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="size-5"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
    >
      <path d="M3 3l18 18" />
      <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
      <path d="M9.9 5.3A10 10 0 0 1 12 5c6 0 9.5 7 9.5 7a15.4 15.4 0 0 1-2.1 3.1" />
      <path d="M6.6 6.7C3.9 8.5 2.5 12 2.5 12s3.5 7 9.5 7c1.2 0 2.3-.3 3.3-.7" />
    </svg>
  );
}
