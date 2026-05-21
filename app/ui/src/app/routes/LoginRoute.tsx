import { useCallback } from "react";

import { RouteLoadingState } from "@/components/organisms/route-loading-state";
import { RouteErrorState } from "@/components/organisms/route-error-state";
import { LoginPage } from "@/components/pages/login/login-page";
import { AuthPageTemplate } from "@/components/templates/auth-page-template";
import { container } from "@/di/container";
import { useRouteLoader } from "@/shared/hooks/use-route-loader";

export function LoginRoute() {
  const loadLoginPage = useCallback(
    () => container.loginPageController.handle(),
    []
  );
  const { data: viewModel, hasError, isLoading } = useRouteLoader(
    loadLoginPage,
    "Failed to load the login page placeholder."
  );

  if (hasError) {
    return (
      <AuthPageTemplate eyebrow="Login Route Error">
        <RouteErrorState
          title="ログイン画面の初期化に失敗しました"
          description="認証プレースホルダーの ViewModel を組み立てられなかったため、安全なエラー表示へ切り替えています。"
        />
      </AuthPageTemplate>
    );
  }

  if (isLoading || viewModel === null) {
    return (
      <AuthPageTemplate eyebrow="Login Route Loading">
        <RouteLoadingState
          title="ログイン画面のプレースホルダーを準備しています"
          description="非同期ロード前提でも route から UI 層へ安全に値を渡せる形を整えています。"
        />
      </AuthPageTemplate>
    );
  }

  return <LoginPage viewModel={viewModel} />;
}
