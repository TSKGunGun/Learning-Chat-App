import type { SendMessageFeedbackResult } from "@/application/use-cases/send-message-feedback-use-case";

export interface FeedbackResponseBody {
  readonly message_id: string;
  readonly ai_feedback: boolean | null;
}

export class MessagesPresenter {
  public presentFeedback(
    result: SendMessageFeedbackResult
  ): FeedbackResponseBody {
    return {
      message_id: result.messageId,
      ai_feedback: result.aiFeedback,
    };
  }
}
