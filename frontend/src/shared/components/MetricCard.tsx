type MetricCardProps = {
    label: string
    value: string
    helper: string
}

export function MetricCard({ label, value, helper }: MetricCardProps) {
    return (
        <div className="rounded-3xl border border-[#E5E5EA] bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-[#6E756F]">
                {label}
            </p>

            <strong className="mt-3 block text-3xl font-semibold text-[#1F2421]">
                {value}
            </strong>

            <p className="mt-2 text-sm text-[#6E756F]">
                {helper}
            </p>
        </div>
    )
}
