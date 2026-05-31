import type { TopPageWorkspaceState } from "@/application/use-cases/load-top-page-workspace-use-case";
import type { ChatSelection } from "@/application/use-cases/top-page-workspace-selection";
import type { ChatDetail } from "@/entities/chat/chat-detail";
import type { MessageStatus } from "@/entities/chat/chat-message";
import type { TopPageViewModel } from "@/interface-adapters/view-models/view-models";

const formatStatusLabel = (status: MessageStatus) => {
  switch (status) {
    case "pending":
      return "AI回答生成中";
    case "completed":
      return "表示可能";
    case "ai_timeout":
      return "AI応答がありません";
  }
};

const formatLastMessagedAt = (value: string) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("ja-JP", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

const compareMessageCreatedAtAscending = (
  left: ChatDetail["messages"][number],
  right: ChatDetail["messages"][number]
): number => {
  const leftTime = new Date(left.createdAt).getTime();
  const rightTime = new Date(right.createdAt).getTime();

  if (Number.isNaN(leftTime) && Number.isNaN(rightTime)) {
    return 0;
  }

  if (Number.isNaN(leftTime)) {
    return -1;
  }

  if (Number.isNaN(rightTime)) {
    return 1;
  }

  if (leftTime !== rightTime) {
    return leftTime - rightTime;
  }

  if (left.senderType !== right.senderType) {
    return left.senderType === "user" ? -1 : 1;
  }

  return left.id.localeCompare(right.id);
};

const resolvePaneDescription = (selection: ChatSelection) =>
  selection.type === "new"
    ? "最初のメッセージを送信するまでは未保存の新規チャットとして扱われます。"
    : "会話履歴を確認しながら、次の実装方針を整理できます。";

const hasPendingAiMessage = (chatDetail: ChatDetail | null): boolean =>
  (chatDetail?.messages ?? []).some(
    (message) => message.senderType === "ai" && message.status === "pending"
  );

export class TopPagePresenter {
  public present(
    workspace: TopPageWorkspaceState,
    options: {
      readonly composerText: string;
      readonly composerErrorMessage: string | null;
      readonly feedbackErrorMessages: Readonly<Record<string, string>>;
      readonly isDrawerOpen: boolean;
      readonly submittingFeedbackMessageIds: ReadonlySet<string>;
      readonly isSubmittingMessage: boolean;
    }
  ): TopPageViewModel {
    const selectedChannelId =
      workspace.selection.type === "existing"
        ? workspace.selection.channelId
        : null;
    const hasPendingMessage = hasPendingAiMessage(workspace.activeChat);
    const activeTitle =
      workspace.selection.type === "new"
        ? "新規チャット"
        : (workspace.activeChat?.channelName ?? "チャット");

    return {
      heading: "ChatApp",
      supportingText:
        "会話を選択するか、新しいチャットを開始して利用を続けてください。",
      sidebar: {
        title: "チャット一覧",
        description: "保存済みチャットから会話を切り替えられます。",
        primaryActionLabel: "新規チャットを開始",
        channels: workspace.channels.map((channel) => ({
          channelId: channel.id,
          channelName: channel.name,
          lastMessagedAtLabel: formatLastMessagedAt(channel.lastMessagedAt),
          isSelected: channel.id === selectedChannelId,
          deleteLabel: `${channel.name}を削除`,
        })),
      },
      activePane: {
        title: activeTitle,
        description: resolvePaneDescription(workspace.selection),
        isDraft: workspace.selection.type === "new",
        emptyStateText:
          workspace.selection.type === "new"
            ? "ここから新しい会話を始められます。"
            : "まだメッセージはありません。",
        messages: [...(workspace.activeChat?.messages ?? [])]
          .sort(compareMessageCreatedAtAscending)
          .map((message) => ({
            id: message.id,
            senderKind: message.senderType,
            authorLabel: message.senderType === "ai" ? "AI" : "あなた",
            createdAtLabel: formatLastMessagedAt(message.createdAt),
            body: message.body ?? formatStatusLabel(message.status),
            statusLabel: formatStatusLabel(message.status),
            isPending: message.status === "pending",
            feedbackAvailable:
              message.senderType === "ai" && message.status === "completed",
            feedbackState: message.aiFeedback,
            isGoodFeedbackActive: message.aiFeedback === true,
            isBadFeedbackActive: message.aiFeedback === false,
            isFeedbackSubmitting:
              options.submittingFeedbackMessageIds.has(message.id),
            feedbackErrorMessage:
              options.feedbackErrorMessages[message.id] ?? null,
            goodFeedbackLabel: "Good",
            badFeedbackLabel: "Bad",
          })),
        composer: {
          value: options.composerText,
          inputPlaceholder: "メッセージを入力",
          helperText:
            "AI の回答を訂正したい場合も、そのままメッセージとして送信できます。",
          submitLabel: options.isSubmittingMessage ? "送信中..." : "送信",
          errorMessage: options.composerErrorMessage,
          isInputDisabled: options.isSubmittingMessage || hasPendingMessage,
          isSubmitDisabled:
            options.isSubmittingMessage ||
            hasPendingMessage ||
            options.composerText.trim().length === 0,
        },
      },
      mobileDrawer: {
        canOpenDrawer: true,
        isDrawerOpen: options.isDrawerOpen,
        openLabel: "チャット一覧を開く",
        closeLabel: "チャット一覧を閉じる",
        title: "チャット一覧",
      },
    };
  }
}
