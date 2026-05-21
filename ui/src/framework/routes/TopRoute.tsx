import { useCallback } from "react";

import { RouteLoadingState } from "@/components/organisms/route-loading-state";
import { RouteErrorState } from "@/components/organisms/route-error-state";
import { TopPage } from "@/components/pages/top/top-page";
import { WorkspacePageTemplate } from "@/components/templates/workspace-page-template";
import { container } from "@/di/container";
import { useRouteLoader } from "@/framework/hooks/use-route-loader";

export function TopRoute() {
  const loadTopPage = useCallback(() => container.topPageController.handle(), []);
  const { data: viewModel, hasError, isLoading } = useRouteLoader(
    loadTopPage,
    "Failed to load the top page placeholder."
  );

  if (hasError) {
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

  if (isLoading || viewModel === null) {
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

  return <TopPage viewModel={viewModel} />;
}
