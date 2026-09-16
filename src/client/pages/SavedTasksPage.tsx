import { useState } from "react";
import { api } from "../lib/api";
import { usePolling } from "../lib/usePolling";
import { useToast } from "../components/Toast";
import { PageHero } from "../components/PageHero";
import { navigate } from "../lib/router";
import type { SavedTaskSummary } from "../../shared/rpcTypes";

const SCOPE_LABEL: Record<SavedTaskSummary["scope"], string> = {
  live: "New messages only",
  live_and_backfill: "Existing + new",
  backfill_only: "Existing only (one-time)",
};

function summarize(saved: SavedTaskSummary): string {
  const scope = SCOPE_LABEL[saved.scope];
  if (!saved.backfill_mode) return scope;
  const backfill =
    saved.backfill_mode === "lastN" ? `last ${saved.n ?? "?"} messages` : `ids ${saved.start_id}–${saved.end_id}`;
  return `${scope} · ${backfill}`;
}

export function SavedTasksPage() {
  const { data: saved, loading, refetch } = usePolling(() => api.get<SavedTaskSummary[]>("/api/saved-tasks"), 10000);
  const [confirming, setConfirming] = useState<SavedTaskSummary | null>(null);
  const toast = useToast();

  async function confirmDelete() {
    if (!confirming) return;
    const res = await api.del(`/api/saved-tasks/${confirming.id}`);
    if (res.ok) {
      toast.show("success", "Saved task deleted");
    } else {
      toast.show("error", res.description);
    }
    setConfirming(null);
    refetch();
  }

  return (
    <div className="content-container">
      <PageHero
        title="Saved Task Templates"
        subtitle="Reusable task configurations you can restart with one click"
      />

      <div className="card">
        {loading && <div className="skeleton-row" />}
        {!loading && saved?.length === 0 && (
          <p className="text-muted" style={{ fontSize: 13, textAlign: "center", padding: "24px 0" }}>
            No saved templates yet — use "Save & Start" when creating a task to keep a reusable template here.
          </p>
        )}
        {saved?.map((s) => (
          <div key={s.id} className="task-item" style={{ cursor: "default" }}>
            <div className="task-name">
              <span>
                {s.bot_label} <span className="text-muted">@{s.bot_username}</span>
              </span>
              <div className="row" style={{ gap: 6 }}>
                <button className="btn btn-primary btn-sm" onClick={() => navigate(`wizard/from/${s.id}`)}>
                  Restart Task
                </button>
                <button className="btn btn-danger btn-sm" onClick={() => setConfirming(s)}>
                  Delete
                </button>
              </div>
            </div>
            <div className="task-detail">
              <span>{s.source_chat_title ?? s.source_chat_id} → {s.dest_chat_title ?? s.dest_chat_id}</span>
            </div>
            <div className="task-detail">
              <span>{s.token_preview}</span>
              <span>·</span>
              <span>{summarize(s)}</span>
              <span>·</span>
              <span>Saved {new Date(s.created_at * 1000).toLocaleDateString()}</span>
              {s.task_id && <span> · linked to active task</span>}
            </div>
          </div>
        ))}
      </div>

      {confirming && (
        <div className="card" style={{ borderColor: "var(--danger)" }}>
          <div className="card-header">
            <div className="card-title" style={{ color: "var(--danger)" }}>Confirm Delete</div>
          </div>
          <p style={{ marginBottom: 16 }}>
            Delete the saved template <strong>{confirming.bot_label}</strong>? This only removes the template — it will
            not affect any running bot or live task.
          </p>
          <div className="row">
            <button className="btn btn-danger" onClick={confirmDelete}>
              Delete template
            </button>
            <button className="btn btn-secondary" onClick={() => setConfirming(null)}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
