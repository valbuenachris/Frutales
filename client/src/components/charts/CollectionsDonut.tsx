interface CollectionsDonutProps {
  /** COP received (abonos + assumed cash). */
  paid: number;
  /** COP still pending. */
  outstanding: number;
}

/**
 * Hand-rolled SVG ring: collected vs outstanding money.
 * No chart library needed; scales with the parent via viewBox.
 */
export function CollectionsDonut({ paid, outstanding }: CollectionsDonutProps) {
  const total = paid + outstanding;
  const ratio = total > 0 ? paid / total : 0;
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const paidLength = circumference * ratio;
  const percent = Math.round(ratio * 100);

  return (
    <svg
      viewBox="0 0 120 120"
      className="h-32 w-32 shrink-0"
      role="img"
      aria-label={`Cobrado ${percent}% del total de ventas`}
    >
      <circle cx="60" cy="60" r={radius} fill="none" strokeWidth="14" className="stroke-amber-200" />
      <circle
        cx="60"
        cy="60"
        r={radius}
        fill="none"
        strokeWidth="14"
        strokeLinecap="round"
        className="stroke-emerald-500"
        strokeDasharray={`${paidLength} ${circumference - paidLength}`}
        transform="rotate(-90 60 60)"
      />
      <text
        x="60"
        y="57"
        textAnchor="middle"
        fontSize="20"
        fontWeight="700"
        className="fill-slate-800"
      >
        {percent}%
      </text>
      <text x="60" y="72" textAnchor="middle" fontSize="9" className="fill-slate-400">
        cobrado
      </text>
    </svg>
  );
}
