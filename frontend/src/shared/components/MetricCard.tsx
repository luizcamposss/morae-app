type MetricCardProps = {
    label: string
    value: string
    helper: string
}

export function MetricCard({ label, value, helper }: MetricCardProps) {
    return (
        <div className="rounded-[1.5rem] border border-[#E5E7EB] bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
            <p className="text-sm font-bold text-[#6B7280]">
                {label}
            </p>

            <strong className="mt-3 block text-3xl font-extrabold text-[#111827]">
                {value}
            </strong>

            <p className="mt-2 text-sm font-semibold text-[#16A34A]">
                {helper}
            </p>
        </div>
    )
}
