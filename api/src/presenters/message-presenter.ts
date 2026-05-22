import type { SendMessageFeedbackResult } from "@/use-cases/send-message-feedback-use-case";

export interface FeedbackResponseBody {
  readonly message_id: string;
  readonly ai_feedback: boolean | null;
}

export const presentFeedback = (
  result: SendMessageFeedbackResult
): FeedbackResponseBody => ({
  message_id: result.messageId,
  ai_feedback: result.aiFeedback,
});
