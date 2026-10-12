import { Area, AreaChart, Bar, BarChart, CartesianGrid, Rectangle, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatCompactCurrency, formatCurrency } from "../../shared/lib/currency";

// Status colors (DESIGN.md). Validated with the dataviz script: green and amber sit in the
// CVD 6–8 floor band, so stacks keep a fixed order, 2px surface gaps, legend and tooltip text.
const COLORS = { paid: "#00ae54", open: "#c98a12", overdue: "#b8432a", ink: "#4a6563", grid: "#dce2da" };

export type RevenueMonth = { month: string; label: string; paid: number; open: number; overdue: number };
export type GrowthMonth = { month: string; label: string; total: number };

const revenueSeries = [
  { key: "paid", label: "Pago", color: COLORS.paid },
  { key: "open", label: "Em aberto", color: COLORS.open },
  { key: "overdue", label: "Atrasado", color: COLORS.overdue },
] as const;

const axisProps = {
  axisLine: false,
  tickLine: false,
  tick: { fill: COLORS.ink, fontSize: 12 },
} as const;

type TooltipEntry = { name?: string | number; value?: number | string; color?: string };

function ChartTooltip({
  active,
  label,
  payload,
  format,
}: {
  active?: boolean;
  label?: string;
  payload?: TooltipEntry[];
  format: (value: number) => string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-block bg-superficie px-4 py-3 text-sm shadow-float">
      <p className="font-semibold text-tinta first-letter:uppercase">{label}</p>
      <ul className="mt-1.5 space-y-1">
        {payload.map((entry) => (
          <li key={String(entry.name)} className="flex items-center gap-2 text-tinta-suave">
            <span className="size-2 rounded-full" style={{ background: entry.color }} aria-hidden />
            {entry.name}
            <span className="ml-auto pl-4 font-semibold tabular-nums text-tinta">{format(Number(entry.value))}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Only the highest non-empty segment of each month gets the rounded data-end.
function isTopSegment(month: RevenueMonth, seriesIndex: number) {
  return revenueSeries.slice(seriesIndex + 1).every((series) => month[series.key] === 0);
}

export function RevenueChart({ data }: { data: RevenueMonth[] }) {
  return (
    <figure className="[&_*:focus]:outline-none">
      <ul className="mb-4 flex flex-wrap gap-4 text-[13px] text-tinta-suave">
        {revenueSeries.map((series) => (
          <li key={series.key} className="flex items-center gap-2">
            <span className="size-2.5 rounded-[3px]" style={{ background: series.color }} aria-hidden />
            {series.label}
          </li>
        ))}
      </ul>

      <div className="h-56" aria-hidden>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart accessibilityLayer={false} data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }} barCategoryGap="28%">
            <CartesianGrid vertical={false} stroke={COLORS.grid} />
            <XAxis dataKey="label" {...axisProps} />
            <YAxis {...axisProps} width={64} tickFormatter={formatCompactCurrency} />
            <Tooltip cursor={{ fill: "#f2f4f0" }} content={<ChartTooltip format={formatCurrency} />} />
            {revenueSeries.map((series, index) => (
              <Bar
                key={series.key}
                dataKey={series.key}
                name={series.label}
                stackId="revenue"
                fill={series.color}
                stroke="#ffffff"
                strokeWidth={2}
                shape={(props) => (
                  <Rectangle {...props} radius={isTopSegment(props.payload as RevenueMonth, index) ? [4, 4, 0, 0] : 0} />
                )}
                isAnimationActive={false}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>

      <table className="sr-only">
        <caption>Mensalidades por mês de vencimento</caption>
        <thead>
          <tr>
            <th>Mês</th>
            {revenueSeries.map((series) => (
              <th key={series.key}>{series.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={row.month}>
              <td>{row.label}</td>
              {revenueSeries.map((series) => (
                <td key={series.key}>{formatCurrency(row[series.key])}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

export function GrowthChart({ data }: { data: GrowthMonth[] }) {
  return (
    <figure className="[&_*:focus]:outline-none">
      <div className="h-56" aria-hidden>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart accessibilityLayer={false} data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="growthFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={COLORS.paid} stopOpacity={0.18} />
                <stop offset="100%" stopColor={COLORS.paid} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke={COLORS.grid} />
            <XAxis dataKey="label" {...axisProps} />
            <YAxis {...axisProps} width={32} allowDecimals={false} />
            <Tooltip
              cursor={{ stroke: COLORS.grid, strokeWidth: 1 }}
              content={<ChartTooltip format={(value) => `${value} condomínio${value === 1 ? "" : "s"}`} />}
            />
            <Area
              type="monotone"
              dataKey="total"
              name="Condomínios"
              stroke={COLORS.paid}
              strokeWidth={2}
              fill="url(#growthFill)"
              dot={false}
              activeDot={{ r: 5, stroke: "#ffffff", strokeWidth: 2 }}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <table className="sr-only">
        <caption>Condomínios na plataforma por mês</caption>
        <tbody>
          {data.map((row) => (
            <tr key={row.month}>
              <td>{row.label}</td>
              <td>{row.total}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
