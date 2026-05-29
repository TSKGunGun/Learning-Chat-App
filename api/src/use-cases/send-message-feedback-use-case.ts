import type { MessageGateway } from "@/gateways/message-gateway";
import { NoopMessageGateway } from "@/gateways/noop-gateways";
import {
  MessageFeedbackNotAllowedError,
  NotFoundApplicationError,
} from "@/shared/errors/application-error";

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

interface SendMessageFeedbackUseCaseDependencies {
  readonly messageGateway: MessageGateway;
}

export class SendMessageFeedbackUseCase {
  private readonly messageGateway: MessageGateway;

  public constructor(
    dependencies: Partial<SendMessageFeedbackUseCaseDependencies> = {}
  ) {
    this.messageGateway =
      dependencies.messageGateway ?? new NoopMessageGateway();
  }

  public async execute(
    command: SendMessageFeedbackCommand
  ): Promise<SendMessageFeedbackResult> {
    const message = await this.messageGateway.findOwnedAiMessageForFeedback(
      command.authenticatedUserId,
      command.channelId,
      command.messageId
    );

    if (!message) {
      throw new NotFoundApplicationError("AI message not found.");
    }

    if (message.status !== "completed") {
      throw new MessageFeedbackNotAllowedError();
    }

    const nextFeedback =
      message.aiFeedback === command.aiFeedback ? null : command.aiFeedback;

    await this.messageGateway.updateMessageFeedback(
      command.messageId,
      nextFeedback
    );

    return {
      messageId: command.messageId,
      aiFeedback: nextFeedback,
    };
  }
}
