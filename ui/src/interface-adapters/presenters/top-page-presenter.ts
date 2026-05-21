import type { TopPagePreview } from "@/application/ports/ui-workspace-content-repository";
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

export class TopPagePresenter {
  public present(preview: TopPagePreview): TopPageViewModel {
    return {
      heading: preview.heading,
      supportingText: preview.supportingText,
      isMobileDrawerEnabled: true,
      primaryActionLabel: preview.primaryActionLabel,
      channels: preview.channels.map((channel) => ({
        channelId: channel.id,
        channelName: channel.name,
        lastMessagedAtLabel: channel.lastMessagedAt,
      })),
      selectedChannelId: preview.channels[0]?.id ?? "draft-channel",
      selectedChannelName: preview.selectedChannelName,
      messages: preview.messages.map((message) => ({
        id: message.id,
        authorLabel: message.senderType === "ai" ? "AI" : "あなた",
        body: message.body ?? formatStatusLabel(message.status),
        statusLabel: formatStatusLabel(message.status),
        feedbackAvailable:
          message.senderType === "ai" && message.status === "completed",
      })),
    };
  }
}
