import { useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";

import { container } from "@/di/container";
import { useRouteLoader } from "@/framework/hooks/use-route-loader";
import { ROUTES } from "@/framework/routes/routes";
import {
  TopErrorPage,
  TopLoadingPage,
  TopPage,
} from "@/presentation/pages/top/top-page";
import { UnauthorizedRequestError } from "@/shared/errors/request-errors";

export function TopRoute() {
  const navigate = useNavigate();
  const loadTopPage = useCallback(async () => {
    await container.authenticationController.requireAuthenticatedSession();
    return container.topPageController.handle();
  }, []);
  const { data: viewModel, error, hasError, isLoading } = useRouteLoader(
    loadTopPage,
    "Failed to load the top page placeholder.",
    {
      shouldReportError: (routeError) =>
        !(routeError instanceof UnauthorizedRequestError),
    }
  );

  useEffect(() => {
    if (error instanceof UnauthorizedRequestError) {
      navigate(ROUTES.login, { replace: true });
    }
  }, [error, navigate]);

  if (error instanceof UnauthorizedRequestError) {
    return null;
  }

  if (hasError) {
    return <TopErrorPage />;
  }

  if (isLoading || viewModel === null) {
    return <TopLoadingPage />;
  }

  return <TopPage viewModel={viewModel} />;
}
