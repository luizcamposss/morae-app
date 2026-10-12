import { MoraeMark } from "./MoraeMark";

type PageLoaderProps = {
  message?: string;
};

// Full-screen loading state (opening the app, validating access): the "Chegada" logo, then it keeps breathing.
export function PageLoader({ message = "Carregando sua sessão…" }: PageLoaderProps) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-fundo px-6">
      <div role="status" aria-live="polite" className="flex flex-col items-center text-center">
        <MoraeMark size={72} motion="chegada" />
        <p className="mt-5 animate-rise-in [animation-delay:700ms] motion-reduce:animate-none font-display text-[28px] font-bold leading-none tracking-[-0.015em] text-tinta">
          Moraê
        </p>
        <p className="mt-3 animate-rise-in [animation-delay:900ms] motion-reduce:animate-none text-[15px] text-tinta-suave">{message}</p>
      </div>
    </main>
  );
}
