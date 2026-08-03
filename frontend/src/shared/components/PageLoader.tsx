import loadMoraeVideo from "../../assets/load-morae.mp4";

type PageLoaderProps = {
  message?: string;
};

export function PageLoader({
  message = "Carregando sua sessão...",
}: PageLoaderProps) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F7F6F2] px-6">
      <div className="flex w-full max-w-sm flex-col items-center rounded-[2rem] border border-[#E5E7EB] bg-white px-8 py-10 text-center shadow-sm">
        <video
          className="mb-4 h-24 w-24 object-contain"
          src={loadMoraeVideo}
          autoPlay
          loop
          muted
          playsInline
          aria-label="Carregando MORAÊ"
        />
        <p className="text-base font-extrabold text-[#0B3D2E]">MORAÊ</p>
        <p className="mt-2 text-sm font-semibold text-[#6B7280]">
          {message}
        </p>
      </div>
    </main>
  );
}
