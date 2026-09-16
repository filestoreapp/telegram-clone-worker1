import { TelegramClient } from "../telegram/client";

export interface ResolvedRange {
  startId: number;
  endId: number;
  cleanupOk: boolean;
}

/** Probe-and-delete: send a throwaway message to learn the chat's current
 * highest message id (the returned message_id is always one greater than
 * the last real message), then best-effort delete it so it doesn't
 * clutter the chat. Deletion failure is logged, not fatal. */
export async function resolveLastN(client: TelegramClient, sourceChatId: string, n: number): Promise<ResolvedRange> {
  const probe = await client.sendMessage(sourceChatId, ".");
  let cleanupOk = true;
  try {
    await client.deleteMessage(sourceChatId, probe.message_id);
  } catch {
    cleanupOk = false;
  }
  const latestRealId = probe.message_id - 1;
  return { startId: Math.max(1, latestRealId - n + 1), endId: latestRealId, cleanupOk };
}
