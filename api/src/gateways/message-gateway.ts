import type { ChatMessage } from "@/entities/chat-message";

export interface AppendUserMessageWithPendingAiMessageInput {
  readonly channelId: string;
  readonly userMessage: ChatMessage;
  readonly pendingAiMessage: ChatMessage;
}

export interface UpdateAiMessageInput {
  readonly channelId: string;
  readonly status: "completed" | "ai_timeout";
  readonly messageText: string;
  readonly lastMessagedAt: string;
}

export interface AppendedChatMessages {
  readonly userMessage: ChatMessage;
  readonly pendingAiMessage: ChatMessage;
}

export interface MessageGateway {
  listByChannelId(channelId: string): Promise<ReadonlyArray<ChatMessage>>;
  listByActiveOwnedChannelId(
    userId: string,
    channelId: string
  ): Promise<ReadonlyArray<ChatMessage>>;
  createMessage(message: ChatMessage): Promise<ChatMessage>;
  appendUserMessageWithPendingAiMessage(
    input: AppendUserMessageWithPendingAiMessageInput
  ): Promise<AppendedChatMessages>;
  updateAiMessage(messageId: string, input: UpdateAiMessageInput): Promise<void>;
  updateMessageFeedback(
    messageId: string,
    feedback: boolean | null
  ): Promise<void>;
}
