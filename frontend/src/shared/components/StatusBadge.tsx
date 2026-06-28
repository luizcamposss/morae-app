type StatusBadgeVariant = 'success' | 'warning' | 'danger' | 'neutral'

type StatusBadgeProps = {
  label: string
  variant?: StatusBadgeVariant
}

const variantClasses: Record<StatusBadgeVariant, string> = {
  success: 'bg-[#E7F6EF] text-[#178A63]',
  warning: 'bg-[#FFF6DF] text-[#9A6A00]',
  danger: 'bg-[#FDECEC] text-[#B42318]',
  neutral: 'bg-[#F7F6F2] text-[#6E756F]',
}

export function StatusBadge({ label, variant = 'neutral' }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${variantClasses[variant]}`}
    >
      {label}
    </span>
  )
}