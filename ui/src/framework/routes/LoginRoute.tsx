import { useCallback } from "react";

import { container } from "@/di/container";
import { useRouteLoader } from "@/framework/hooks/use-route-loader";
import {
  LoginErrorPage,
  LoginLoadingPage,
  LoginPage,
} from "@/presentation/pages/login/login-page";

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
    return <LoginErrorPage />;
  }

  if (isLoading || viewModel === null) {
    return <LoginLoadingPage />;
  }

  return <LoginPage viewModel={viewModel} />;
}
