import { useState } from "react";

import { LoginFormPanel } from "@/presentation/organisms/login-form-panel";
import type { LoginFormValues } from "@/presentation/organisms/login-form-panel";
import { RouteErrorState } from "@/presentation/organisms/route-error-state";
import { RouteLoadingState } from "@/presentation/organisms/route-loading-state";
import { AuthPageTemplate } from "@/presentation/templates/auth-page-template";
import type { LoginPageViewModel } from "@/interface-adapters/view-models/view-models";

const DEFAULT_LOGIN_ERROR_MESSAGE =
  "ユーザー名またはパスワードが正しくありません。";

function resolveLoginErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.length > 0) {
    return error.message;
  }

  return DEFAULT_LOGIN_ERROR_MESSAGE;
}

interface LoginPageProps {
  readonly viewModel: LoginPageViewModel;
  readonly onSubmit?: (values: LoginFormValues) => Promise<void> | void;
}

export function LoginPage({ viewModel, onSubmit }: LoginPageProps) {
  const [errorMessage, setErrorMessage] = useState<string | undefined>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (values: LoginFormValues) => {
    if (onSubmit === undefined) {
      return;
    }

    setErrorMessage(undefined);
    setIsSubmitting(true);

    try {
      await onSubmit(values);
    } catch (error) {
      setErrorMessage(resolveLoginErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthPageTemplate eyebrow="Welcome Back">
      <LoginFormPanel
        viewModel={viewModel}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
        errorMessage={errorMessage}
      />
    </AuthPageTemplate>
  );
}

export function LoginLoadingPage() {
  return (
    <AuthPageTemplate eyebrow="Sign In">
      <RouteLoadingState
        title="ログイン画面を読み込んでいます"
        description="まもなくログインフォームが表示されます。"
      />
    </AuthPageTemplate>
  );
}

export function LoginErrorPage() {
  return (
    <AuthPageTemplate eyebrow="Sign In">
      <RouteErrorState
        title="ログイン画面を表示できませんでした"
        description="時間をおいて再度お試しください。"
      />
    </AuthPageTemplate>
  );
}
