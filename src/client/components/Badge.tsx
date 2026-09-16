export type BadgeVariant = "live" | "running" | "paused" | "complete" | "error" | "failed" | "idle";

const LABEL: Record<BadgeVariant, string> = {
  live: "Live",
  running: "Running",
  paused: "Paused",
  complete: "Complete",
  error: "Error",
  failed: "Failed",
  idle: "Idle",
};

export function Badge({ variant, label }: { variant: BadgeVariant; label?: string }) {
  return (
    <span className={`badge badge-${variant}`}>
      <span className="badge-dot" />
      {label ?? LABEL[variant]}
    </span>
  );
}
