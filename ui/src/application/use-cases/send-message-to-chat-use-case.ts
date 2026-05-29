import type {
  ChatWorkspaceRepository,
  SubmittedUserMessage,
} from "@/application/ports/chat-workspace-repository";

export class SendMessageToChatUseCase {
  public constructor(
    private readonly repository: ChatWorkspaceRepository
  ) {}

  public execute(
    channelId: string,
    messageText: string
  ): Promise<SubmittedUserMessage> {
    return this.repository.sendMessageToChat(channelId, messageText);
  }
}
