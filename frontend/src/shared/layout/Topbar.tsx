export function Topbar() {
    return (
        <div className="flex h-full items-center justify-between rounded-[1.75rem] border border-[#E5E7EB] bg-white/95 px-5 shadow-sm">
            <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-xl bg-[#0B3D2E] text-sm font-black text-white">
                    M
                </div>
                <span className="text-lg font-extrabold tracking-wide text-[#0B3D2E]">
                    morae
                </span>
            </div>

            <div className="flex items-center gap-3">
                <button className="flex size-9 items-center justify-center rounded-full bg-[#F3F4F6] text-sm font-bold text-[#6B7280] transition hover:bg-[#DCFCE7] hover:text-[#16A34A]">
                    N
                </button>

                <div className="flex size-10 items-center justify-center rounded-full bg-[#16A34A] text-sm font-extrabold text-white shadow-sm shadow-[#16A34A]/30">
                    L
                </div>
            </div>
        </div>
    )
}
