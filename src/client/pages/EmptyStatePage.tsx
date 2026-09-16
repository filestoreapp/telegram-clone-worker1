import { useState } from "react";
import { navigate } from "../lib/router";
import { useTasks, getTaskDisplayInfo } from "../lib/useTasksContext";
import { usePolling } from "../lib/usePolling";
import { api } from "../lib/api";
import { useToast } from "../components/Toast";
import { PageHero } from "../components/PageHero";
import { Badge } from "../components/Badge";
import { ProgressBar } from "../components/ProgressBar";
import type { BotSummary, TaskScope, TaskSummary } from "../../shared/rpcTypes";

type TaskCategory = "all" | TaskScope;

const CATEGORY_LABELS: Record<TaskCategory, string> = {
  all: "All",
  backfill_only: "Backfill only",
  live: "Live only",
  live_and_backfill: "Backfill + Live",
};

export function EmptyStatePage() {
  const { tasks, activeTasks, pausedTasks, loading: tasksLoading, refetch } = useTasks();
  const toast = useToast();
  const { data: bots } = usePolling(() => api.get<BotSummary[]>("/api/bots"), 15000, []);
  const [selectedCategory, setSelectedCategory] = useState<TaskCategory>("all");
  const [pausingId, setPausingId] = useState<string | null>(null);

  const totalCopied = tasks.reduce((sum, t) => sum + (t.processed ?? 0), 0);

  async function handlePause(e: React.MouseEvent, task: TaskSummary) {
    e.stopPropagation();
    setPausingId(task.id);
    try {
      const patchBody: { liveEnabled?: boolean; backfillStatus?: "paused" } = {};
      if (task.backfill_status === "running") {
        patchBody.backfillStatus = "paused";
      }
      if (task.live_enabled) {
        patchBody.liveEnabled = false;
      }
      const res = await api.patch<TaskSummary>(`/api/tasks/${task.id}`, patchBody);
      if (res.ok) {
        toast.show("success", `Paused "${getTaskDisplayInfo(task).title}". Moved to Paused Tasks.`);
        await refetch();
      } else {
        toast.show("error", res.description ?? "Failed to pause task");
      }
    } catch {
      toast.show("error", "Network error while pausing task");
    } finally {
      setPausingId(null);
    }
  }

  const countAll = activeTasks.length;
  const countBackfill = activeTasks.filter((t) => t.scope === "backfill_only").length;
  const countLive = activeTasks.filter((t) => t.scope === "live").length;
  const countCombined = activeTasks.filter((t) => t.scope === "live_and_backfill").length;

  const displayedTasks =
    selectedCategory === "all" ? activeTasks : activeTasks.filter((t) => t.scope === selectedCategory);

  return (
    <div className="content-container">
      <PageHero
        title="Active Tasks"
        subtitle="Real-time forwarding & catch-up backfills"
      >
        <button className="btn btn-primary" onClick={() => navigate("wizard")}>
          + New Task
        </button>
      </PageHero>

      {/* Metrics Row */}
      <div className="metric-grid">
        <div className="metric-card">
          <div className="metric-title">Active Tasks</div>
          <div className="metric-val">{activeTasks.length}</div>
        </div>
        <div className="metric-card">
          <div className="metric-title">Messages Copied</div>
          <div className="metric-val">{totalCopied.toLocaleString()}</div>
        </div>
        <div className="metric-card">
          <div className="metric-title">Connected Bots</div>
          <div className="metric-val">{bots?.length ?? 0}</div>
        </div>
      </div>

      {/* Running Tasks */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h2 style={{ fontSize: 13, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Running Pipelines
          </h2>
          <span style={{ fontSize: 11, color: "var(--text-dim)" }}>Auto-refreshing</span>
        </div>

        {/* Category Filter Buttons */}
        <div className="filter-pill-group" style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
          <button
            className={`btn-filter-pill${selectedCategory === "all" ? " is-active" : ""}`}
            onClick={() => setSelectedCategory("all")}
          >
            All <span className="pill-count">{countAll}</span>
          </button>
          <button
            className={`btn-filter-pill${selectedCategory === "backfill_only" ? " is-active" : ""}`}
            onClick={() => setSelectedCategory("backfill_only")}
          >
            Backfill only <span className="pill-count">{countBackfill}</span>
          </button>
          <button
            className={`btn-filter-pill${selectedCategory === "live" ? " is-active" : ""}`}
            onClick={() => setSelectedCategory("live")}
          >
            Live only <span className="pill-count">{countLive}</span>
          </button>
          <button
            className={`btn-filter-pill${selectedCategory === "live_and_backfill" ? " is-active" : ""}`}
            onClick={() => setSelectedCategory("live_and_backfill")}
          >
            Backfill + Live <span className="pill-count">{countCombined}</span>
          </button>
        </div>

        {tasksLoading && activeTasks.length === 0 && <div className="skeleton-row" />}

        {!tasksLoading && activeTasks.length === 0 && (
          <div className="card" style={{ textAlign: "center", padding: "40px 20px" }}>
            <h3 style={{ fontSize: 16, marginBottom: 8 }}>No active tasks running</h3>
            <p className="text-muted" style={{ marginBottom: 20, maxWidth: 420, margin: "0 auto 20px" }}>
              All running and live-forwarding tasks appear here in real time.
            </p>
            {pausedTasks.length > 0 && (
              <div
                style={{
                  background: "color-mix(in oklab, var(--warning) 12%, var(--surface))",
                  border: "1px solid color-mix(in oklab, var(--warning) 30%, transparent)",
                  borderRadius: "var(--radius)",
                  padding: "12px 16px",
                  margin: "0 auto 20px",
                  maxWidth: 440,
                  fontSize: 13,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                }}
              >
                <span>
                  You have <strong>{pausedTasks.length} paused task{pausedTasks.length > 1 ? "s" : ""}</strong> on hold.
                </span>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => navigate("paused")}
                >
                  View Paused Tasks →
                </button>
              </div>
            )}
            <button className="btn btn-primary" onClick={() => navigate("wizard")}>
              + Create New Task
            </button>
          </div>
        )}

        {!tasksLoading && activeTasks.length > 0 && displayedTasks.length === 0 && (
          <div className="card" style={{ textAlign: "center", padding: "30px 20px" }}>
            <p className="text-muted" style={{ marginBottom: 12 }}>
              No active tasks found in the <strong>{CATEGORY_LABELS[selectedCategory]}</strong> category.
            </p>
            <button className="btn btn-secondary btn-sm" onClick={() => setSelectedCategory("all")}>
              Show All ({countAll})
            </button>
          </div>
        )}

        {displayedTasks.map((t) => {
          const isBackfilling = t.backfill_status === "running";
          const percent =
            t.total && t.total > 0
              ? Math.min(100, Math.round((((t.processed ?? 0) + (t.failed ?? 0)) / t.total) * 100))
              : 0;

          const { title, routeText, isCustomLabel } = getTaskDisplayInfo(t);

          return (
            <div key={t.id} className="task-item" onClick={() => navigate(`task/${t.id}`)}>
              <div className="task-name">
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span>{title}</span>
                  {isBackfilling ? (
                    <Badge variant="running" label={`Backfilling ${percent}%`} />
                  ) : t.live_enabled ? (
                    <Badge variant="live" label="Live" />
                  ) : (
                    <Badge variant="idle" label="Active" />
                  )}
                  {t.backfill_status === "paused" && (
                    <Badge variant="paused" label="Backfill Paused" />
                  )}
                </div>

                <button
                  className="btn btn-secondary btn-sm"
                  style={{ padding: "4px 12px", fontSize: 12 }}
                  disabled={pausingId === t.id}
                  onClick={(e) => handlePause(e, t)}
                  title="Pause task"
                >
                  {pausingId === t.id ? "Pausing…" : "⏸ Pause"}
                </button>
              </div>
              <div className="task-detail" style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                {isCustomLabel && (
                  <>
                    <span>{routeText}</span>
                    <span>·</span>
                  </>
                )}
                {t.scope !== "live" && (
                  <span className="pill-stat" style={{ color: "var(--success)" }}>
                    📦 {(t.processed ?? 0).toLocaleString()} copied
                  </span>
                )}
                {t.scope !== "backfill_only" && (
                  <span className="pill-stat" style={{ color: "var(--info)" }}>
                    ⚡ {(t.live_processed ?? 0).toLocaleString()} live
                  </span>
                )}
                <span>·</span>
                <span>{new Date(t.created_at * 1000).toLocaleDateString()}</span>
              </div>
              {isBackfilling && (
                <div style={{ marginTop: 8 }}>
                  <ProgressBar processed={t.processed ?? 0} failed={t.failed ?? 0} total={t.total ?? 0} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
