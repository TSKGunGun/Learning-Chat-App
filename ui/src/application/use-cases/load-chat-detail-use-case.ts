import type { ChatWorkspaceRepository } from "@/application/ports/chat-workspace-repository";
import type { ChatDetail } from "@/entities/chat/chat-detail";

export class LoadChatDetailUseCase {
  public constructor(
    private readonly repository: ChatWorkspaceRepository
  ) {}

  public execute(channelId: string): Promise<ChatDetail> {
    return this.repository.getChatById(channelId);
  }
}
