import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { acceptInvitation, getInvitationByToken } from "./invitationService";
import type { InvitationResponse } from "./types";
import { formatDateTime } from "../../shared/lib/date";
import { isStrongPassword } from "../../shared/lib/password";
import { PasswordRequirements } from "../../shared/components/PasswordRequirements";
import { Button } from "../../shared/components/Button";
import { TextField } from "../../shared/components/TextField";
import { AuthBackLink } from "../auth/AuthBackLink";
import { AuthLayout } from "../auth/AuthLayout";
import { InvitationPanel } from "../auth/authPanels";

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
  const [isLoading, setIsLoading] = useState(Boolean(token));
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

    // Without a token there is nothing to load: the page shows "Convite indisponível".
    if (!token) {
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

    if (!isStrongPassword(password)) {
      setErrorMessage("A senha precisa ter pelo menos 8 caracteres, com letras e números.");
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

  const roleLabel = invitation ? getRoleLabel(invitation) : undefined;
  const firstName = invitation?.personName.trim().split(/\s+/)[0];
  const panel = (
    <InvitationPanel
      condominiumName={invitation?.condominiumName}
      personName={invitation?.personName}
      roleLabel={roleLabel}
      validUntil={invitation ? formatDateTime(invitation.expiresAt) : undefined}
      isResident={roleLabel === "Morador"}
    />
  );

  if (isLoading) {
    return (
      <AuthLayout panel={panel}>
        <p role="status" className="text-[15px] text-tinta-suave">Carregando seu convite…</p>
      </AuthLayout>
    );
  }

  if (!invitation) {
    return (
      <AuthLayout panel={panel}>
        <h1 className="font-display text-[34px] font-bold leading-[1.12] tracking-[-0.015em] text-tinta">Convite indisponível</h1>
        <p className="mt-2 text-[15px] leading-relaxed text-tinta-suave">
          Este convite não existe, já foi usado ou venceu. Peça um novo convite para a administração do condomínio.
        </p>
        <AuthBackLink />
      </AuthLayout>
    );
  }

  return (
    <AuthLayout panel={panel}>
      <span className="inline-flex rounded-chip bg-verde-suave px-2.5 py-1 text-[13px] font-semibold text-verde-tinta">
        Convite para o {invitation.condominiumName}
      </span>
      <h1 className="mt-4 font-display text-[34px] font-bold leading-[1.12] tracking-[-0.015em] text-tinta">
        Olá, {firstName}! Boas-vindas ao Moraê
      </h1>
      <p className="mt-2 text-[15px] leading-relaxed text-tinta-suave">
        Este é o seu acesso ao {invitation.condominiumName} com o perfil {roleLabel}. Crie sua senha para entrar.
      </p>

      <form className="mt-8 flex flex-col gap-5" onSubmit={handleSubmit} noValidate>
        {successMessage && (
          <p role="status" className="rounded-field bg-verde-suave px-4 py-3 text-sm font-medium text-verde-tinta">
            {successMessage}
          </p>
        )}

        {errorMessage && (
          <p role="alert" className="rounded-field bg-vermelho-suave px-4 py-3 text-sm font-medium text-vermelho">
            {errorMessage}
          </p>
        )}

        <TextField
          label="E-mail"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="email"
        />
        <TextField
          label="Crie uma senha"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="new-password"
        />

        <PasswordRequirements password={password} />

        <Button type="submit" fullWidth isLoading={isSubmitting} loadingText="Ativando…" disabled={Boolean(successMessage)} className="mt-1">
          Ativar meu acesso
        </Button>
      </form>

      <p className="mt-6 text-[13px] text-tinta-suave">O convite vale até {formatDateTime(invitation.expiresAt)}.</p>
    </AuthLayout>
  );
}
