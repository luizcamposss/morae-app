export function Topbar() {
    return (
        <div className="flex h-full items-center justify-between rounded-3xl border border-[#E5E5EA] bg-white px-5 shadow-sm">
            <span className="text-lg font-semibold tracking-wide text-[#1F2421]">
                morae - logo
            </span>

            <div className="flex items-center gap-3">
                <button className="flex size-9 items-center justify-center rounded-full bg-[#F7F6F2] text-sm font-semibold text-[#6E756F] transition hover:bg-[#E7F6EF] hover:text-[#178A63]">
                    N
                </button>

                <div className="flex size-10 items-center justify-center rounded-full bg-[#178A63] text-sm font-semibold text-white">
                    L
                </div>
            </div>
        </div>
    )
}
