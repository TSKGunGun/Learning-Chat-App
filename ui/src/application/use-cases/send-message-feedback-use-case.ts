import type {
  ChatWorkspaceRepository,
  SubmittedMessageFeedback,
} from "@/application/ports/chat-workspace-repository";

export class SendMessageFeedbackUseCase {
  public constructor(
    private readonly repository: ChatWorkspaceRepository
  ) {}

  public execute(
    channelId: string,
    messageId: string,
    aiFeedback: boolean
  ): Promise<SubmittedMessageFeedback> {
    return this.repository.sendMessageFeedback(channelId, messageId, aiFeedback);
  }
}
