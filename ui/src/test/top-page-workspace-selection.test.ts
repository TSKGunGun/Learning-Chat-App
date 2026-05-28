import { describe, expect, it } from "vitest";

import type { ChatWorkspaceRepository } from "@/application/ports/chat-workspace-repository";
import { LoadTopPageWorkspaceUseCase } from "@/application/use-cases/load-top-page-workspace-use-case";
import {
  resolveChatSelectionAfterDelete,
  resolveInitialChatSelection,
} from "@/application/use-cases/top-page-workspace-selection";
import type { ChatChannelSummary } from "@/entities/chat/chat-channel-summary";
import type { ChatDetail } from "@/entities/chat/chat-detail";

class EmptyChatWorkspaceRepository implements ChatWorkspaceRepository {
  public async listChats(): Promise<ReadonlyArray<ChatChannelSummary>> {
    return [];
  }

  public async getChatById(): Promise<ChatDetail> {
    throw new Error("not implemented");
  }

  public async deleteChatById(): Promise<void> {}
}

class FlakyChatWorkspaceRepository implements ChatWorkspaceRepository {
  public async listChats(): Promise<ReadonlyArray<ChatChannelSummary>> {
    return [
      {
        id: "latest",
        name: "最新の会話",
        lastMessagedAt: "2026-05-28T10:00:00.000Z",
      },
    ];
  }

  public async getChatById(): Promise<ChatDetail> {
    throw new Error("not found");
  }

  public async deleteChatById(): Promise<void> {}
}

describe("top page workspace selection", () => {
  it("chooses the most recent chat as the initial selection", () => {
    expect(
      resolveInitialChatSelection([
        {
          id: "older",
          name: "古い会話",
          lastMessagedAt: "2026-05-27T09:30:00.000Z",
        },
        {
          id: "latest",
          name: "最新の会話",
          lastMessagedAt: "2026-05-28T10:00:00.000Z",
        },
      ])
    ).toEqual({
      type: "existing",
      channelId: "latest",
    });
  });

  it("falls back to a new selection when the current chat is deleted and no chats remain", () => {
    expect(
      resolveChatSelectionAfterDelete(
        [],
        {
          type: "existing",
          channelId: "latest",
        },
        "latest"
      )
    ).toEqual({
      type: "new",
    });
  });

  it("treats invalid timestamps as the oldest entries", () => {
    expect(
      resolveInitialChatSelection([
        {
          id: "invalid",
          name: "壊れた日付",
          lastMessagedAt: "not-a-date",
        },
        {
          id: "latest",
          name: "最新の会話",
          lastMessagedAt: "2026-05-28T10:00:00.000Z",
        },
      ])
    ).toEqual({
      type: "existing",
      channelId: "latest",
    });
  });

  it("loads a new-chat workspace when there are no saved chats", async () => {
    const useCase = new LoadTopPageWorkspaceUseCase(
      new EmptyChatWorkspaceRepository()
    );

    await expect(useCase.execute()).resolves.toEqual({
      channels: [],
      selection: {
        type: "new",
      },
      activeChat: null,
    });
  });

  it("falls back to the new-chat workspace when the selected chat disappears before detail load", async () => {
    const useCase = new LoadTopPageWorkspaceUseCase(
      new FlakyChatWorkspaceRepository()
    );

    await expect(useCase.execute()).resolves.toEqual({
      channels: [
        {
          id: "latest",
          name: "最新の会話",
          lastMessagedAt: "2026-05-28T10:00:00.000Z",
        },
      ],
      selection: {
        type: "new",
      },
      activeChat: null,
    });
  });
});
