import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

import { useTopPageWorkspace } from "@/framework/hooks/use-top-page-workspace";
import { ROUTES } from "@/framework/routes/routes";
import {
  TopErrorPage,
  TopLoadingPage,
  TopPage,
} from "@/presentation/pages/top/top-page";
import { UnauthorizedRequestError } from "@/shared/errors/request-errors";

export function TopRoute() {
  const navigate = useNavigate();
  const {
    viewModel,
    error,
    hasError,
    isLoading,
    isPending,
    startNewChat,
    selectChat,
    deleteChat,
    setDrawerOpen,
  } = useTopPageWorkspace();

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

  return (
    <TopPage
      viewModel={viewModel}
      isBusy={isPending}
      onStartNewChat={startNewChat}
      onSelectChat={selectChat}
      onDeleteChat={deleteChat}
      onDrawerOpenChange={setDrawerOpen}
    />
  );
}
