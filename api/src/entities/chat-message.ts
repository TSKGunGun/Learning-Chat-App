export type SenderType = "user" | "ai";

export type MessageStatus = "pending" | "completed" | "ai_timeout";

export interface ChatMessage {
  readonly id: string;
  readonly channelId: string;
  readonly senderType: SenderType;
  readonly messageText: string | null;
  readonly status: MessageStatus;
  readonly aiFeedback: boolean | null;
  readonly createdAt: string;
}
