import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "./authService";
import { saveToken } from "./authStorage";

export function LoginPage() {
    const navigate = useNavigate();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [errorMessage, setErrorMessage] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setErrorMessage("");
        setIsSubmitting(true);

        try {
            const result = await login({ email, password });

            if (!result.success || !result.token) {
                setErrorMessage(result.message || "Nao foi possivel entrar.");
                return;
            }

            saveToken(result.token);
            navigate("/resident/dashboard");
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
        <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#DCFCE7] px-6 py-10 text-[#111827]">
            <div className="absolute left-[-12%] top-[-18%] h-[520px] w-[520px] rounded-full bg-[#86EFAC]/50 blur-3xl" />
            <div className="absolute bottom-[-22%] right-[-10%] h-[620px] w-[620px] rounded-full bg-[#22C55E]/20 blur-3xl" />
            <div className="absolute bottom-0 left-0 h-1/2 w-full bg-[#86EFAC]/30 [clip-path:polygon(0_55%,100%_0,100%_100%,0_100%)]" />

            <section className="relative w-full max-w-[420px] overflow-hidden rounded-[2rem] bg-white shadow-2xl shadow-[#0B3D2E]/20">
                <div className="relative min-h-52 bg-[#0B3D2E] px-8 pb-14 pt-8 text-white">
                    <div className="absolute left-[-34px] top-[-36px] size-28 rounded-full bg-[#86EFAC]/70" />
                    <div className="absolute left-8 top-16 h-12 w-28 rounded-full bg-[#86EFAC]/60" />
                    <div className="absolute right-7 top-11 h-28 w-8 rotate-12 rounded-full bg-[#86EFAC]" />
                    <div className="absolute right-20 top-20 h-20 w-6 -rotate-12 rounded-full bg-[#22C55E]" />

                    <div className="relative">
                        <div className="mb-10 flex items-center justify-between">
                            <span className="text-sm font-semibold tracking-wide text-white/80">
                                MORAE
                            </span>
                            <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white/80">
                                9:41
                            </span>
                        </div>

                        <h1 className="text-4xl font-extrabold leading-tight">
                            Hello!
                        </h1>
                        <p className="mt-1 text-sm font-medium text-white/80">
                            Bem-vindo ao seu painel condominial
                        </p>
                    </div>
                </div>

                <div className="relative -mt-9 rounded-t-[2rem] bg-[#F3F4F6] px-8 pb-8 pt-7">
                    <div className="absolute right-8 top-[-58px] flex flex-col items-center">
                        <div className="h-16 w-20 rounded-b-full rounded-t-[50%] bg-white shadow-lg shadow-[#111827]/10" />
                        <div className="mt-[-76px] h-24 w-5 rotate-12 rounded-full bg-[#0B3D2E]" />
                        <div className="mt-[-80px] h-20 w-4 -rotate-12 rounded-full bg-[#86EFAC]" />
                    </div>

                    <div className="mb-6">
                        <h2 className="text-2xl font-extrabold text-[#0B3D2E]">
                            Login
                        </h2>
                        <p className="mt-1 text-sm text-[#6B7280]">
                            Acesse com seu e-mail e senha.
                        </p>
                    </div>

                    <form className="space-y-4" onSubmit={handleSubmit}>
                        <label className="block">
                            <span className="mb-1 block text-xs font-semibold text-[#6B7280]">
                                Email
                            </span>
                            <input
                                type="email"
                                value={email}
                                onChange={(event) => setEmail(event.target.value)}
                                placeholder="voce@email.com"
                                className="h-12 w-full rounded-full border border-transparent bg-white px-5 text-sm text-[#111827] outline-none transition placeholder:text-[#9CA3AF] focus:border-[#22C55E] focus:ring-4 focus:ring-[#86EFAC]/30"
                            />
                        </label>

                        <label className="block">
                            <span className="mb-1 block text-xs font-semibold text-[#6B7280]">
                                Senha
                            </span>
                            <input
                                type="password"
                                value={password}
                                onChange={(event) => setPassword(event.target.value)}
                                placeholder="Sua senha"
                                className="h-12 w-full rounded-full border border-transparent bg-white px-5 text-sm text-[#111827] outline-none transition placeholder:text-[#9CA3AF] focus:border-[#22C55E] focus:ring-4 focus:ring-[#86EFAC]/30"
                            />
                        </label>

                        <div className="flex justify-end">
                            <button
                                type="button"
                                className="text-xs font-semibold text-[#16A34A] hover:text-[#0B3D2E]"
                            >
                                Esqueci minha senha
                            </button>
                        </div>
                        {errorMessage && (
                            <p className="text-sm font-semibold text-[#B42318]">
                                {errorMessage}
                            </p>
                        )}
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="h-12 w-full rounded-full bg-[#16A34A] text-sm font-extrabold text-white shadow-lg shadow-[#16A34A]/25 transition hover:bg-[#0B3D2E] focus:outline-none focus:ring-4 focus:ring-[#86EFAC]/40"
                        >
                            {isSubmitting ? "Entrando..." : "Entrar"}
                        </button>
                    </form>

                    <div className="my-6 flex items-center gap-3">
                        <div className="h-px flex-1 bg-[#E5E7EB]" />
                        <span className="text-xs font-semibold text-[#9CA3AF]">
                            ou continue com
                        </span>
                        <div className="h-px flex-1 bg-[#E5E7EB]" />
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                        <button className="h-11 rounded-2xl bg-white text-sm font-extrabold text-[#1877F2] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                            f
                        </button>
                        <button className="h-11 rounded-2xl bg-white text-sm font-extrabold text-[#111827] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                            G
                        </button>
                        <button className="h-11 rounded-2xl bg-white text-sm font-extrabold text-[#111827] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                            A
                        </button>
                    </div>

                    <p className="mt-6 text-center text-xs text-[#6B7280]">
                        Nao tem acesso?{' '}
                        <span className="font-extrabold text-[#16A34A]">
                            fale com seu administrador
                        </span>
                    </p>
                </div>
            </section>
        </main>
    )
}
