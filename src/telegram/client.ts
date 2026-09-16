import { TelegramApiError } from "./errors";
import type {
  TelegramApiResponse,
  TelegramChat,
  TelegramChatInviteLink,
  TelegramChatMember,
  TelegramMessage,
  TelegramUser,
  TelegramUpdate,
} from "./types";

const API_ROOT = "https://api.telegram.org";

export interface PromoteRights {
  can_delete_messages?: boolean;
  can_restrict_members?: boolean;
  can_invite_users?: boolean;
  can_promote_members?: boolean;
  can_change_info?: boolean;
  can_pin_messages?: boolean;
  can_manage_chat?: boolean;
}

export interface CopyResult {
  message_id: number;
}

export class TelegramClient {
  constructor(private token: string) {}

  private async call<T>(method: string, params: Record<string, unknown> = {}): Promise<T> {
    const url = `${API_ROOT}/bot${this.token}/${method}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(params),
    });
    const body = (await res.json()) as TelegramApiResponse<T>;
    if (!body.ok) throw new TelegramApiError(body);
    return body.result;
  }

  getMe(): Promise<TelegramUser> {
    return this.call("getMe");
  }

  setWebhook(url: string, secretToken: string): Promise<true> {
    return this.call("setWebhook", {
      url,
      secret_token: secretToken,
      max_connections: 40,
      allowed_updates: ["message", "channel_post"],
    });
  }

  deleteWebhook(): Promise<true> {
    return this.call("deleteWebhook", { drop_pending_updates: false });
  }

  getWebhookInfo(): Promise<{ url: string; last_error_message?: string; pending_update_count: number }> {
    return this.call("getWebhookInfo");
  }

  getUpdates(params: { offset?: number; limit?: number; allowed_updates?: string[] } = {}): Promise<TelegramUpdate[]> {
    return this.call("getUpdates", params);
  }

  getChat(chatId: string | number): Promise<TelegramChat> {
    return this.call("getChat", { chat_id: chatId });
  }

  getChatMemberCount(chatId: string | number): Promise<number> {
    return this.call("getChatMemberCount", { chat_id: chatId });
  }

  getChatMember(chatId: string | number, userId: number): Promise<TelegramChatMember> {
    return this.call("getChatMember", { chat_id: chatId, user_id: userId });
  }

  getChatAdministrators(chatId: string | number): Promise<TelegramChatMember[]> {
    return this.call("getChatAdministrators", { chat_id: chatId });
  }

  createChatInviteLink(chatId: string | number, name?: string): Promise<TelegramChatInviteLink> {
    return this.call("createChatInviteLink", { chat_id: chatId, name });
  }

  revokeChatInviteLink(chatId: string | number, inviteLink: string): Promise<TelegramChatInviteLink> {
    return this.call("revokeChatInviteLink", { chat_id: chatId, invite_link: inviteLink });
  }

  exportChatInviteLink(chatId: string | number): Promise<string> {
    return this.call("exportChatInviteLink", { chat_id: chatId });
  }

  promoteChatMember(chatId: string | number, userId: number, rights: PromoteRights): Promise<true> {
    return this.call("promoteChatMember", { chat_id: chatId, user_id: userId, ...rights });
  }

  banChatMember(chatId: string | number, userId: number): Promise<true> {
    return this.call("banChatMember", { chat_id: chatId, user_id: userId });
  }

  unbanChatMember(chatId: string | number, userId: number): Promise<true> {
    return this.call("unbanChatMember", { chat_id: chatId, user_id: userId, only_if_banned: true });
  }

  sendMessage(chatId: string | number, text: string): Promise<TelegramMessage> {
    return this.call("sendMessage", { chat_id: chatId, text });
  }

  deleteMessage(chatId: string | number, messageId: number): Promise<true> {
    return this.call("deleteMessage", { chat_id: chatId, message_id: messageId });
  }

  copyMessage(destChatId: string | number, sourceChatId: string | number, messageId: number): Promise<CopyResult> {
    return this.call("copyMessage", { chat_id: destChatId, from_chat_id: sourceChatId, message_id: messageId });
  }

  copyMessages(destChatId: string | number, sourceChatId: string | number, messageIds: number[]): Promise<CopyResult[]> {
    return this.call("copyMessages", { chat_id: destChatId, from_chat_id: sourceChatId, message_ids: messageIds });
  }
}

export type { TelegramUpdate };
