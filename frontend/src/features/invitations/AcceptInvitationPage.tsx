import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { acceptInvitation, getInvitationByToken } from "./invitationService";
import type { InvitationResponse } from "./types";
import logoMorae from "../../assets/logo-morae.svg";

function getRoleLabel(invitation: InvitationResponse) {
  if (invitation.roleName) {
    return invitation.roleName;
  }

  if (invitation.role === 2) return "Admin";
  if (invitation.role === 3) return "Syndic";
  return "Resident";
}

export function AcceptInvitationPage() {
  const { token = "" } = useParams();
  const navigate = useNavigate();

  const [invitation, setInvitation] = useState<InvitationResponse | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
          setErrorMessage("Nao foi possivel carregar o convite.");
        }
      } finally {
        setIsLoading(false);
      }
    }

    if (!token) {
      setErrorMessage("Token de convite invalido.");
      setIsLoading(false);
      return;
    }

    void loadInvitation();
  }, [token]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");
    setIsSubmitting(true);

    try {
      await acceptInvitation({
        token,
        email,
        password,
      });

      setSuccessMessage("Convite aceito com sucesso. Voce ja pode fazer login.");

      window.setTimeout(() => {
        navigate("/login");
      }, 1200);
    } catch (error) {
      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("Nao foi possivel aceitar o convite.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#F3F4F6] px-6 py-10">
      <section className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-5xl items-center">
        <div className="grid w-full overflow-hidden rounded-[2rem] border border-[#E5E7EB] bg-white shadow-sm lg:grid-cols-[1fr_1.15fr]">
          <aside className="bg-[#0B3D2E] p-8 text-white">
            <div className="flex size-16 items-center justify-center">
              <img
                src={logoMorae}
                alt="Logo MORAÊ"
                className="h-14 w-14 object-contain"
              />
            </div>
            <h1 className="mt-8 text-4xl font-extrabold tracking-tight">
              Bem-vindo ao morae
            </h1>
            <p className="mt-4 text-sm font-semibold leading-6 text-white/75">
              Aceite o convite para criar seu acesso e entrar no painel do seu condominio.
            </p>
          </aside>

          <section className="p-8">
            <div className="mb-8">
              <h2 className="text-2xl font-extrabold text-[#111827]">
                Aceitar convite
              </h2>
              <p className="mt-2 text-sm font-semibold text-[#6B7280]">
                Confirme os dados abaixo e defina sua senha.
              </p>
            </div>

            {isLoading && (
              <p className="text-sm font-semibold text-[#6B7280]">
                Carregando convite...
              </p>
            )}

            {errorMessage && (
              <div className="rounded-2xl border border-[#FECACA] bg-[#FDECEC] p-4 text-sm font-semibold text-[#B42318]">
                {errorMessage}
              </div>
            )}

            {successMessage && (
              <div className="rounded-2xl border border-[#BBF7D0] bg-[#DCFCE7] p-4 text-sm font-semibold text-[#178A63]">
                {successMessage}
              </div>
            )}

            {!isLoading && invitation && (
              <form className="mt-6 space-y-6" onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <ReadOnlyField label="Pessoa" value={invitation.personName} />
                  <ReadOnlyField label="Condominio" value={invitation.condominiumName} />
                  <ReadOnlyField label="Papel" value={getRoleLabel(invitation)} />
                  <ReadOnlyField
                    label="Expira em"
                    value={new Date(invitation.expiresAt).toLocaleString("pt-BR")}
                  />
                </div>

                <Field
                  label="E-mail"
                  type="email"
                  value={email}
                  onChange={setEmail}
                  placeholder="seu@email.com"
                />

                <Field
                  label="Senha"
                  type="password"
                  value={password}
                  onChange={setPassword}
                  placeholder="Defina sua senha"
                />

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="h-12 w-full rounded-2xl bg-[#16A34A] text-sm font-extrabold text-white shadow-sm shadow-[#16A34A]/30 transition hover:bg-[#0B3D2E] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isSubmitting ? "Aceitando..." : "Aceitar convite"}
                </button>
              </form>
            )}

            <Link
              to="/login"
              className="mt-6 inline-flex text-sm font-extrabold text-[#16A34A] transition hover:text-[#0B3D2E]"
            >
              Voltar para login
            </Link>
          </section>
        </div>
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

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-extrabold text-[#111827]">
        {label}
      </span>
      <input
        type="text"
        value={value}
        readOnly
        className="h-11 w-full rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] px-4 text-sm font-bold text-[#111827] outline-none"
      />
    </label>
  );
}
