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

export interface OwnedAiMessageForFeedback {
  readonly id: string;
  readonly channelId: string;
  readonly status: "pending" | "completed" | "ai_timeout";
  readonly aiFeedback: boolean | null;
}

export interface AiFeedbackExample {
  readonly messageId: string;
  readonly channelId: string;
  readonly messageText: string;
  readonly aiFeedback: boolean;
  readonly feedbackUpdatedAt: string;
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
  findOwnedAiMessageForFeedback(
    userId: string,
    channelId: string,
    messageId: string
  ): Promise<OwnedAiMessageForFeedback | null>;
  listFeedbackExamplesByUserId(
    userId: string,
    limit: number
  ): Promise<ReadonlyArray<AiFeedbackExample>>;
}
