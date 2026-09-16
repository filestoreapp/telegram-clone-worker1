export function ProgressBar({
  processed,
  total,
  failed = 0,
}: {
  processed?: number | null;
  total?: number | null;
  failed?: number | null;
}) {
  const p = processed ?? 0;
  const f = failed ?? 0;
  const t = total ?? 0;
  const scanned = p + f;
  const pct = t > 0 ? Math.min(100, Math.round((scanned / t) * 100)) : 0;
  return (
    <div>
      <div className="progress-bar">
        <div className="fill" style={{ width: `${pct}%` }} />
      </div>
      <div
        className="text-muted"
        style={{
          fontSize: 12,
          marginTop: 6,
          display: "flex",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 4,
        }}
      >
        <span>
          {scanned.toLocaleString()} / {t.toLocaleString()} IDs scanned · {pct}%
        </span>
        {f > 0 && (
          <span>
            ({p.toLocaleString()} copied, {f.toLocaleString()} skipped)
          </span>
        )}
      </div>
    </div>
  );
}
