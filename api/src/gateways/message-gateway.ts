import type { ChatMessage } from "@/entities/chat-message";

export interface UpdateAiMessageInput {
  readonly status: "completed" | "ai_timeout";
  readonly messageText: string;
}

export interface MessageGateway {
  listByChannelId(channelId: string): Promise<ReadonlyArray<ChatMessage>>;
  listByActiveOwnedChannelId(
    userId: string,
    channelId: string
  ): Promise<ReadonlyArray<ChatMessage>>;
  hasPendingAiMessageInChannel(channelId: string): Promise<boolean>;
  createMessage(message: ChatMessage): Promise<ChatMessage>;
  updateAiMessage(messageId: string, input: UpdateAiMessageInput): Promise<void>;
  updateMessageFeedback(
    messageId: string,
    feedback: boolean | null
  ): Promise<void>;
}
