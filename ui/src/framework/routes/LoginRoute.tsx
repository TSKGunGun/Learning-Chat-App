import { useCallback } from "react";
import { useNavigate } from "react-router-dom";

import { container } from "@/di/container";
import { useRouteLoader } from "@/framework/hooks/use-route-loader";
import { ROUTES } from "@/framework/routes/routes";
import {
  LoginErrorPage,
  LoginLoadingPage,
  LoginPage,
} from "@/presentation/pages/login/login-page";

export function LoginRoute() {
  const navigate = useNavigate();
  const loadLoginPage = useCallback(
    () => container.loginPageController.handle(),
    []
  );
  const handleLogin = useCallback(
    async (values: { username: string; password: string }) => {
      await container.authenticationController.login(values);
      navigate(ROUTES.top, { replace: true });
    },
    [navigate]
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

  return <LoginPage viewModel={viewModel} onSubmit={handleLogin} />;
}
