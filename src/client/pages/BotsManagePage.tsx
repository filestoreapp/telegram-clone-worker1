import { useState } from "react";
import { api } from "../lib/api";
import { usePolling } from "../lib/usePolling";
import { useToast } from "../components/Toast";
import { PageHero } from "../components/PageHero";
import { navigate } from "../lib/router";
import type { BotSummary, TaskSummary } from "../../shared/rpcTypes";

export function BotsManagePage() {
  const { data: bots, loading, refetch } = usePolling(() => api.get<BotSummary[]>("/api/bots"), 10000);
  const [confirming, setConfirming] = useState<{ bot: BotSummary; taskCount: number } | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const toast = useToast();

  async function startDelete(bot: BotSummary) {
    const res = await api.get<TaskSummary[]>(`/api/bots/${bot.id}/tasks`);
    setConfirming({ bot, taskCount: res.ok ? res.data.length : 0 });
  }

  async function confirmDelete() {
    if (!confirming) return;
    const res = await api.del(`/api/bots/${confirming.bot.id}`);
    if (res.ok) {
      toast.show("success", `Deleted @${confirming.bot.bot_username} and its tasks`);
    } else {
      toast.show("error", res.description);
    }
    setConfirming(null);
    refetch();
  }

  function startRename(bot: BotSummary) {
    setRenaming(bot.id);
    setRenameValue(bot.label);
  }

  async function saveRename(botId: string) {
    if (!renameValue.trim()) return;
    const res = await api.patch(`/api/bots/${botId}`, { label: renameValue.trim() });
    if (res.ok) {
      toast.show("success", "Bot note updated");
      refetch();
    } else {
      toast.show("error", res.description);
    }
    setRenaming(null);
  }

  return (
    <div className="content-container">
      <PageHero
        title="Connected Bots"
        subtitle="Rename or remove the bots connected to your tasks"
      >
        <button className="btn btn-primary" onClick={() => navigate("wizard")}>
          + Connect Bot
        </button>
      </PageHero>

      <div className="card">
        {loading && <div className="skeleton-row" />}
        {!loading && bots?.length === 0 && (
          <p className="text-muted" style={{ fontSize: 13, textAlign: "center", padding: "24px 0" }}>
            No bots configured yet — add one from the task wizard.
          </p>
        )}
        {bots?.map((bot) => (
          <div key={bot.id} className="task-item" style={{ cursor: "default" }}>
            <div className="task-name">
              {renaming === bot.id ? (
                <div className="row" style={{ flex: 1 }}>
                  <input
                    className="input"
                    style={{ flex: 1 }}
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    placeholder="Note (e.g. which chat this bot handles)"
                    autoFocus
                  />
                  <button className="btn btn-primary btn-sm" onClick={() => saveRename(bot.id)}>
                    Save
                  </button>
                  <button className="btn btn-secondary btn-sm" onClick={() => setRenaming(null)}>
                    Cancel
                  </button>
                </div>
              ) : (
                <>
                  <span>
                    {bot.label} <span className="text-muted">@{bot.bot_username}</span>
                  </span>
                  <div className="row" style={{ gap: 6 }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => startRename(bot)}>
                      Rename
                    </button>
                    <button className="btn btn-danger btn-sm" onClick={() => startDelete(bot)}>
                      Delete
                    </button>
                  </div>
                </>
              )}
            </div>
            <div className="task-detail">
              <span>Bot ID: {bot.bot_id}</span>
              <span>·</span>
              <span>Added: {new Date(bot.created_at * 1000).toLocaleDateString()}</span>
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
            Delete <strong>@{confirming.bot.bot_username}</strong>? This removes its webhook and permanently deletes{" "}
            <strong>{confirming.taskCount}</strong> task{confirming.taskCount === 1 ? "" : "s"} that use it. This cannot be
            undone.
          </p>
          <div className="row">
            <button className="btn btn-danger" onClick={confirmDelete}>
              Delete bot and {confirming.taskCount} task{confirming.taskCount === 1 ? "" : "s"}
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
