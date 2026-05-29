export type MessageSenderType = "user" | "ai";
export type MessageStatus = "pending" | "completed" | "ai_timeout";

export interface ChatMessage {
  readonly id: string;
  readonly senderType: MessageSenderType;
  readonly body: string | null;
  readonly status: MessageStatus;
  readonly aiFeedback: boolean | null;
  readonly createdAt: string;
}
