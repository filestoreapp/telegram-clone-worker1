import { handleDeleteBot, handleListBots, handleSyncWebhooks, handleUpdateBot, handleVerifyBot } from "./routes/api/bots";
import {
  handleAdHocTestCopy,
  handleBan,
  handleGetChat,
  handleInviteLink,
  handleLatestMessageId,
  handlePromote,
  handleRevokeInviteLink,
  handleSendTestMessage,
  handleUnban,
} from "./routes/api/chats";
import {
  handleCreateTask,
  handleDeleteTask,
  handleGetTaskActivity,
  handleGetTaskById,
  handleListAllTasks,
  handleListTasks,
  handlePatchTask,
  handleTestCopy,
} from "./routes/api/tasks";
import {
  handleCreateSavedTask,
  handleDeleteSavedTask,
  handleGetSavedTask,
  handleListSavedTasks,
} from "./routes/api/savedTasks";
import { runTick } from "./jobs/tick";
import { ensureDatabaseBootstrap } from "./db/bootstrap";
import {
  authenticateApiRequest,
  handleAuthLogin,
  handleAuthRemove,
  handleAuthSetup,
  handleAuthStatus,
} from "./auth/handler";

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json" } });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const parts = url.pathname.split("/").filter(Boolean);

    if (parts[0] === "api") {
      await ensureDatabaseBootstrap(env.DB);

      // Public health check
      if (parts[1] === "health") {
        return json({ ok: true, data: { status: "up" } });
      }

      // Public authentication routes
      if (parts[1] === "auth") {
        if (parts[2] === "status" && request.method === "GET") {
          return handleAuthStatus(request, env);
        }
        if (parts[2] === "login" && request.method === "POST") {
          return handleAuthLogin(request, env);
        }
        if (parts[2] === "setup" && request.method === "POST") {
          return handleAuthSetup(request, env);
        }
        if (parts[2] === "remove" && request.method === "POST") {
          return handleAuthRemove(request, env);
        }
        return json({ ok: false, errorCode: 404, description: "not found", reason: "invalid_request" }, 404);
      }

      // Protect all remaining /api/* endpoints
      const authError = await authenticateApiRequest(request, env);
      if (authError) return authError;

      const botId = url.searchParams.get("botId") ?? "";
      const botToken = url.searchParams.get("token") ?? "";
      const botTelegramId = url.searchParams.get("botTelegramId") ?? "";

      // /api/bots
      if (parts[1] === "bots" && parts.length === 2) {
        if (request.method === "GET") return handleListBots(env);
      }

      // /api/bots/sync-webhooks — cleans inactive bot webhooks & tightens allowed_updates
      if (parts[1] === "bots" && parts[2] === "sync-webhooks" && parts.length === 3 && request.method === "POST") {
        return handleSyncWebhooks(request, env);
      }

      // /api/bots/verify — token check & workload status
      if (parts[1] === "bots" && parts[2] === "verify" && parts.length === 3 && request.method === "POST") {
        return handleVerifyBot(request, env);
      }

      // /api/bots/:id
      if (parts[1] === "bots" && parts.length === 3 && request.method === "DELETE") {
        return handleDeleteBot(env, parts[2]);
      }
      if (parts[1] === "bots" && parts.length === 3 && request.method === "PATCH") {
        return handleUpdateBot(request, env, parts[2]);
      }

      // /api/bots/:botId/tasks — botId "new" (with a botToken in the body)
      // means the bot isn't saved yet; handleCreateTask saves it as part of
      // creating the task.
      if (parts[1] === "bots" && parts[3] === "tasks" && parts.length === 4) {
        if (request.method === "GET") return handleListTasks(env, parts[2]);
        if (request.method === "POST") return handleCreateTask(request, env, parts[2], url.origin);
      }

      // /api/bots/:botId/tasks/:taskId
      if (parts[1] === "bots" && parts[3] === "tasks" && parts.length === 5) {
        if (request.method === "PATCH") return handlePatchTask(request, env, parts[4]);
        if (request.method === "DELETE") return handleDeleteTask(env, parts[4]);
      }

      // /api/bots/:botId/tasks/:taskId/test-copy
      if (parts[1] === "bots" && parts[3] === "tasks" && parts[5] === "test-copy" && parts.length === 6 && request.method === "POST") {
        const body = (await request.json().catch(() => ({}))) as { messageId?: number };
        return handleTestCopy(env, parts[2], parts[4], body.messageId);
      }

      // /api/tasks (all tasks across bots)
      if (parts[1] === "tasks" && parts.length === 2 && request.method === "GET") {
        return handleListAllTasks(env);
      }

      // /api/tasks/:taskId (bot-agnostic lookup, used by the task detail page)
      if (parts[1] === "tasks" && parts.length === 3 && request.method === "GET") {
        return handleGetTaskById(env, parts[2]);
      }
      if (parts[1] === "tasks" && parts[3] === "activity" && parts.length === 4 && request.method === "GET") {
        return handleGetTaskActivity(env, parts[2]);
      }
      if (parts[1] === "tasks" && parts.length === 3) {
        if (request.method === "PATCH") return handlePatchTask(request, env, parts[2]);
        if (request.method === "DELETE") return handleDeleteTask(env, parts[2]);
      }

      // /api/chats/:chatId — botId for a saved bot, or token+botTelegramId
      // for a not-yet-saved one being checked in the task wizard.
      if (parts[1] === "chats" && parts.length === 3 && request.method === "GET") {
        return handleGetChat(env, decodeURIComponent(parts[2]), botId, botToken, botTelegramId);
      }

      // /api/chats/:chatId/latest-message-id
      if (parts[1] === "chats" && parts[3] === "latest-message-id" && parts.length === 4 && request.method === "GET") {
        return handleLatestMessageId(env, decodeURIComponent(parts[2]), botId, botToken);
      }

      // /api/chats/:chatId/(invite-link|ban|unban|promote|send-test-message)
      if (parts[1] === "chats" && parts.length === 4 && request.method === "POST") {
        const chatId = decodeURIComponent(parts[2]);
        const action = parts[3];
        if (action === "invite-link") return handleInviteLink(env, chatId, botId, botToken);
        if (action === "ban" || action === "unban") {
          const body = (await request.json()) as { userId: number };
          return action === "ban"
            ? handleBan(env, chatId, botId, body.userId, botToken)
            : handleUnban(env, chatId, botId, body.userId, botToken);
        }
        if (action === "promote") {
          const body = (await request.json()) as { userId: number; rights: Record<string, boolean> };
          return handlePromote(env, chatId, botId, body.userId, body.rights, botToken);
        }
        if (action === "send-test-message") {
          const body = (await request.json()) as { text?: string };
          return handleSendTestMessage(env, chatId, botId, body.text ?? ".", botToken);
        }
        if (action === "test-copy") {
          const body = (await request.json()) as { destChatId: string; messageId?: number };
          return handleAdHocTestCopy(env, chatId, botId, body.destChatId, botToken, body.messageId);
        }
        if (action === "revoke-invite-link") {
          const body = (await request.json()) as { inviteLink: string };
          return handleRevokeInviteLink(env, chatId, botId, body.inviteLink, botToken);
        }
      }

      // /api/saved-tasks
      if (parts[1] === "saved-tasks" && parts.length === 2) {
        if (request.method === "GET") return handleListSavedTasks(env);
        if (request.method === "POST") return handleCreateSavedTask(request, env);
      }

      // /api/saved-tasks/:id
      if (parts[1] === "saved-tasks" && parts.length === 3) {
        if (request.method === "GET") return handleGetSavedTask(env, parts[2]);
        if (request.method === "DELETE") return handleDeleteSavedTask(env, parts[2]);
      }

      return json({ ok: false, errorCode: 404, description: "not found", reason: "invalid_request" }, 404);
    }

    return env.ASSETS.fetch(request);
  },

  async scheduled(_controller: ScheduledController, env: Env, _ctx: ExecutionContext): Promise<void> {
    await ensureDatabaseBootstrap(env.DB);
    await runTick(env);
  },
};
