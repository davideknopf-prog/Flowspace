import type { WeeklyEarnings } from "@/lib/repo";

// Server-rendered mini bar chart for the earnings hero: one series (net $ per
// week), so no legend — the surrounding card names it. Bars are the brand
// hue; every label/value wears text tokens. Native <title> tooltips carry the
// exact values; only the best week gets a direct label.

const W = 560;
const H = 132;
const PAD_TOP = 24; // room for the direct label above the tallest bar
const PAD_BOTTOM = 18; // week labels
const PAD_X = 2;

function weekLabel(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC", // buckets are UTC Mondays; keep labels on the same clock
  }).format(new Date(iso));
}

function dollars(cents: number): string {
  return `$${Math.round(cents / 100).toLocaleString("en-US")}`;
}

// A bar with a 4px rounded data-end and a square baseline.
function barPath(x: number, top: number, width: number, bottom: number): string {
  const r = Math.min(4, (bottom - top) / 2, width / 2);
  return [
    `M ${x} ${bottom}`,
    `L ${x} ${top + r}`,
    `Q ${x} ${top} ${x + r} ${top}`,
    `L ${x + width - r} ${top}`,
    `Q ${x + width} ${top} ${x + width} ${top + r}`,
    `L ${x + width} ${bottom}`,
    "Z",
  ].join(" ");
}

export function WeeklyEarningsChart({ series }: { series: WeeklyEarnings[] }) {
  const max = Math.max(...series.map((s) => s.netCents), 1);
  const bestIndex = series.reduce(
    (best, s, i) => (s.netCents > series[best].netCents ? i : best),
    0,
  );
  const plotH = H - PAD_TOP - PAD_BOTTOM;
  const baseline = PAD_TOP + plotH;
  const band = (W - PAD_X * 2) / series.length;
  const barW = Math.min(24, band * 0.55);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full"
      role="img"
      aria-label={`Net earnings per week for the last ${series.length} weeks`}
    >
      {/* hairline baseline */}
      <line
        x1={PAD_X}
        y1={baseline}
        x2={W - PAD_X}
        y2={baseline}
        stroke="var(--border)"
        strokeWidth="1"
      />
      {series.map((s, i) => {
        const cx = PAD_X + band * i + band / 2;
        const x = cx - barW / 2;
        // Any positive week gets at least a 3px bar so a small week never
        // renders shorter (or thinner) than the 2px zero-week stub below it.
        const h = s.netCents > 0 ? Math.max(3, (s.netCents / max) * plotH) : 0;
        const top = baseline - h;
        return (
          <g key={s.weekStartISO}>
            <title>{`Week of ${weekLabel(s.weekStartISO)} · ${dollars(s.netCents)}`}</title>
            {s.netCents > 0 ? (
              <path d={barPath(x, top, barW, baseline)} fill="var(--brand)" />
            ) : (
              // zero week: a 2px stub so the week reads present-but-quiet
              <rect
                x={x}
                y={baseline - 2}
                width={barW}
                height={2}
                fill="var(--border)"
              />
            )}
            {i === bestIndex && s.netCents > 0 && (
              <text
                x={cx}
                y={top - 7}
                textAnchor="middle"
                fontSize="11"
                fontWeight="600"
                fill="var(--foreground)"
              >
                {dollars(s.netCents)}
              </text>
            )}
            <text
              x={cx}
              y={H - 4}
              textAnchor="middle"
              fontSize="10"
              fill="var(--muted)"
            >
              {weekLabel(s.weekStartISO)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
