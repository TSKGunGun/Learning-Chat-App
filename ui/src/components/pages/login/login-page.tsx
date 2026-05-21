import { LoginFormPanel } from "@/components/organisms/login-form-panel";
import { AuthPageTemplate } from "@/components/templates/auth-page-template";
import type { LoginPageViewModel } from "@/shared/types/view-models";

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
