// Small star-rating display, shared by the dashboard and public profile.
// Rounds to the nearest whole star; filled stars in the warm accent, the rest
// in the muted border tone.
export function Stars({
  rating,
  className = "text-base",
}: {
  rating: number;
  className?: string;
}) {
  const full = Math.max(0, Math.min(5, Math.round(rating)));
  return (
    <span
      className={`${className} leading-none tracking-tight`}
      role="img"
      aria-label={`${rating.toFixed(1)} out of 5 stars`}
    >
      <span className="text-accent">{"★".repeat(full)}</span>
      <span className="text-border">{"★".repeat(5 - full)}</span>
    </span>
  );
}
