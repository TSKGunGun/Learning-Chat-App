import type { ChatWorkspaceRepository } from "@/application/ports/chat-workspace-repository";

export class DeleteChatUseCase {
  public constructor(
    private readonly repository: ChatWorkspaceRepository
  ) {}

  public execute(channelId: string): Promise<void> {
    return this.repository.deleteChatById(channelId);
  }
}
