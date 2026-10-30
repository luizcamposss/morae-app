export type SummaryItem = {
  label: string;
  value: string;
  detail?: string;
  tone?: "neutral" | "good" | "danger";
};

const valueTones = { neutral: "text-tinta", good: "text-verde", danger: "text-vermelho" };

// The month's numbers grouped in one card, split by thin lines (DESIGN.md → Summary Card).
export function SummaryCard({ items, label = "Resumo" }: { items: SummaryItem[]; label?: string }) {
  return (
    <section
      aria-label={label}
      className="grid rounded-card bg-superficie shadow-whisper sm:grid-cols-2 lg:grid-cols-[repeat(var(--cols),minmax(0,1fr))]"
      style={{ ["--cols" as string]: items.length }}
    >
      {items.map((item) => (
        <div
          key={item.label}
          className="border-linha px-7 py-6 max-sm:[&+&]:border-t sm:max-lg:[&:nth-child(n+3)]:border-t sm:max-lg:[&:nth-child(even)]:border-l lg:[&+&]:border-l"
        >
          <p className="text-sm text-tinta-suave">{item.label}</p>
          <p className={`mt-2 font-display text-[30px] font-bold leading-none tracking-[-0.015em] tabular-nums ${valueTones[item.tone ?? "neutral"]}`}>
            {item.value}
          </p>
          {item.detail && <p className="mt-2 text-[13px] text-tinta-suave">{item.detail}</p>}
        </div>
      ))}
    </section>
  );
}
