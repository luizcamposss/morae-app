const statusTones = {
  success: "bg-verde-suave text-verde-tinta",
  warning: "bg-ambar-suave text-ambar",
  danger: "bg-vermelho-suave text-vermelho",
  neutral: "bg-campo text-tinta-suave",
};

// Small status label (DESIGN.md → Chips), e.g. "Conectado" on a settings row.
export function StatusChip({ tone, children }: { tone: keyof typeof statusTones; children: string }) {
  return <span className={`shrink-0 rounded-chip px-2 py-0.5 text-xs font-semibold ${statusTones[tone]}`}>{children}</span>;
}
