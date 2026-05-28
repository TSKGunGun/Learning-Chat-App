import { useEffect, useRef, useState } from "react";

import type { TopPageWorkspaceState } from "@/application/use-cases/load-top-page-workspace-use-case";
import { container } from "@/di/container";
import type { TopPageViewModel } from "@/interface-adapters/view-models/view-models";

interface UseTopPageWorkspaceResult {
  readonly error: unknown;
  readonly hasError: boolean;
  readonly isLoading: boolean;
  readonly isPending: boolean;
  readonly viewModel: TopPageViewModel | null;
  readonly startNewChat: () => void;
  readonly selectChat: (channelId: string) => void;
  readonly deleteChat: (channelId: string) => void;
  readonly setDrawerOpen: (open: boolean) => void;
}

export function useTopPageWorkspace(): UseTopPageWorkspaceResult {
  const [workspace, setWorkspace] = useState<TopPageWorkspaceState | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isMutating, setIsMutating] = useState(false);
  const isActiveRef = useRef(true);

  useEffect(() => {
    isActiveRef.current = true;

    const load = async () => {
      setHasError(false);
      setIsLoading(true);

      try {
        setError(null);
        await container.authenticationController.requireAuthenticatedSession();
        const nextWorkspace = await container.topPageController.load();

        if (!isActiveRef.current) {
          return;
        }

        setWorkspace(nextWorkspace);
        setIsLoading(false);
      } catch (nextError) {
        if (!isActiveRef.current) {
          return;
        }

        setError(nextError);
        setHasError(true);
        setIsLoading(false);
      }
    };

    void load();

    return () => {
      isActiveRef.current = false;
    };
  }, []);

  const updateWorkspace = (
    updater: (
      currentWorkspace: TopPageWorkspaceState
    ) => Promise<TopPageWorkspaceState> | TopPageWorkspaceState
  ) => {
    if (workspace === null) {
      return;
    }

    setIsMutating(true);

    void (async () => {
      try {
        const nextWorkspace = await updater(workspace);

        if (!isActiveRef.current) {
          return;
        }

        setWorkspace(nextWorkspace);
        setError(null);
        setHasError(false);
      } catch (nextError) {
        if (!isActiveRef.current) {
          return;
        }

        setError(nextError);
        setHasError(true);
      } finally {
        if (isActiveRef.current) {
          setIsMutating(false);
        }
      }
    })();
  };

  return {
    error,
    hasError,
    isLoading,
    isPending: isMutating,
    viewModel:
      workspace === null
        ? null
        : container.topPageController.present(workspace, isDrawerOpen),
    startNewChat: () => {
      setIsDrawerOpen(false);
      updateWorkspace((currentWorkspace) => {
        return container.topPageController.startNewChat(currentWorkspace);
      });
    },
    selectChat: (channelId: string) => {
      setIsDrawerOpen(false);
      updateWorkspace(async () => {
        return container.topPageController.openChat(channelId);
      });
    },
    deleteChat: (channelId: string) => {
      setIsDrawerOpen(false);
      updateWorkspace((currentWorkspace) => {
        return container.topPageController.deleteChat(currentWorkspace, channelId);
      });
    },
    setDrawerOpen: setIsDrawerOpen,
  };
}
