import { useTasks, isTaskCompleted, getTaskDisplayInfo } from "../lib/useTasksContext";
import { navigate } from "../lib/router";
import { PageHero } from "../components/PageHero";
import { Badge, type BadgeVariant } from "../components/Badge";
import type { TaskSummary } from "../../shared/rpcTypes";

function completedStatus(task: TaskSummary): { variant: BadgeVariant; label: string } {
  if (task.stop_reason) return { variant: "failed", label: "Stopped" };
  if (task.backfill_status === "failed") return { variant: "failed", label: "Failed" };
  if (task.backfill_status === "complete") return { variant: "complete", label: "Complete" };
  return { variant: "idle", label: "Cancelled" };
}

export function CompletedTasksPage() {
  const { completedTasks, loading } = useTasks();
  const completed = [...completedTasks]
    .sort((a, b) => (b.stopped_at ?? b.created_at ?? 0) - (a.stopped_at ?? a.created_at ?? 0));

  const totalProcessed = completed.reduce((sum, t) => sum + (t.processed ?? 0), 0);

  return (
    <div className="content-container">
      <PageHero
        title="Completed Tasks"
        subtitle="Finished, cancelled, or stopped task history"
      >
        <button className="btn btn-primary" onClick={() => navigate("wizard")}>
          + New Task
        </button>
      </PageHero>

      {/* Metrics */}
      <div className="metric-grid">
        <div className="metric-card">
          <div className="metric-title">Completed Tasks</div>
          <div className="metric-val">{completed.length}</div>
        </div>
        <div className="metric-card">
          <div className="metric-title">Total Messages Copied</div>
          <div className="metric-val">{totalProcessed.toLocaleString()}</div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-title">Task History Log</div>
        </div>

        {loading && completed.length === 0 && (
          <>
            <div className="skeleton-row" />
            <div className="skeleton-row" />
          </>
        )}

        {!loading && completed.length === 0 && (
          <p className="text-muted" style={{ fontSize: 13, textAlign: "center", padding: "24px 0" }}>
            No completed tasks yet — finished, cancelled, or stopped tasks will appear here.
          </p>
        )}

        {completed.map((task) => {
          const { variant, label } = completedStatus(task);
          const { title, routeText, isCustomLabel } = getTaskDisplayInfo(task);
          return (
            <div
              key={task.id}
              className="task-item"
              onClick={() => navigate(`task/${task.id}`)}
            >
              <div className="task-name">
                <span>{title}</span>
                <Badge variant={variant} label={label} />
              </div>
              <div className="task-detail" style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                {isCustomLabel && (
                  <>
                    <span>{routeText}</span>
                    <span>·</span>
                  </>
                )}
                {task.scope !== "live" && (
                  <span className="pill-stat" style={{ color: "var(--success)" }}>
                    📦 {(task.processed ?? 0).toLocaleString()} copied
                  </span>
                )}
                {task.scope !== "backfill_only" && (
                  <span className="pill-stat" style={{ color: "var(--info)" }}>
                    ⚡ {(task.live_processed ?? 0).toLocaleString()} live
                  </span>
                )}
                <span>·</span>
                <span>{new Date((task.created_at ?? 0) * 1000).toLocaleDateString()}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
