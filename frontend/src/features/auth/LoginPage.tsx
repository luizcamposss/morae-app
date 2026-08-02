import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { svgIcone } from "@edusites/icons/core";
import { login } from "./authService";
import { saveToken } from "./authStorage";
import { useAuth } from "../../app/providers/useAuth";
import { getDefaultRouteByRoles } from "./authRedirect";
import logoMorae from "../../assets/logo-morae.svg";

type RecoveryMessage = {
    text: string;
    type: "error" | "info";
};

export function LoginPage() {
    const navigate = useNavigate();
    const { refreshUser } = useAuth();
    
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [errorMessage, setErrorMessage] = useState("");
    const [recoveryEmail, setRecoveryEmail] = useState("");
    const [recoveryMessage, setRecoveryMessage] = useState<RecoveryMessage | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);
    const [isRecoveryMode, setIsRecoveryMode] = useState(false);
    const [currentTime, setCurrentTime] = useState(() => getCurrentTime());

    useEffect(() => {
        const intervalId = window.setInterval(() => {
            setCurrentTime(getCurrentTime());
        }, 30_000);

        return () => window.clearInterval(intervalId);
    }, []);

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

    function openRecoveryMode() {
        setErrorMessage("");
        setRecoveryMessage(null);
        setRecoveryEmail(email.trim());
        setIsRecoveryMode(true);
    }

    function closeRecoveryMode() {
        setRecoveryMessage(null);
        setIsRecoveryMode(false);
    }

    function handleRecoverySubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setRecoveryMessage(null);

        const normalizedEmail = recoveryEmail.trim();

        if (!normalizedEmail) {
            setRecoveryMessage({
                text: "Informe o e-mail cadastrado para continuar.",
                type: "error",
            });
            return;
        }

        if (!isValidEmail(normalizedEmail)) {
            setRecoveryMessage({
                text: "Digite um e-mail válido, como nome@condominio.com.br.",
                type: "error",
            });
            return;
        }

        setRecoveryMessage({
            text: "Recuperação ainda não habilitada. Em breve, enviaremos um link seguro para este e-mail.",
            type: "info",
        });
    }

    return (
        <main className="relative flex min-h-[100svh] items-stretch justify-center overflow-hidden bg-[#F3F4F6] text-[#111827] sm:items-center sm:bg-[#DCFCE7] sm:px-6 sm:py-8">
            <div className="absolute left-[-18rem] top-[-20rem] hidden h-[32rem] w-[32rem] rounded-full bg-[#86EFAC]/55 blur-3xl sm:block sm:left-[-16rem] sm:top-[-18rem] sm:h-[34rem] sm:w-[34rem]" />
            <div className="absolute bottom-[-22rem] right-[-18rem] hidden h-[38rem] w-[38rem] rounded-full bg-[#22C55E]/20 blur-3xl sm:block sm:bottom-[-20rem] sm:right-[-16rem] sm:h-[40rem] sm:w-[40rem]" />
            <div className="absolute inset-x-0 bottom-0 hidden h-1/2 bg-gradient-to-t from-white/60 to-transparent sm:block" />

            <section className="relative flex min-h-[100svh] w-full max-w-[430px] flex-col overflow-hidden bg-white shadow-none sm:min-h-0 sm:rounded-[2.35rem] sm:shadow-2xl sm:shadow-[#0B3D2E]/20 sm:ring-1 sm:ring-white/80">
                <div className="relative min-h-[19rem] overflow-hidden bg-[#0B3D2E] px-5 pb-20 pt-5 text-white sm:min-h-64 sm:px-8 sm:pb-16 sm:pt-7">
                    <div className="absolute left-[-42px] top-[-42px] size-28 rounded-full bg-[#86EFAC]/70 sm:size-32" />
                    <div className="absolute left-7 top-12 h-10 w-24 rounded-full bg-[#86EFAC]/55 sm:left-8 sm:top-14 sm:h-12 sm:w-28" />
                    <div className="absolute bottom-0 left-0 h-24 w-full bg-gradient-to-t from-[#052E20]/35 to-transparent" />
                    <LoginPlant />

                    <div className="relative">
                        <div className="mb-10 flex items-center justify-end sm:mb-12">
                            <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-white/85 shadow-sm ring-1 ring-white/10">
                                {currentTime}
                            </span>
                        </div>

                        <h1 className="mt-3 text-[2.7rem] font-black leading-none tracking-tight sm:text-5xl">
                            MORAÊ
                        </h1>
                        <p className="mt-4 max-w-52 text-base font-extrabold leading-7 text-white/88 sm:mt-3 sm:max-w-64 sm:text-sm sm:font-medium sm:text-white/78">
                            Bem-vindo ao seu painel condominial.
                        </p>
                    </div>
                </div>

                <div className="relative -mt-16 flex-1 rounded-t-[2rem] bg-[#F3F4F6] px-5 pb-6 pt-6 sm:-mt-10 sm:flex-none sm:px-8 sm:pb-8 sm:pt-7">
                    {isRecoveryMode ? (
                        <RecoveryForm
                            recoveryEmail={recoveryEmail}
                            recoveryMessage={recoveryMessage}
                            onEmailChange={setRecoveryEmail}
                            onSubmit={handleRecoverySubmit}
                            onBack={closeRecoveryMode}
                        />
                    ) : (
                        <>
                            <div className="mb-7">
                                <h2 className="text-2xl font-black tracking-tight text-[#0B3D2E]">
                                    Entrar
                                </h2>
                                <p className="mt-1 text-sm font-semibold leading-6 text-[#6B7280]">
                                    Use as credenciais cadastradas para acessar sua área.
                                </p>
                            </div>

                            <form className="space-y-4" onSubmit={handleSubmit} noValidate>
                                <label className="block">
                                    <span className="mb-2 block text-xs font-extrabold uppercase tracking-wide text-[#6B7280]">
                                        E-mail
                                    </span>
                                    <input
                                        type="text"
                                        value={email}
                                        onChange={(event) => setEmail(event.target.value)}
                                        placeholder="voce@email.com"
                                        autoComplete="email"
                                        inputMode="email"
                                        className="h-11 w-full rounded-2xl border border-white bg-white px-4 text-sm font-semibold text-[#111827] shadow-sm outline-none transition placeholder:text-[#9CA3AF] hover:border-[#86EFAC] focus:border-[#16A34A] focus:ring-4 focus:ring-[#86EFAC]/30 sm:h-12 sm:px-5"
                                    />
                                </label>

                                <label className="block">
                                    <span className="mb-2 block text-xs font-extrabold uppercase tracking-wide text-[#6B7280]">
                                        Senha
                                    </span>
                                    <div className="flex h-11 items-center rounded-2xl border border-white bg-white shadow-sm transition focus-within:border-[#16A34A] focus-within:ring-4 focus-within:ring-[#86EFAC]/30 sm:h-12">
                                        <input
                                            type={isPasswordVisible ? "text" : "password"}
                                            value={password}
                                            onChange={(event) => setPassword(event.target.value)}
                                            placeholder="Sua senha"
                                            autoComplete="current-password"
                                            className="h-full min-w-0 flex-1 rounded-2xl bg-transparent px-4 text-sm font-semibold text-[#111827] outline-none placeholder:text-[#9CA3AF] sm:px-5"
                                        />
                                        <button
                                            type="button"
                                            aria-label={isPasswordVisible ? "Ocultar senha" : "Mostrar senha"}
                                            onClick={() => setIsPasswordVisible((current) => !current)}
                                            className="mr-2 flex size-9 cursor-pointer items-center justify-center rounded-xl text-[#16A34A] transition hover:bg-[#DCFCE7] hover:text-[#0B3D2E]"
                                        >
                                            {isPasswordVisible ? <EyeOffIcon /> : <EyeIcon />}
                                        </button>
                                    </div>
                                </label>

                                <div className="flex justify-end">
                                    <button
                                        type="button"
                                        onClick={openRecoveryMode}
                                        className="cursor-pointer text-xs font-extrabold text-[#16A34A] transition hover:text-[#0B3D2E]"
                                    >
                                        Esqueceu sua senha?
                                    </button>
                                </div>

                                {errorMessage && (
                                    <div
                                        role="alert"
                                        className="flex items-start gap-3 rounded-2xl border border-[#FECACA] bg-[#FDECEC] px-4 py-3 text-sm font-bold leading-5 text-[#B42318]"
                                    >
                                        <span className="mt-0.5 shrink-0">
                                            <EduIcon nome="atencao" className="text-base" />
                                        </span>
                                        <span>{errorMessage}</span>
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="h-11 w-full cursor-pointer rounded-2xl bg-[#16A34A] text-sm font-black text-white shadow-lg shadow-[#16A34A]/25 transition hover:-translate-y-0.5 hover:bg-[#0B3D2E] focus:outline-none focus:ring-4 focus:ring-[#86EFAC]/40 disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-70 sm:h-12"
                                >
                                    {isSubmitting ? "Entrando..." : "Entrar"}
                                </button>
                            </form>
                        </>
                    )}

                    <div className="mt-5 rounded-2xl border border-[#E5E7EB] bg-white/70 px-4 py-3 sm:mt-6 sm:py-4">
                        <p className="text-center text-xs font-semibold leading-5 text-[#6B7280]">
                            Não tem acesso?{" "}
                            <span className="font-extrabold text-[#16A34A]">
                                Fale com o administrador do condomínio.
                            </span>
                        </p>
                    </div>
                </div>
            </section>
        </main>
    );
}

function LoginPlant() {
    return (
        <div className="absolute right-5 top-20 flex size-24 items-center justify-center rounded-[2rem] bg-white/10 shadow-lg shadow-[#052E20]/20 ring-1 ring-white/10 max-[380px]:right-3 max-[380px]:top-24 max-[380px]:size-20 sm:right-8 sm:top-20 sm:size-28">
            <img
                src={logoMorae}
                alt="Logo MORAÊ"
                className="h-16 w-16 object-contain drop-shadow-sm max-[380px]:h-12 max-[380px]:w-12 sm:h-20 sm:w-20"
            />
        </div>
    );
}

type RecoveryFormProps = {
    recoveryEmail: string;
    recoveryMessage: RecoveryMessage | null;
    onEmailChange: (value: string) => void;
    onSubmit: (event: FormEvent<HTMLFormElement>) => void;
    onBack: () => void;
};

function RecoveryForm({
    recoveryEmail,
    recoveryMessage,
    onEmailChange,
    onSubmit,
    onBack,
}: RecoveryFormProps) {
    return (
        <>
            <div className="mb-6 sm:mb-7">
                <button
                    type="button"
                    onClick={onBack}
                    className="mb-5 inline-flex cursor-pointer items-center gap-2 text-xs font-extrabold text-[#16A34A] transition hover:text-[#0B3D2E]"
                >
                    <EduIcon nome="chevron-esquerda" className="text-sm" />
                    Voltar para login
                </button>

                <h2 className="text-2xl font-black tracking-tight text-[#0B3D2E]">
                    Recuperar senha
                </h2>
                <p className="mt-1 text-sm font-semibold leading-6 text-[#6B7280]">
                    Informe o e-mail cadastrado. Em breve, este fluxo enviará um link seguro para redefinição.
                </p>
            </div>

            <form className="space-y-4" onSubmit={onSubmit} noValidate>
                <label className="block">
                    <span className="mb-2 block text-xs font-extrabold uppercase tracking-wide text-[#6B7280]">
                        E-mail
                    </span>
                    <input
                        type="text"
                        value={recoveryEmail}
                        onChange={(event) => onEmailChange(event.target.value)}
                        placeholder="voce@email.com"
                        autoComplete="email"
                        inputMode="email"
                        className="h-11 w-full rounded-2xl border border-white bg-white px-4 text-sm font-semibold text-[#111827] shadow-sm outline-none transition placeholder:text-[#9CA3AF] hover:border-[#86EFAC] focus:border-[#16A34A] focus:ring-4 focus:ring-[#86EFAC]/30 sm:h-12 sm:px-5"
                    />
                </label>

                {recoveryMessage && (
                    <div
                        role={recoveryMessage.type === "error" ? "alert" : "status"}
                        className={`flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm font-bold leading-5 ${
                            recoveryMessage.type === "error"
                                ? "border-[#FECACA] bg-[#FDECEC] text-[#B42318]"
                                : "border-[#BBF7D0] bg-[#DCFCE7] text-[#0B3D2E]"
                        }`}
                    >
                        <span className="mt-0.5 shrink-0">
                            <EduIcon nome={recoveryMessage.type === "error" ? "atencao" : "escudo-cadeado"} className="text-base" />
                        </span>
                        <span>{recoveryMessage.text}</span>
                    </div>
                )}

                <button
                    type="submit"
                    className="h-11 w-full cursor-pointer rounded-2xl bg-[#16A34A] text-sm font-black text-white shadow-lg shadow-[#16A34A]/25 transition hover:-translate-y-0.5 hover:bg-[#0B3D2E] focus:outline-none focus:ring-4 focus:ring-[#86EFAC]/40 sm:h-12"
                >
                    Preparar recuperação
                </button>
            </form>
        </>
    );
}

function EduIcon({ nome, className = "" }: { nome: string; className?: string }) {
    const svg = svgIcone({
        nome,
        cor: "currentColor",
        tamanho: "1em",
        className,
    });

    if (!svg) {
        return null;
    }

    return (
        <span
            aria-hidden="true"
            className="inline-flex leading-none"
            dangerouslySetInnerHTML={{ __html: svg }}
        />
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

function getCurrentTime() {
    return new Intl.DateTimeFormat("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
    }).format(new Date());
}

function isValidEmail(value: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
