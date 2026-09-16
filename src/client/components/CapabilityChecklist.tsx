import type { CapabilityEntry } from "../../shared/rpcTypes";

export function CapabilityChecklist({ capabilities }: { capabilities: CapabilityEntry[] }) {
  return (
    <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 8 }}>
      {capabilities.map((c) => (
        <li key={c.key} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 13 }}>
          <span style={{ color: c.available ? "var(--success)" : "var(--muted)" }}>{c.available ? "✓" : "✗"}</span>
          <span>
            <span style={{ color: c.available ? "var(--ink)" : "var(--muted)" }}>{c.label}</span>
            {!c.available && c.reason && (
              <span className="text-muted" style={{ display: "block", fontSize: 12 }}>
                {c.reason}
              </span>
            )}
          </span>
        </li>
      ))}
    </ul>
  );
}
