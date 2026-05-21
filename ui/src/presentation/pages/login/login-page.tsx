import { LoginFormPanel } from "@/presentation/organisms/login-form-panel";
import { RouteErrorState } from "@/presentation/organisms/route-error-state";
import { RouteLoadingState } from "@/presentation/organisms/route-loading-state";
import { AuthPageTemplate } from "@/presentation/templates/auth-page-template";
import type { LoginPageViewModel } from "@/interface-adapters/view-models/view-models";

interface LoginPageProps {
  readonly viewModel: LoginPageViewModel;
}

export function LoginPage({ viewModel }: LoginPageProps) {
  return (
    <AuthPageTemplate eyebrow="Login Route Placeholder">
      <LoginFormPanel viewModel={viewModel} />
    </AuthPageTemplate>
  );
}

export function LoginLoadingPage() {
  return (
    <AuthPageTemplate eyebrow="Login Route Loading">
      <RouteLoadingState
        title="ログイン画面のプレースホルダーを準備しています"
        description="非同期ロード前提でも route から UI 層へ安全に値を渡せる形を整えています。"
      />
    </AuthPageTemplate>
  );
}

export function LoginErrorPage() {
  return (
    <AuthPageTemplate eyebrow="Login Route Error">
      <RouteErrorState
        title="ログイン画面の初期化に失敗しました"
        description="認証プレースホルダーの ViewModel を組み立てられなかったため、安全なエラー表示へ切り替えています。"
      />
    </AuthPageTemplate>
  );
}
