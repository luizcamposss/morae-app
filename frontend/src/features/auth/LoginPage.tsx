import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { login } from "./authService";
import { saveToken } from "./authStorage";
import { useAuth } from "../../app/providers/useAuth";
import { getDefaultRouteByRoles } from "./authRedirect";
import { Button } from "../../shared/components/Button";
import { TextField } from "../../shared/components/TextField";
import { useCommercialWhatsApp, whatsappLink } from "../../shared/hooks/useCommercialWhatsApp";
import { AuthLayout } from "./AuthLayout";
import { LoginPanel } from "./authPanels";

export function LoginPage() {
    const navigate = useNavigate();
    const { refreshUser } = useAuth();
    const [searchParams] = useSearchParams();
    const isSessionExpired = searchParams.get("expired") === "1";
    
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [errorMessage, setErrorMessage] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const whatsAppNumber = useCommercialWhatsApp();

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setErrorMessage("");

        const credentials = {
            email: email.trim(),
            password,
        };

        if (!credentials.email || !credentials.password) {
            setErrorMessage("Informe e-mail e senha para continuar.");
            return;
        }

        if (!isValidEmail(credentials.email)) {
            setErrorMessage("Digite um e-mail válido, como nome@condominio.com.br.");
            return;
        }

        try {
            setIsSubmitting(true);

            const result = await login(credentials);

            if (!result.success || !result.token) {
                setErrorMessage(result.message || "Não foi possível entrar.");
                return;
            }

            saveToken(result.token);

            const me = await refreshUser();

            if (!me) {
                setErrorMessage("Não foi possível carregar a sessão do usuário.");
                return;
            }

            const defaultRoute = getDefaultRouteByRoles(me.roles);
            navigate(defaultRoute);
        } catch (error) {
            if (error instanceof Error) {
                setErrorMessage(error.message);
            } else {
                setErrorMessage("Erro inesperado ao realizar login.");
            }
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <AuthLayout panel={<LoginPanel />}>
            <h1 className="font-display text-[34px] font-bold leading-[1.12] tracking-[-0.015em] text-tinta">
                Bem-vindo de volta
            </h1>
            <p className="mt-2 text-[15px] text-tinta-suave">Entre para ver como está o seu condomínio hoje.</p>

            <form className="mt-8 flex flex-col gap-5" onSubmit={handleSubmit} noValidate>
                {isSessionExpired && !errorMessage && (
                    <p role="status" className="rounded-field bg-ambar-suave px-4 py-3 text-sm font-medium text-tinta">
                        Sua sessão expirou. Entre novamente para continuar.
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
                    placeholder="voce@exemplo.com"
                    autoComplete="email"
                />

                <TextField
                    label="Senha"
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    autoComplete="current-password"
                    labelAction={
                        <Link to="/forgot-password" className="text-[13px] font-semibold text-verde hover:text-verde-forte">
                            Esqueci minha senha
                        </Link>
                    }
                />

                <Button type="submit" fullWidth isLoading={isSubmitting} loadingText="Entrando…" className="mt-1">
                    Entrar
                </Button>
            </form>

            <p className="mt-6 text-[13px] leading-relaxed text-tinta-suave">
                Primeiro acesso? Use o link do convite que chegou no seu e-mail.
            </p>

            {/* For people who land here without an account: only when the commercial WhatsApp is configured. */}
            {whatsAppNumber && (
                <p className="mt-2 text-[13px] leading-relaxed text-tinta-suave motion-safe:animate-rise-in">
                    Ainda não usa o Moraê?{" "}
                    <a
                        href={whatsappLink(whatsAppNumber, PROSPECT_MESSAGE)}
                        target="_blank"
                        rel="noreferrer"
                        className="font-semibold text-tinta underline decoration-tinta/40 underline-offset-4 transition-colors duration-150 hover:decoration-tinta focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-verde"
                    >
                        Fale com a gente no WhatsApp
                    </a>
                </p>
            )}
        </AuthLayout>
    );
}

// Ready message for whoever opens the WhatsApp from the login without an account.
const PROSPECT_MESSAGE = "Oi! Ainda não uso o Moraê e quero conhecer para o meu condomínio.";

function isValidEmail(value: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
