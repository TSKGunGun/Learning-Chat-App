import { NotImplementedApplicationError } from "@/shared/errors/application-error";

export interface SendMessageFeedbackCommand {
  readonly authenticatedUserId: string;
  readonly channelId: string;
  readonly messageId: string;
  readonly aiFeedback: boolean;
}

export interface SendMessageFeedbackResult {
  readonly messageId: string;
  readonly aiFeedback: boolean | null;
}

export class SendMessageFeedbackUseCase {
  public async execute(
    _command: SendMessageFeedbackCommand
  ): Promise<SendMessageFeedbackResult> {
    void _command;

    throw new NotImplementedApplicationError(
      "POST /api/chats/{channel_id}/messages/{message_id}/feedback is not implemented yet."
    );
  }
}
