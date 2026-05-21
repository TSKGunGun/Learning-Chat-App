import { useCallback } from "react";

import { container } from "@/di/container";
import { useRouteLoader } from "@/framework/hooks/use-route-loader";
import {
  TopErrorPage,
  TopLoadingPage,
  TopPage,
} from "@/presentation/pages/top/top-page";

export function TopRoute() {
  const loadTopPage = useCallback(() => container.topPageController.handle(), []);
  const { data: viewModel, hasError, isLoading } = useRouteLoader(
    loadTopPage,
    "Failed to load the top page placeholder."
  );

  if (hasError) {
    return <TopErrorPage />;
  }

  if (isLoading || viewModel === null) {
    return <TopLoadingPage />;
  }

  return <TopPage viewModel={viewModel} />;
}
