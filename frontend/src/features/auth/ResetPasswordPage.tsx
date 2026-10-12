import { useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Button, ButtonLink } from "../../shared/components/Button";
import { PasswordRequirements } from "../../shared/components/PasswordRequirements";
import { TextField } from "../../shared/components/TextField";
import { isStrongPassword } from "../../shared/lib/password";
import { AuthBackLink } from "./AuthBackLink";
import { AuthLayout } from "./AuthLayout";
import { ResetPasswordPanel } from "./authPanels";
import { resetPassword } from "./authService";

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isDone, setIsDone] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");

    if (!isStrongPassword(password)) {
      setErrorMessage("A senha ainda não atende aos requisitos abaixo.");
      return;
    }

    if (password !== confirmation) {
      setErrorMessage("As duas senhas precisam ser iguais.");
      return;
    }

    try {
      setIsSubmitting(true);
      await resetPassword(token, password);
      setIsDone(true);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Não foi possível salvar a nova senha. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!token) {
    return (
      <AuthLayout panel={<ResetPasswordPanel />}>
        <h1 className="font-display text-[34px] font-bold leading-[1.12] tracking-[-0.015em] text-tinta">Link incompleto</h1>
        <p className="mt-2 text-[15px] leading-relaxed text-tinta-suave">
          Abra o link do e-mail de novo ou peça um novo link para criar a senha.
        </p>
        <ButtonLink to="/forgot-password" fullWidth className="mt-8">
          Pedir novo link
        </ButtonLink>
        <AuthBackLink />
      </AuthLayout>
    );
  }

  if (isDone) {
    return (
      <AuthLayout panel={<ResetPasswordPanel />}>
        <h1 className="font-display text-[34px] font-bold leading-[1.12] tracking-[-0.015em] text-tinta">Senha alterada</h1>
        <p className="mt-2 text-[15px] leading-relaxed text-tinta-suave">
          Pronto! Entre com a nova senha. Por segurança, você saiu de todos os outros aparelhos.
        </p>
        <ButtonLink to="/login" fullWidth className="mt-8">
          Ir para o login
        </ButtonLink>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout panel={<ResetPasswordPanel password={password} />}>
      <h1 className="font-display text-[34px] font-bold leading-[1.12] tracking-[-0.015em] text-tinta">Crie sua nova senha</h1>
      <p className="mt-2 text-[15px] leading-relaxed text-tinta-suave">
        Ela precisa ter pelo menos 8 caracteres, com letras e números.
      </p>

      <form className="mt-8 flex flex-col gap-5" onSubmit={handleSubmit} noValidate>
        {errorMessage && (
          <p role="alert" className="rounded-field bg-vermelho-suave px-4 py-3 text-sm font-medium text-vermelho">
            {errorMessage}{" "}
            {/* The API says the link is "inválido ou expirou": offer the shortcut to ask for a new one. */}
            {/inválido|expirad/i.test(errorMessage) && (
              <Link to="/forgot-password" className="font-semibold underline underline-offset-2">
                Pedir novo link
              </Link>
            )}
          </p>
        )}

        <TextField
          label="Nova senha"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="new-password"
        />
        <TextField
          label="Repita a nova senha"
          type="password"
          value={confirmation}
          onChange={(event) => setConfirmation(event.target.value)}
          autoComplete="new-password"
        />

        <PasswordRequirements password={password} confirmation={confirmation} />

        <Button type="submit" fullWidth isLoading={isSubmitting} loadingText="Salvando…" className="mt-1">
          Salvar nova senha
        </Button>
      </form>

      <p className="mt-6 text-[13px] text-tinta-suave">Por segurança, você sai de todos os outros aparelhos conectados.</p>
    </AuthLayout>
  );
}
