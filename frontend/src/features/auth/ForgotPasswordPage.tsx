import { useState, type FormEvent } from "react";
import { Check } from "lucide-react";
import { Button } from "../../shared/components/Button";
import { TextField } from "../../shared/components/TextField";
import { AuthBackLink } from "./AuthBackLink";
import { AuthLayout } from "./AuthLayout";
import { ForgotPasswordPanel } from "./authPanels";
import { forgotPassword } from "./authService";

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSent, setIsSent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");

    const normalizedEmail = email.trim();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setErrorMessage("Digite um e-mail válido, como nome@condominio.com.br.");
      return;
    }

    try {
      setIsSubmitting(true);
      await forgotPassword(normalizedEmail);
      setIsSent(true);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Não foi possível enviar o link. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthLayout panel={<ForgotPasswordPanel />}>
      <h1 className="font-display text-[34px] font-bold leading-[1.12] tracking-[-0.015em] text-tinta">Esqueceu a senha?</h1>
      <p className="mt-2 text-[15px] leading-relaxed text-tinta-suave">
        Digite o e-mail da sua conta. Se ele estiver cadastrado, você recebe um link para criar uma nova senha.
      </p>

      <form className="mt-8 flex flex-col gap-5" onSubmit={handleSubmit} noValidate>
        <TextField
          label="E-mail"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="voce@exemplo.com"
          autoComplete="email"
          error={errorMessage || undefined}
        />

        <Button type="submit" fullWidth isLoading={isSubmitting} loadingText="Enviando…">
          {isSent ? "Enviar de novo" : "Enviar link"}
        </Button>

        {isSent && (
          <p role="status" className="flex items-center gap-2 rounded-field bg-verde-suave px-4 py-3 text-sm font-medium text-verde-tinta">
            <Check size={16} strokeWidth={2.4} className="shrink-0 text-verde" aria-hidden />
            Pronto! Confira seu e-mail. O link vale por 1 hora.
          </p>
        )}
      </form>

      <AuthBackLink />
    </AuthLayout>
  );
}
