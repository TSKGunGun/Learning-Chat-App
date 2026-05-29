import type {
  ChatWorkspaceRepository,
  SubmittedUserMessage,
} from "@/application/ports/chat-workspace-repository";

export class CreateChatWithFirstMessageUseCase {
  public constructor(
    private readonly repository: ChatWorkspaceRepository
  ) {}

  public execute(messageText: string): Promise<SubmittedUserMessage> {
    return this.repository.createChatWithFirstMessage(messageText);
  }
}
