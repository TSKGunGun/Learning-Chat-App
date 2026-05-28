import type { ChatMessage } from "@/entities/chat-message";

export interface MessageGateway {
  listByChannelId(channelId: string): Promise<ReadonlyArray<ChatMessage>>;
  listByActiveOwnedChannelId(
    userId: string,
    channelId: string
  ): Promise<ReadonlyArray<ChatMessage>>;
  createMessage(message: ChatMessage): Promise<ChatMessage>;
  updateMessageFeedback(
    messageId: string,
    feedback: boolean | null
  ): Promise<void>;
}
