import "./HouseLights.css";

// Window centers (3 on top, 2 beside the door); `order` sets when each one lights up.
const windows = [
  { x: 45, y: 74, order: 0 },
  { x: 70, y: 74, order: 2 },
  { x: 95, y: 74, order: 4 },
  { x: 45, y: 102, order: 1 },
  { x: 95, y: 102, order: 3 },
];

// While processing the windows light up in sequence; `lit` keeps them all on (import finished).
export function HouseLights({ size = 96, lit = false }: { size?: number; lit?: boolean }) {
  return (
    <svg
      viewBox="0 0 140 130"
      width={size}
      height={(size * 130) / 140}
      aria-hidden
      className={`house-lights ${lit ? "house-lights--lit" : ""}`}
    >
      <path d="M14 58 L70 14 L126 58" fill="none" stroke="var(--color-tinta)" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="24" y="52" width="92" height="70" rx="6" fill="var(--color-superficie)" stroke="var(--color-tinta)" strokeWidth="5" />
      {windows.map((item) => (
        <rect
          key={`${item.x}-${item.y}`}
          className="house-lights__window"
          style={{ ["--order" as string]: item.order }}
          x={item.x - 8}
          y={item.y - 8}
          width="16"
          height="14"
          rx="2.5"
        />
      ))}
      <rect x="61" y="96" width="18" height="26" rx="3" fill="var(--color-verde)" />
      <line x1="10" y1="122" x2="130" y2="122" stroke="var(--color-tinta)" strokeWidth="5" strokeLinecap="round" />
    </svg>
  );
}
