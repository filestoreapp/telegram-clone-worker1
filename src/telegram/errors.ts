import type { TelegramApiErrorBody } from "./types";
import type { ErrorReason, Result } from "../shared/rpcTypes";

export type { ErrorReason, Result };

export class TelegramApiError extends Error {
  errorCode: number;
  reason: ErrorReason;
  retryAfter?: number;

  constructor(body: TelegramApiErrorBody) {
    super(body.description);
    this.name = "TelegramApiError";
    this.errorCode = body.error_code;
    this.retryAfter = body.parameters?.retry_after;
    this.reason = classify(body);
  }
}

function classify(body: TelegramApiErrorBody): ErrorReason {
  const desc = body.description.toLowerCase();
  if (body.error_code === 429 || desc.includes("too many requests")) return "rate_limited";
  if (body.error_code === 401) return "unauthorized";
  if (body.error_code === 403 || desc.includes("bot was kicked") || desc.includes("bot is not a member")) {
    return "bot_not_in_chat";
  }
  if (
    desc.includes("not enough rights") ||
    desc.includes("chat_admin_required") ||
    desc.includes("have no rights") ||
    desc.includes("can't remove chat owner") ||
    desc.includes("user_not_participant")
  ) {
    return "insufficient_permissions";
  }
  if (body.error_code === 400) return "invalid_request";
  return "unknown";
}

export function errFromTelegram(e: unknown): Result<never> {
  if (e instanceof TelegramApiError) {
    return {
      ok: false,
      errorCode: e.errorCode,
      description: e.message,
      reason: e.reason,
      retryAfter: e.retryAfter,
    };
  }
  return {
    ok: false,
    errorCode: 0,
    description: e instanceof Error ? e.message : String(e),
    reason: "unknown",
  };
}

export async function toResult<T>(fn: () => Promise<T>): Promise<Result<T>> {
  try {
    const data = await fn();
    return { ok: true, data };
  } catch (e) {
    return errFromTelegram(e);
  }
}
