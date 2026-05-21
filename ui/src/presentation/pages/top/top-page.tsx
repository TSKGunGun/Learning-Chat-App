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
      title="トップ画面を準備しています"
      summary="画面構成と ViewModel のつなぎ込みを確認しています。"
    >
      <RouteLoadingState
        title="トップ画面のプレースホルダーを構築中です"
        description="今後 API 取得へ置き換えてもルートの責務を保てるよう、非同期ロードの形を先に整えています。"
      />
    </WorkspacePageTemplate>
  );
}

export function TopErrorPage() {
  return (
    <WorkspacePageTemplate
      title="トップ画面を読み込めませんでした"
      summary="プレースホルダーの組み立て中に問題が発生しました。"
    >
      <RouteErrorState
        title="トップ画面の初期化に失敗しました"
        description="Controller から ViewModel を生成できなかったため、ワークスペースの雛形を表示できません。"
      />
    </WorkspacePageTemplate>
  );
}
