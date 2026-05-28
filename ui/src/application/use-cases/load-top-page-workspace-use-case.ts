import type { ChatWorkspaceRepository } from "@/application/ports/chat-workspace-repository";
import type { ChatDetail } from "@/entities/chat/chat-detail";
import type { ChatChannelSummary } from "@/entities/chat/chat-channel-summary";

import {
  NEW_CHAT_SELECTION,
  resolveInitialChatSelection,
  sortChatChannelsByRecency,
  type ChatSelection,
} from "@/application/use-cases/top-page-workspace-selection";

export interface TopPageWorkspaceState {
  readonly channels: ReadonlyArray<ChatChannelSummary>;
  readonly selection: ChatSelection;
  readonly activeChat: ChatDetail | null;
}

export class LoadTopPageWorkspaceUseCase {
  public constructor(
    private readonly repository: ChatWorkspaceRepository
  ) {}

  public async execute(): Promise<TopPageWorkspaceState> {
    const channels = sortChatChannelsByRecency(await this.repository.listChats());

    return this.buildWorkspaceState(channels, resolveInitialChatSelection(channels));
  }

  private async buildWorkspaceState(
    channels: ReadonlyArray<ChatChannelSummary>,
    selection: ChatSelection
  ): Promise<TopPageWorkspaceState> {
    if (selection.type === "new") {
      return {
        channels,
        selection,
        activeChat: null,
      };
    }

    try {
      const activeChat = await this.repository.getChatById(selection.channelId);

      return {
        channels,
        selection,
        activeChat,
      };
    } catch {
      const refreshedChannels = sortChatChannelsByRecency(
        await this.repository.listChats()
      );
      const fallbackSelection = resolveInitialChatSelection(refreshedChannels);

      if (fallbackSelection.type === "new") {
        return {
          channels: refreshedChannels,
          selection: NEW_CHAT_SELECTION,
          activeChat: null,
        };
      }

      try {
        const activeChat = await this.repository.getChatById(
          fallbackSelection.channelId
        );

        return {
          channels: refreshedChannels,
          selection: fallbackSelection,
          activeChat,
        };
      } catch {
        return {
          channels: refreshedChannels,
          selection: NEW_CHAT_SELECTION,
          activeChat: null,
        };
      }
    }
  }
}
