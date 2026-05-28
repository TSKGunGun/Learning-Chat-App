import type { DeleteChatUseCase } from "@/application/use-cases/delete-chat-use-case";
import type { LoadChatDetailUseCase } from "@/application/use-cases/load-chat-detail-use-case";
import type {
  LoadTopPageWorkspaceUseCase,
  TopPageWorkspaceState,
} from "@/application/use-cases/load-top-page-workspace-use-case";
import type { ListChatChannelsUseCase } from "@/application/use-cases/list-chat-channels-use-case";
import {
  NEW_CHAT_SELECTION,
  resolveChatSelectionAfterDelete,
} from "@/application/use-cases/top-page-workspace-selection";
import type { TopPagePresenter } from "@/interface-adapters/presenters/top-page-presenter";
import type { TopPageViewModel } from "@/interface-adapters/view-models/view-models";

export class TopPageController {
  public constructor(
    private readonly loadWorkspaceUseCase: LoadTopPageWorkspaceUseCase,
    private readonly listChatChannelsUseCase: ListChatChannelsUseCase,
    private readonly loadChatDetailUseCase: LoadChatDetailUseCase,
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

  public present(
    workspace: TopPageWorkspaceState,
    isDrawerOpen: boolean
  ): TopPageViewModel {
    return this.presenter.present(workspace, isDrawerOpen);
  }
}
