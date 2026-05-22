import type { ChatMessage } from "@/entities/chat-message";

export interface MessageListOptions {
  readonly limit?: number;
  readonly cursor?: string;
}

export interface MessagePage {
  readonly items: ReadonlyArray<ChatMessage>;
  readonly nextCursor?: string;
}

export interface MessageGateway {
  listByChannelId(
    channelId: string,
    options?: MessageListOptions
  ): Promise<MessagePage>;
  createMessage(message: ChatMessage): Promise<ChatMessage>;
  updateMessageFeedback(
    messageId: string,
    feedback: boolean | null
  ): Promise<void>;
}
