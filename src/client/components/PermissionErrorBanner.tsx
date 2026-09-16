import type { ErrorReason } from "../../shared/rpcTypes";

const REASON_COPY: Record<ErrorReason, string> = {
  insufficient_permissions: "The bot doesn't have the right permission for this in Telegram — check its admin rights in this chat.",
  bot_not_in_chat: "The bot isn't a member of this chat (or was removed).",
  rate_limited: "Telegram is rate-limiting this bot right now — it'll be retried automatically.",
  invalid_request: "That request wasn't valid.",
  unauthorized: "The bot's token has been revoked or is invalid — Telegram is rejecting every request from this bot.",
  unknown: "Something went wrong.",
};

export function PermissionErrorBanner({ reason, description }: { reason: ErrorReason; description: string }) {
  return (
    <div className="permission-banner">
      <span>⚠</span>
      <div>
        <div>{REASON_COPY[reason]}</div>
        <details style={{ marginTop: 4 }}>
          <summary className="text-muted" style={{ cursor: "pointer", fontSize: 12 }}>
            details
          </summary>
          <div className="text-mono text-muted" style={{ marginTop: 4 }}>
            {description}
          </div>
        </details>
      </div>
    </div>
  );
}
