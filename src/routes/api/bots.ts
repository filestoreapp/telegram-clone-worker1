import { TelegramClient } from "../../telegram/client";
import { toResult, type Result } from "../../telegram/errors";
import { deleteBot, findBotByTokenOrBotId, getBotWithSecrets, insertBot, listBotsSummary, listBotsWithSecrets, listTasksByBot, updateBotLabel } from "../../db/queries";
import type { BotSummary, BotVerifyResult, TaskSummary } from "../../shared/rpcTypes";

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json" } });
}

export async function handleListBots(env: Env): Promise<Response> {
  const bots = await listBotsSummary(env.DB);
  return json({ ok: true, data: bots });
}

/** Permanently disables webhooks across all registered bots so Telegram
 * stops sending HTTP webhook requests to Cloudflare (pure Cron Auto-Sync).
 */
export async function handleSyncWebhooks(request: Request, env: Env): Promise<Response> {
  const bots = await listBotsWithSecrets(env.DB);
  let webhooksDeleted = 0;
  const errors: string[] = [];

  for (const bot of bots) {
    const client = new TelegramClient(bot.token);
    try {
      await client.deleteWebhook();
      webhooksDeleted++;
    } catch (e) {
      errors.push(`@${bot.bot_username}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return json({
    ok: true,
    data: {
      totalBots: bots.length,
      webhooksDeleted,
      errors: errors.length > 0 ? errors : undefined,
    },
  });
}

/** Validates a token against Telegram (getMe) and checks if the bot already
 * exists in our database, returning any active workloads so the user knows
 * if the bot is currently in use. Does not persist the token. */
export async function handleVerifyBot(request: Request, env: Env): Promise<Response> {
  const body = (await request.json()) as { token?: string };
  if (!body.token) {
    return json({ ok: false, errorCode: 0, description: "token is required", reason: "invalid_request" }, 400);
  }

  const client = new TelegramClient(body.token);
  const result: Result<BotVerifyResult> = await toResult(async () => {
    const me = await client.getMe();
    const existing = await findBotByTokenOrBotId(env.DB, body.token!, me.id);
    let active_tasks: TaskSummary[] = [];
    let total_tasks_count = 0;

    if (existing) {
      const allTasks = await listTasksByBot(env.DB, existing.id);
      total_tasks_count = allTasks.length;
      active_tasks = allTasks.filter(
        (t) => t.live_enabled || t.backfill_status === "running" || t.backfill_status === "paused",
      );
    }

    return {
      bot_id: me.id,
      bot_username: me.username ?? me.first_name,
      first_name: me.first_name,
      can_read_all_group_messages: me.can_read_all_group_messages ?? false,
      existing_bot_id: existing?.id ?? null,
      active_tasks,
      total_tasks_count,
    };
  });

  return json(result, result.ok ? 200 : 400);
}

/** Persists a verified token as a bot row.
 * Only called once something durable actually needs the bot to exist (e.g. task creation).
 * Live updates are polled via getUpdates in scheduled cron (no webhooks). */
export async function createBotRecord(env: Env, _origin: string, token: string, label?: string): Promise<Result<BotSummary>> {
  const client = new TelegramClient(token);
  return toResult(async () => {
    const me = await client.getMe();
    const id = crypto.randomUUID();
    const webhookSecret = crypto.randomUUID().replace(/-/g, "");
    const botUsername = me.username ?? me.first_name;
    const botLabel = label || botUsername;
    await insertBot(env.DB, {
      id,
      token,
      bot_id: me.id,
      bot_username: botUsername,
      label: botLabel,
      webhook_secret: webhookSecret,
    });
    return { id, bot_id: me.id, bot_username: botUsername, label: botLabel, created_at: Math.floor(Date.now() / 1000) };
  });
}

export async function handleUpdateBot(request: Request, env: Env, id: string): Promise<Response> {
  const body = (await request.json()) as { label?: string };
  if (!body.label) {
    return json({ ok: false, errorCode: 0, description: "label is required", reason: "invalid_request" }, 400);
  }
  await updateBotLabel(env.DB, id, body.label);
  return json({ ok: true, data: null });
}

export async function handleDeleteBot(env: Env, id: string): Promise<Response> {
  const bot = await getBotWithSecrets(env.DB, id);
  if (!bot) return json({ ok: false, errorCode: 404, description: "bot not found", reason: "invalid_request" }, 404);

  const client = new TelegramClient(bot.token);
  await toResult(() => client.deleteWebhook());
  await deleteBot(env.DB, id);
  return json({ ok: true, data: null });
}
