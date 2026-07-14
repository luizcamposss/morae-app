type PageLoaderProps = {
  message?: string;
};

export function PageLoader({
  message = "Carregando sua sessao...",
}: PageLoaderProps) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F7F6F2] px-6">
      <div className="flex w-full max-w-sm flex-col items-center rounded-[2rem] border border-[#E5E7EB] bg-white px-8 py-10 text-center shadow-sm">
        <div className="mb-4 size-12 animate-spin rounded-full border-4 border-[#DCFCE7] border-t-[#16A34A]" />
        <p className="text-base font-extrabold text-[#0B3D2E]">morae</p>
        <p className="mt-2 text-sm font-semibold text-[#6B7280]">
          {message}
        </p>
      </div>
    </main>
  );
}