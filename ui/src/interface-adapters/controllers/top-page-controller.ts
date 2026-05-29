import type { CreateChatWithFirstMessageUseCase } from "@/application/use-cases/create-chat-with-first-message-use-case";
import type { DeleteChatUseCase } from "@/application/use-cases/delete-chat-use-case";
import type { LoadChatDetailUseCase } from "@/application/use-cases/load-chat-detail-use-case";
import type {
  LoadTopPageWorkspaceUseCase,
  TopPageWorkspaceState,
} from "@/application/use-cases/load-top-page-workspace-use-case";
import type { ListChatChannelsUseCase } from "@/application/use-cases/list-chat-channels-use-case";
import type { SendMessageToChatUseCase } from "@/application/use-cases/send-message-to-chat-use-case";
import {
  NEW_CHAT_SELECTION,
  resolveChatSelectionAfterDelete,
} from "@/application/use-cases/top-page-workspace-selection";
import type { ChatChannelSummary } from "@/entities/chat/chat-channel-summary";
import type { ChatDetail } from "@/entities/chat/chat-detail";
import type { TopPagePresenter } from "@/interface-adapters/presenters/top-page-presenter";
import type { TopPageViewModel } from "@/interface-adapters/view-models/view-models";

const createActiveChatFromMessage = (
  channelId: string,
  channelName: string,
  messages: ReadonlyArray<ChatDetail["messages"][number]>
): ChatDetail => ({
  channelId,
  channelName,
  lastMessagedAt: messages.at(-1)?.createdAt ?? new Date(0).toISOString(),
  messages,
});

export class TopPageController {
  public constructor(
    private readonly loadWorkspaceUseCase: LoadTopPageWorkspaceUseCase,
    private readonly listChatChannelsUseCase: ListChatChannelsUseCase,
    private readonly loadChatDetailUseCase: LoadChatDetailUseCase,
    private readonly createChatWithFirstMessageUseCase: CreateChatWithFirstMessageUseCase,
    private readonly sendMessageToChatUseCase: SendMessageToChatUseCase,
    private readonly deleteChatUseCase: DeleteChatUseCase,
    private readonly presenter: TopPagePresenter
  ) {}

  public load(): Promise<TopPageWorkspaceState> {
    return this.loadWorkspaceUseCase.execute();
  }

  public async openChat(channelId: string): Promise<TopPageWorkspaceState> {
    const activeChat = await this.loadChatDetailUseCase.execute(channelId);

    return {
      channels: await this.listChatChannelsUseCase.execute(),
      selection: {
        type: "existing",
        channelId,
      },
      activeChat,
    };
  }

  public startNewChat(
    currentState: TopPageWorkspaceState
  ): TopPageWorkspaceState {
    return {
      channels: currentState.channels,
      selection: NEW_CHAT_SELECTION,
      activeChat: null,
    };
  }

  public async submitMessage(
    currentState: TopPageWorkspaceState,
    messageText: string
  ): Promise<TopPageWorkspaceState> {
    if (currentState.selection.type === "new") {
      const createdChat = await this.createChatWithFirstMessageUseCase.execute(
        messageText
      );

      return {
        channels: currentState.channels,
        selection: {
          type: "existing",
          channelId: createdChat.channelId,
        },
        activeChat: createActiveChatFromMessage(
          createdChat.channelId,
          createdChat.channelName,
          [createdChat.message]
        ),
      };
    }

    const sentMessage = await this.sendMessageToChatUseCase.execute(
      currentState.selection.channelId,
      messageText
    );
    const existingMessages =
      currentState.activeChat?.channelId === currentState.selection.channelId
        ? currentState.activeChat.messages
        : [];

    return {
      channels: currentState.channels,
      selection: currentState.selection,
      activeChat: createActiveChatFromMessage(
        sentMessage.channelId,
        sentMessage.channelName,
        [...existingMessages, sentMessage.message]
      ),
    };
  }

  public async deleteChat(
    currentState: TopPageWorkspaceState,
    channelId: string
  ): Promise<TopPageWorkspaceState> {
    await this.deleteChatUseCase.execute(channelId);

    const channels = await this.listChatChannelsUseCase.execute();
    const selection = resolveChatSelectionAfterDelete(
      channels,
      currentState.selection,
      channelId
    );

    if (selection.type === "new") {
      return {
        channels,
        selection,
        activeChat: null,
      };
    }

    const activeChat = await this.loadChatDetailUseCase.execute(selection.channelId);

    return {
      channels,
      selection,
      activeChat,
    };
  }

  public refreshChatDetail(channelId: string): Promise<ChatDetail> {
    return this.loadChatDetailUseCase.execute(channelId);
  }

  public refreshChannels(): Promise<ReadonlyArray<ChatChannelSummary>> {
    return this.listChatChannelsUseCase.execute();
  }

  public present(
    workspace: TopPageWorkspaceState,
    options: {
      readonly composerText: string;
      readonly composerErrorMessage: string | null;
      readonly isDrawerOpen: boolean;
      readonly isSubmittingMessage: boolean;
    }
  ): TopPageViewModel {
    return this.presenter.present(workspace, options);
  }
}
