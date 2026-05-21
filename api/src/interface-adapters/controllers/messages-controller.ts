import type {
  SendMessageFeedbackCommand,
  SendMessageFeedbackUseCase,
} from "@/application/use-cases/send-message-feedback-use-case";
import type {
  FeedbackResponseBody,
  MessagesPresenter,
} from "@/interface-adapters/presenters/messages-presenter";

export class MessagesController {
  public constructor(
    private readonly useCase: SendMessageFeedbackUseCase,
    private readonly presenter: MessagesPresenter
  ) {}

  public async handleFeedback(
    command: SendMessageFeedbackCommand
  ): Promise<FeedbackResponseBody> {
    const result = await this.useCase.execute(command);
    return this.presenter.presentFeedback(result);
  }
}
