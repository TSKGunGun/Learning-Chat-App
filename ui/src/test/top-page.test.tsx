import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { TopPage } from "@/presentation/pages/top/top-page";
import type { TopPageViewModel } from "@/interface-adapters/view-models/view-models";

const formatTimestampLabel = (value: string) =>
  new Intl.DateTimeFormat("ja-JP", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));

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
          senderKind: "user",
          authorLabel: "あなた",
          createdAtLabel: formatTimestampLabel("2026-05-28T09:45:00.000Z"),
          body: "先週の学習内容を整理してください。",
          statusLabel: "表示可能",
          isPending: false,
          feedbackAvailable: false,
          feedbackState: null,
          isGoodFeedbackActive: false,
          isBadFeedbackActive: false,
          isFeedbackSubmitting: false,
          feedbackErrorMessage: null,
          goodFeedbackLabel: "Good",
          badFeedbackLabel: "Bad",
        },
      ],
      composer: {
        value: "",
        inputPlaceholder: "メッセージを入力",
        helperText:
          "AI の回答を訂正したい場合も、そのままメッセージとして送信できます。",
        submitLabel: "送信",
        errorMessage: null,
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
    const handleComposerTextChange = vi.fn();
    const handleMessageSubmit = vi.fn();
    const handleMessageFeedbackSubmit = vi.fn();

    render(
      <TopPage
        viewModel={createViewModel({
          activePane: {
            ...createViewModel().activePane,
            composer: {
              ...createViewModel().activePane.composer,
              isSubmitDisabled: false,
            },
          },
        })}
        isBusy={false}
        onStartNewChat={handleStartNewChat}
        onSelectChat={handleSelectChat}
        onDeleteChat={handleDeleteChat}
        onComposerTextChange={handleComposerTextChange}
        onMessageSubmit={handleMessageSubmit}
        onMessageFeedbackSubmit={handleMessageFeedbackSubmit}
        onDrawerOpenChange={vi.fn()}
      />
    );

    await user.click(screen.getByRole("button", { name: "新規チャットを開始" }));
    await user.click(screen.getByText("次の会話"));
    await user.click(
      screen.getAllByRole("button", { name: "週次ふり返りを削除" })[0]
    );
    await user.type(screen.getByRole("textbox", { name: "メッセージ入力" }), "次の一手");
    await user.click(screen.getByRole("button", { name: "送信" }));

    expect(handleStartNewChat).toHaveBeenCalledTimes(1);
    expect(handleSelectChat).toHaveBeenCalledWith("channel-2");
    expect(handleDeleteChat).toHaveBeenCalledWith("channel-1");
    expect(handleComposerTextChange).toHaveBeenCalled();
    expect(handleMessageSubmit).toHaveBeenCalledTimes(1);
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
              value: "",
              inputPlaceholder: "メッセージを入力",
              helperText:
                "AI の回答を訂正したい場合も、そのままメッセージとして送信できます。",
              submitLabel: "送信",
              errorMessage: null,
              isInputDisabled: false,
              isSubmitDisabled: true,
            },
          },
        })}
        isBusy={false}
        onStartNewChat={vi.fn()}
        onSelectChat={vi.fn()}
        onDeleteChat={vi.fn()}
        onComposerTextChange={vi.fn()}
        onMessageSubmit={vi.fn()}
        onMessageFeedbackSubmit={vi.fn()}
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

  it("shows the inline composer error and disables input while pending", () => {
    render(
      <TopPage
        viewModel={createViewModel({
          activePane: {
            title: "AI 応答待ちの確認",
            description: "ポーリング中の表示です。",
            isDraft: false,
            emptyStateText: "まだメッセージはありません。",
            messages: [
              {
                id: "pending-message",
                senderKind: "ai",
                authorLabel: "AI",
                createdAtLabel: formatTimestampLabel("2026-05-28T10:01:00.000Z"),
                body: "AI回答生成中",
                statusLabel: "AI回答生成中",
                isPending: true,
                feedbackAvailable: false,
                feedbackState: null,
                isGoodFeedbackActive: false,
                isBadFeedbackActive: false,
                isFeedbackSubmitting: false,
                feedbackErrorMessage: null,
                goodFeedbackLabel: "Good",
                badFeedbackLabel: "Bad",
              },
            ],
            composer: {
              value: "送信待ちメッセージ",
              inputPlaceholder: "メッセージを入力",
              helperText:
                "AI の回答を訂正したい場合も、そのままメッセージとして送信できます。",
              submitLabel: "送信",
              errorMessage: "Pending AI response already exists.",
              isInputDisabled: true,
              isSubmitDisabled: true,
            },
          },
        })}
        isBusy={false}
        onStartNewChat={vi.fn()}
        onSelectChat={vi.fn()}
        onDeleteChat={vi.fn()}
        onComposerTextChange={vi.fn()}
        onMessageSubmit={vi.fn()}
        onMessageFeedbackSubmit={vi.fn()}
        onDrawerOpenChange={vi.fn()}
      />
    );

    expect(screen.getByRole("textbox", { name: "メッセージ入力" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "送信" })).toBeDisabled();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Pending AI response already exists."
    );
    expect(screen.getByTestId("pending-message-loader")).toBeInTheDocument();
    expect(screen.getByText("AI").closest("article")).toHaveClass(
      "bg-amber-50",
      "border-amber-100"
    );
  });

  it("shows sender icons, sender colors, and does not render the completed status label", () => {
    const olderTimestamp = formatTimestampLabel("2026-05-28T09:45:00.000Z");
    const newerTimestamp = formatTimestampLabel("2026-05-28T10:00:00.000Z");

    render(
      <TopPage
        viewModel={createViewModel({
          activePane: {
            ...createViewModel().activePane,
            messages: [
              {
                id: "message-1",
                senderKind: "user",
                authorLabel: "あなた",
                createdAtLabel: olderTimestamp,
                body: "古いメッセージ",
                statusLabel: "表示可能",
                isPending: false,
                feedbackAvailable: false,
                feedbackState: null,
                isGoodFeedbackActive: false,
                isBadFeedbackActive: false,
                isFeedbackSubmitting: false,
                feedbackErrorMessage: null,
                goodFeedbackLabel: "Good",
                badFeedbackLabel: "Bad",
              },
              {
                id: "message-2",
                senderKind: "ai",
                authorLabel: "AI",
                createdAtLabel: newerTimestamp,
                body: "新しいメッセージ",
                statusLabel: "表示可能",
                isPending: false,
                feedbackAvailable: true,
                feedbackState: true,
                isGoodFeedbackActive: true,
                isBadFeedbackActive: false,
                isFeedbackSubmitting: false,
                feedbackErrorMessage: null,
                goodFeedbackLabel: "Good",
                badFeedbackLabel: "Bad",
              },
            ],
          },
        })}
        isBusy={false}
        onStartNewChat={vi.fn()}
        onSelectChat={vi.fn()}
        onDeleteChat={vi.fn()}
        onComposerTextChange={vi.fn()}
        onMessageSubmit={vi.fn()}
        onMessageFeedbackSubmit={vi.fn()}
        onDrawerOpenChange={vi.fn()}
      />
    );

    expect(screen.getAllByText(olderTimestamp).length).toBeGreaterThan(0);
    expect(screen.getAllByText(newerTimestamp).length).toBeGreaterThan(0);
    expect(screen.getByText("あなた").closest("article")).toHaveClass(
      "bg-sky-50",
      "border-sky-100"
    );
    expect(screen.getByText("AI").closest("article")).toHaveClass(
      "bg-amber-50",
      "border-amber-100"
    );
    expect(
      screen
        .getByText("あなた")
        .closest("article")
        ?.querySelector('svg.lucide-user-round')
    ).not.toBeNull();
    expect(
      screen
        .getByText("AI")
        .closest("article")
        ?.querySelector('svg.lucide-sparkles')
    ).not.toBeNull();
    expect(screen.queryByText("表示可能")).not.toBeInTheDocument();
    expect(
      screen.getByText(
        "AI の回答を訂正したい場合も、そのままメッセージとして送信できます。"
      )
    ).toBeInTheDocument();
  });

  it("routes feedback actions and shows active feedback state only for completed ai messages", async () => {
    const user = userEvent.setup();
    const handleMessageFeedbackSubmit = vi.fn();

    render(
      <TopPage
        viewModel={createViewModel({
          activePane: {
            ...createViewModel().activePane,
            messages: [
              {
                id: "message-ai-completed",
                senderKind: "ai",
                authorLabel: "AI",
                createdAtLabel: formatTimestampLabel("2026-05-28T10:00:00.000Z"),
                body: "完了済みのAI回答です。",
                statusLabel: "表示可能",
                isPending: false,
                feedbackAvailable: true,
                feedbackState: false,
                isGoodFeedbackActive: false,
                isBadFeedbackActive: true,
                isFeedbackSubmitting: false,
                feedbackErrorMessage: null,
                goodFeedbackLabel: "Good",
                badFeedbackLabel: "Bad",
              },
              {
                id: "message-ai-timeout",
                senderKind: "ai",
                authorLabel: "AI",
                createdAtLabel: formatTimestampLabel("2026-05-28T10:01:00.000Z"),
                body: "AI応答がありません",
                statusLabel: "AI応答がありません",
                isPending: false,
                feedbackAvailable: false,
                feedbackState: null,
                isGoodFeedbackActive: false,
                isBadFeedbackActive: false,
                isFeedbackSubmitting: false,
                feedbackErrorMessage: null,
                goodFeedbackLabel: "Good",
                badFeedbackLabel: "Bad",
              },
            ],
          },
        })}
        isBusy={false}
        onStartNewChat={vi.fn()}
        onSelectChat={vi.fn()}
        onDeleteChat={vi.fn()}
        onComposerTextChange={vi.fn()}
        onMessageSubmit={vi.fn()}
        onMessageFeedbackSubmit={handleMessageFeedbackSubmit}
        onDrawerOpenChange={vi.fn()}
      />
    );

    const completedMessage = screen.getByText("完了済みのAI回答です。").closest("article");
    const timeoutMessage = screen.getByText("AI応答がありません").closest("article");

    expect(completedMessage).not.toBeNull();
    expect(timeoutMessage).not.toBeNull();
    expect(within(completedMessage as HTMLElement).getByRole("button", { name: "Good" })).toBeEnabled();
    expect(within(completedMessage as HTMLElement).getByRole("button", { name: "Bad" })).toHaveClass(
      "bg-rose-100"
    );
    expect(
      within(timeoutMessage as HTMLElement).queryByRole("button", { name: "Good" })
    ).not.toBeInTheDocument();
    expect(
      within(timeoutMessage as HTMLElement).queryByRole("button", { name: "Bad" })
    ).not.toBeInTheDocument();

    await user.click(
      within(completedMessage as HTMLElement).getByRole("button", { name: "Good" })
    );
    await user.click(
      within(completedMessage as HTMLElement).getByRole("button", { name: "Bad" })
    );

    expect(handleMessageFeedbackSubmit).toHaveBeenNthCalledWith(
      1,
      "message-ai-completed",
      true
    );
    expect(handleMessageFeedbackSubmit).toHaveBeenNthCalledWith(
      2,
      "message-ai-completed",
      false
    );
  });

  it("shows a message-level feedback error and disables feedback buttons while submitting", () => {
    render(
      <TopPage
        viewModel={createViewModel({
          activePane: {
            ...createViewModel().activePane,
            messages: [
              {
                id: "message-ai-completed",
                senderKind: "ai",
                authorLabel: "AI",
                createdAtLabel: formatTimestampLabel("2026-05-28T10:00:00.000Z"),
                body: "完了済みのAI回答です。",
                statusLabel: "表示可能",
                isPending: false,
                feedbackAvailable: true,
                feedbackState: null,
                isGoodFeedbackActive: false,
                isBadFeedbackActive: false,
                isFeedbackSubmitting: true,
                feedbackErrorMessage: "フィードバックの送信に失敗しました。",
                goodFeedbackLabel: "Good",
                badFeedbackLabel: "Bad",
              },
            ],
          },
        })}
        isBusy={false}
        onStartNewChat={vi.fn()}
        onSelectChat={vi.fn()}
        onDeleteChat={vi.fn()}
        onComposerTextChange={vi.fn()}
        onMessageSubmit={vi.fn()}
        onMessageFeedbackSubmit={vi.fn()}
        onDrawerOpenChange={vi.fn()}
      />
    );

    expect(screen.getByRole("button", { name: "Good" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Bad" })).toBeDisabled();
    expect(screen.getByText("フィードバックの送信に失敗しました。")).toBeInTheDocument();
  });
});
