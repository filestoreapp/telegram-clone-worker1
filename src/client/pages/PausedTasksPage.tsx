import React, { useState } from "react";
import { navigate } from "../lib/router";
import { useTasks, getTaskDisplayInfo } from "../lib/useTasksContext";
import { api } from "../lib/api";
import { useToast } from "../components/Toast";
import { PageHero } from "../components/PageHero";
import { Badge } from "../components/Badge";
import { ProgressBar } from "../components/ProgressBar";
import type { TaskScope, TaskSummary } from "../../shared/rpcTypes";

type TaskCategory = "all" | TaskScope;

const CATEGORY_LABELS: Record<TaskCategory, string> = {
  all: "All",
  backfill_only: "Backfill only",
  live: "Live only",
  live_and_backfill: "Backfill + Live",
};

export function PausedTasksPage() {
  const { pausedTasks, loading, refetch } = useTasks();
  const toast = useToast();
  const [selectedCategory, setSelectedCategory] = useState<TaskCategory>("all");
  const [resumingId, setResumingId] = useState<string | null>(null);

  const totalCopied = pausedTasks.reduce((sum, t) => sum + (t.processed ?? 0), 0);
  const totalRemaining = pausedTasks.reduce((sum, t) => {
    const scanned = (t.processed ?? 0) + (t.failed ?? 0);
    if (t.total && t.total > scanned) {
      return sum + (t.total - scanned);
    }
    return sum;
  }, 0);

  const countAll = pausedTasks.length;
  const countBackfill = pausedTasks.filter((t) => t.scope === "backfill_only").length;
  const countLive = pausedTasks.filter((t) => t.scope === "live").length;
  const countCombined = pausedTasks.filter((t) => t.scope === "live_and_backfill").length;

  const displayedTasks =
    selectedCategory === "all"
      ? pausedTasks
      : pausedTasks.filter((t) => t.scope === selectedCategory);

  async function handleResume(e: React.MouseEvent, task: TaskSummary) {
    e.stopPropagation();
    setResumingId(task.id);

    const patchBody: { liveEnabled?: boolean; backfillStatus?: "running" } = {};

    if (task.backfill_status === "paused") {
      patchBody.backfillStatus = "running";
    }
    if (task.scope !== "backfill_only" && !task.live_enabled) {
      patchBody.liveEnabled = true;
    }
    if (task.scope === "backfill_only" && task.backfill_status !== "running") {
      patchBody.backfillStatus = "running";
    }

    try {
      const res = await api.patch<TaskSummary>(`/api/tasks/${task.id}`, patchBody);
      if (res.ok) {
        toast.show("success", `Resumed "${getTaskDisplayInfo(task).title}"`);
        await refetch();
      } else {
        toast.show("error", res.description ?? "Failed to resume task");
      }
    } catch {
      toast.show("error", "Network error while resuming task");
    } finally {
      setResumingId(null);
    }
  }

  return (
    <div className="content-container">
      <PageHero
        title="Paused Tasks"
        subtitle="Tasks on hold — resume backfill or live forwarding anytime"
      >
        <button className="btn btn-primary" onClick={() => navigate("wizard")}>
          + New Task
        </button>
      </PageHero>

      {/* Metrics Row */}
      <div className="metric-grid">
        <div className="metric-card">
          <div className="metric-title">Paused Tasks</div>
          <div className="metric-val">{pausedTasks.length}</div>
        </div>
        <div className="metric-card">
          <div className="metric-title">Messages Copied</div>
          <div className="metric-val">{totalCopied.toLocaleString()}</div>
        </div>
        <div className="metric-card">
          <div className="metric-title">Pending Messages</div>
          <div className="metric-val">
            {totalRemaining > 0 ? totalRemaining.toLocaleString() : "—"}
          </div>
        </div>
      </div>

      {/* Task List */}
      <div style={{ marginBottom: 24 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 12,
          }}
        >
          <h2
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: "var(--muted)",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            Tasks On Hold
          </h2>
          <span style={{ fontSize: 11, color: "var(--text-dim)" }}>
            Click resume to put back into active queue
          </span>
        </div>

        {/* Category Filter Buttons */}
        <div className="filter-pill-group">
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

        {loading && pausedTasks.length === 0 && <div className="skeleton-row" />}

        {!loading && pausedTasks.length === 0 && (
          <div className="card" style={{ textAlign: "center", padding: "40px 20px" }}>
            <h3 style={{ fontSize: 16, marginBottom: 8 }}>No paused tasks right now</h3>
            <p
              className="text-muted"
              style={{ marginBottom: 20, maxWidth: 440, margin: "0 auto 20px" }}
            >
              When you pause an active sync or disable live forwarding, the task will appear here
              with its exact progress saved, ready to resume whenever you want.
            </p>
            <button className="btn btn-secondary btn-sm" onClick={() => navigate("")}>
              ← View Active Tasks
            </button>
          </div>
        )}

        {!loading && pausedTasks.length > 0 && displayedTasks.length === 0 && (
          <div className="card" style={{ textAlign: "center", padding: "30px 20px" }}>
            <p className="text-muted" style={{ marginBottom: 12 }}>
              No paused tasks found in the <strong>{CATEGORY_LABELS[selectedCategory]}</strong>{" "}
              category.
            </p>
            <button className="btn btn-secondary btn-sm" onClick={() => setSelectedCategory("all")}>
              Show All ({countAll})
            </button>
          </div>
        )}

        {displayedTasks.map((t) => {
          const scanned = (t.processed ?? 0) + (t.failed ?? 0);
          const { title, routeText, isCustomLabel } = getTaskDisplayInfo(t);

          return (
            <div
              key={t.id}
              className="task-item"
              onClick={() => navigate(`task/${t.id}`)}
              style={{ position: "relative" }}
            >
              <div className="task-name">
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span>{title}</span>
                  <Badge variant="paused" label="Paused" />
                  {t.live_enabled && <Badge variant="live" label="Live Active" />}
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <button
                    className="btn btn-primary btn-sm"
                    style={{ padding: "4px 12px", fontSize: 12 }}
                    disabled={resumingId === t.id}
                    onClick={(e) => handleResume(e, t)}
                    title="Resume task execution"
                  >
                    {resumingId === t.id ? "Resuming…" : "▶ Resume"}
                  </button>
                </div>
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
                <span>{new Date((t.created_at ?? 0) * 1000).toLocaleDateString()}</span>
              </div>

              {t.total !== null && t.total > 0 && (
                <div style={{ marginTop: 10 }}>
                  <ProgressBar processed={t.processed ?? 0} failed={t.failed ?? 0} total={t.total} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
