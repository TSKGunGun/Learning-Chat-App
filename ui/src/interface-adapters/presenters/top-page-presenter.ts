import type { TopPageWorkspaceState } from "@/application/use-cases/load-top-page-workspace-use-case";
import type { ChatSelection } from "@/application/use-cases/top-page-workspace-selection";
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

const resolvePaneDescription = (selection: ChatSelection) =>
  selection.type === "new"
    ? "最初のメッセージを送信するまでは未保存の新規チャットとして扱われます。"
    : "会話履歴を確認しながら、次の実装方針を整理できます。";

export class TopPagePresenter {
  public present(
    workspace: TopPageWorkspaceState,
    isDrawerOpen: boolean
  ): TopPageViewModel {
    const selectedChannelId =
      workspace.selection.type === "existing"
        ? workspace.selection.channelId
        : null;
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
        messages: (workspace.activeChat?.messages ?? []).map((message) => ({
          id: message.id,
          authorLabel: message.senderType === "ai" ? "AI" : "あなた",
          body: message.body ?? formatStatusLabel(message.status),
          statusLabel: formatStatusLabel(message.status),
          feedbackAvailable:
            message.senderType === "ai" && message.status === "completed",
        })),
        composer: {
          inputPlaceholder: "メッセージを入力",
          submitLabel: "送信",
          isInputDisabled: false,
          isSubmitDisabled: true,
        },
      },
      mobileDrawer: {
        canOpenDrawer: true,
        isDrawerOpen,
        openLabel: "チャット一覧を開く",
        closeLabel: "チャット一覧を閉じる",
        title: "チャット一覧",
      },
    };
  }
}
