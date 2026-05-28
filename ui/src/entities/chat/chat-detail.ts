import type { ChatMessage } from "@/entities/chat/chat-message";

export interface ChatDetail {
  readonly channelId: string;
  readonly channelName: string;
  readonly lastMessagedAt: string;
  readonly messages: ReadonlyArray<ChatMessage>;
}
