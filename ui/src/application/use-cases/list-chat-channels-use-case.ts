import type { ChatWorkspaceRepository } from "@/application/ports/chat-workspace-repository";
import type { ChatChannelSummary } from "@/entities/chat/chat-channel-summary";
import { sortChatChannelsByRecency } from "@/application/use-cases/top-page-workspace-selection";

export class ListChatChannelsUseCase {
  public constructor(
    private readonly repository: ChatWorkspaceRepository
  ) {}

  public async execute(): Promise<ReadonlyArray<ChatChannelSummary>> {
    return sortChatChannelsByRecency(await this.repository.listChats());
  }
}
