import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { TopPage } from "@/presentation/pages/top/top-page";
import type { TopPageViewModel } from "@/interface-adapters/view-models/view-models";

function createViewModel(
  overrides: Partial<TopPageViewModel> = {}
): TopPageViewModel {
  return {
    heading: "ChatApp",
    supportingText: "チャットを切り替えながら会話を続けられます。",
    sidebar: {
      title: "チャット一覧",
      description: "保存済みの会話を切り替えます。",
      primaryActionLabel: "新規チャットを開始",
      channels: [
        {
          channelId: "channel-1",
          channelName: "週次ふり返り",
          lastMessagedAtLabel: "05/28 10:00",
          isSelected: true,
          deleteLabel: "週次ふり返りを削除",
        },
        {
          channelId: "channel-2",
          channelName: "次の会話",
          lastMessagedAtLabel: "05/27 09:30",
          isSelected: false,
          deleteLabel: "次の会話を削除",
        },
      ],
    },
    activePane: {
      title: "週次ふり返り",
      description: "先週の会話内容を確認できます。",
      isDraft: false,
      emptyStateText: "まだメッセージはありません。",
      messages: [
        {
          id: "message-1",
          authorLabel: "あなた",
          body: "先週の学習内容を整理してください。",
          statusLabel: "表示可能",
          feedbackAvailable: false,
        },
      ],
      composer: {
        inputPlaceholder: "メッセージを入力",
        submitLabel: "送信",
        isInputDisabled: false,
        isSubmitDisabled: true,
      },
    },
    mobileDrawer: {
      canOpenDrawer: true,
      isDrawerOpen: false,
      openLabel: "チャット一覧を開く",
      closeLabel: "チャット一覧を閉じる",
      title: "チャット一覧",
    },
    ...overrides,
  };
}

describe("TopPage", () => {
  afterEach(() => {
    cleanup();
  });

  it("routes select, new-chat, and delete actions through props", async () => {
    const user = userEvent.setup();
    const handleStartNewChat = vi.fn();
    const handleSelectChat = vi.fn();
    const handleDeleteChat = vi.fn();

    render(
      <TopPage
        viewModel={createViewModel()}
        isBusy={false}
        onStartNewChat={handleStartNewChat}
        onSelectChat={handleSelectChat}
        onDeleteChat={handleDeleteChat}
        onDrawerOpenChange={vi.fn()}
      />
    );

    await user.click(screen.getByRole("button", { name: "新規チャットを開始" }));
    await user.click(screen.getByText("次の会話"));
    await user.click(
      screen.getAllByRole("button", { name: "週次ふり返りを削除" })[0]
    );

    expect(handleStartNewChat).toHaveBeenCalledTimes(1);
    expect(handleSelectChat).toHaveBeenCalledWith("channel-2");
    expect(handleDeleteChat).toHaveBeenCalledWith("channel-1");
  });

  it("renders the draft pane empty state", () => {
    render(
      <TopPage
        viewModel={createViewModel({
          activePane: {
            title: "新規チャット",
            description: "最初のメッセージを送信するまでは未保存です。",
            isDraft: true,
            emptyStateText: "ここから新しい会話を始められます。",
            messages: [],
            composer: {
              inputPlaceholder: "メッセージを入力",
              submitLabel: "送信",
              isInputDisabled: false,
              isSubmitDisabled: true,
            },
          },
        })}
        isBusy={false}
        onStartNewChat={vi.fn()}
        onSelectChat={vi.fn()}
        onDeleteChat={vi.fn()}
        onDrawerOpenChange={vi.fn()}
      />
    );

    expect(screen.getByRole("heading", { name: "新規チャット" })).toBeInTheDocument();
    expect(
      screen.getByText("ここから新しい会話を始められます。")
    ).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "メッセージ入力" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "送信" })).toBeDisabled();
  });
});
