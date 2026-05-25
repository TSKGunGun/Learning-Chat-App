import { ChatWorkspacePreview } from "@/presentation/organisms/chat-workspace-preview";
import { RouteErrorState } from "@/presentation/organisms/route-error-state";
import { RouteLoadingState } from "@/presentation/organisms/route-loading-state";
import { WorkspacePageTemplate } from "@/presentation/templates/workspace-page-template";
import type { TopPageViewModel } from "@/interface-adapters/view-models/view-models";

interface TopPageProps {
  readonly viewModel: TopPageViewModel;
}

export function TopPage({ viewModel }: TopPageProps) {
  return (
    <WorkspacePageTemplate
      title={viewModel.heading}
      summary={viewModel.supportingText}
    >
      <ChatWorkspacePreview viewModel={viewModel} />
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
