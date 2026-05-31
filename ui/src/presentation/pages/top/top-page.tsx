import { ChatWorkspacePreview } from "@/presentation/organisms/chat-workspace-preview";
import { RouteErrorState } from "@/presentation/organisms/route-error-state";
import { RouteLoadingState } from "@/presentation/organisms/route-loading-state";
import { WorkspacePageTemplate } from "@/presentation/templates/workspace-page-template";
import type { TopPageViewModel } from "@/interface-adapters/view-models/view-models";

interface TopPageProps {
  readonly viewModel: TopPageViewModel;
  readonly isBusy: boolean;
  readonly onStartNewChat: () => void;
  readonly onSelectChat: (channelId: string) => void;
  readonly onDeleteChat: (channelId: string) => void;
  readonly onComposerTextChange: (nextValue: string) => void;
  readonly onMessageSubmit: () => void;
  readonly onMessageFeedbackSubmit: (
    messageId: string,
    aiFeedback: boolean
  ) => void;
  readonly onDrawerOpenChange: (open: boolean) => void;
}

export function TopPage({
  viewModel,
  isBusy,
  onStartNewChat,
  onSelectChat,
  onDeleteChat,
  onComposerTextChange,
  onMessageSubmit,
  onMessageFeedbackSubmit,
  onDrawerOpenChange,
}: TopPageProps) {
  return (
    <WorkspacePageTemplate
      title={viewModel.heading}
      summary={viewModel.supportingText}
    >
      <ChatWorkspacePreview
        viewModel={viewModel}
        isBusy={isBusy}
        onStartNewChat={onStartNewChat}
        onSelectChat={onSelectChat}
        onDeleteChat={onDeleteChat}
        onComposerTextChange={onComposerTextChange}
        onMessageSubmit={onMessageSubmit}
        onMessageFeedbackSubmit={onMessageFeedbackSubmit}
        onDrawerOpenChange={onDrawerOpenChange}
      />
    </WorkspacePageTemplate>
  );
}

export function TopLoadingPage() {
  return (
    <WorkspacePageTemplate
      title="トップ画面を読み込んでいます"
      summary="会話一覧とチャット内容を準備しています。"
    >
      <RouteLoadingState
        title="データを読み込んでいます"
        description="表示できるまでしばらくお待ちください。"
      />
    </WorkspacePageTemplate>
  );
}

export function TopErrorPage() {
  return (
    <WorkspacePageTemplate
      title="トップ画面を読み込めませんでした"
      summary="時間をおいて再度お試しください。"
    >
      <RouteErrorState
        title="データの取得に失敗しました"
        description="ネットワーク状況を確認してから再度お試しください。"
      />
    </WorkspacePageTemplate>
  );
}
