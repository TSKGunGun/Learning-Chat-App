import { useEffect, useRef, useState } from "react";

import type { TopPageWorkspaceState } from "@/application/use-cases/load-top-page-workspace-use-case";
import type { ChatDetail } from "@/entities/chat/chat-detail";
import { container } from "@/di/container";
import type { TopPageViewModel } from "@/interface-adapters/view-models/view-models";
import { UnauthorizedRequestError } from "@/shared/errors/request-errors";

const POLLING_INTERVAL_MS = 1000;

interface UseTopPageWorkspaceResult {
  readonly error: unknown;
  readonly hasError: boolean;
  readonly isLoading: boolean;
  readonly isPending: boolean;
  readonly viewModel: TopPageViewModel | null;
  readonly startNewChat: () => void;
  readonly selectChat: (channelId: string) => void;
  readonly deleteChat: (channelId: string) => void;
  readonly submitMessage: () => void;
  readonly updateComposerText: (nextValue: string) => void;
  readonly setDrawerOpen: (open: boolean) => void;
}

interface SyncChatDetailOptions {
  readonly channelId: string;
  readonly errorMessage: string;
  readonly refreshChannelsOnSettled: boolean;
  readonly sequence: number;
}

const hasPendingAiMessage = (chatDetail: ChatDetail | null): boolean =>
  (chatDetail?.messages ?? []).some(
    (message) => message.senderType === "ai" && message.status === "pending"
  );

const readErrorMessage = (
  error: unknown,
  fallbackMessage: string
): string => {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return fallbackMessage;
};

export function useTopPageWorkspace(): UseTopPageWorkspaceResult {
  const [workspace, setWorkspace] = useState<TopPageWorkspaceState | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isWorkspaceMutating, setIsWorkspaceMutating] = useState(false);
  const [composerText, setComposerText] = useState("");
  const [composerErrorMessage, setComposerErrorMessage] = useState<string | null>(
    null
  );
  const [isSubmittingMessage, setIsSubmittingMessage] = useState(false);
  const isActiveRef = useRef(true);
  const workspaceRef = useRef<TopPageWorkspaceState | null>(null);
  const workspaceSequenceRef = useRef(0);
  const pollingChannelIdRef = useRef<string | null>(null);
  const pollingTimerRef = useRef<ReturnType<typeof globalThis.setInterval> | null>(
    null
  );
  const syncChatDetailRef = useRef<
    (options: SyncChatDetailOptions) => Promise<void>
  >(
    async (...args: [SyncChatDetailOptions]): Promise<void> => {
      void args;
    }
  );

  const commitWorkspace = (nextWorkspace: TopPageWorkspaceState) => {
    workspaceRef.current = nextWorkspace;
    setWorkspace(nextWorkspace);
  };

  const updateWorkspaceState = (
    updater: (currentWorkspace: TopPageWorkspaceState) => TopPageWorkspaceState
  ) => {
    setWorkspace((currentWorkspace) => {
      if (currentWorkspace === null) {
        return currentWorkspace;
      }

      const nextWorkspace = updater(currentWorkspace);
      workspaceRef.current = nextWorkspace;
      return nextWorkspace;
    });
  };

  const stopPolling = () => {
    if (pollingTimerRef.current !== null) {
      globalThis.clearInterval(pollingTimerRef.current);
      pollingTimerRef.current = null;
    }

    pollingChannelIdRef.current = null;
  };

  const promoteToRouteError = (nextError: unknown) => {
    stopPolling();
    setComposerErrorMessage(null);
    setError(nextError);
    setHasError(true);
  };

  const reportInlineError = (nextError: unknown, fallbackMessage: string) => {
    if (nextError instanceof UnauthorizedRequestError) {
      promoteToRouteError(nextError);
      return;
    }

    setComposerErrorMessage(readErrorMessage(nextError, fallbackMessage));
  };

  const refreshChannelsInPlace = async (
    sequence: number,
    fallbackMessage: string
  ) => {
    try {
      const channels = await container.topPageController.refreshChannels();

      if (!isActiveRef.current || sequence !== workspaceSequenceRef.current) {
        return;
      }

      updateWorkspaceState((currentWorkspace) => ({
        ...currentWorkspace,
        channels,
      }));
    } catch (nextError) {
      if (!isActiveRef.current || sequence !== workspaceSequenceRef.current) {
        return;
      }

      reportInlineError(nextError, fallbackMessage);
    }
  };

  syncChatDetailRef.current = async ({
    channelId,
    errorMessage,
    refreshChannelsOnSettled,
    sequence,
  }: SyncChatDetailOptions) => {
    try {
      const activeChat = await container.topPageController.refreshChatDetail(channelId);

      if (!isActiveRef.current || sequence !== workspaceSequenceRef.current) {
        return;
      }

      const currentWorkspace = workspaceRef.current;

      if (
        currentWorkspace === null ||
        currentWorkspace.selection.type !== "existing" ||
        currentWorkspace.selection.channelId !== channelId
      ) {
        return;
      }

      commitWorkspace({
        ...currentWorkspace,
        activeChat,
      });
      setComposerErrorMessage(null);

      if (!hasPendingAiMessage(activeChat)) {
        stopPolling();

        if (refreshChannelsOnSettled) {
          void refreshChannelsInPlace(
            sequence,
            "チャット一覧の更新に失敗しました。"
          );
        }
      }
    } catch (nextError) {
      if (!isActiveRef.current || sequence !== workspaceSequenceRef.current) {
        return;
      }

      stopPolling();
      reportInlineError(nextError, errorMessage);
    }
  };

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

        commitWorkspace(nextWorkspace);
        setComposerErrorMessage(null);
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
      stopPolling();
    };
  }, []);

  useEffect(() => {
    if (
      workspace === null ||
      workspace.selection.type !== "existing" ||
      workspace.activeChat === null ||
      !hasPendingAiMessage(workspace.activeChat)
    ) {
      stopPolling();
      return;
    }

    if (
      pollingChannelIdRef.current === workspace.selection.channelId &&
      pollingTimerRef.current !== null
    ) {
      return;
    }

    stopPolling();

    const channelId = workspace.selection.channelId;
    const sequence = workspaceSequenceRef.current;

    pollingChannelIdRef.current = channelId;
    pollingTimerRef.current = globalThis.setInterval(() => {
      void syncChatDetailRef.current({
        channelId,
        errorMessage: "チャット履歴の更新に失敗しました。",
        refreshChannelsOnSettled: true,
        sequence,
      });
    }, POLLING_INTERVAL_MS);
  }, [workspace]);

  const updateWorkspace = (
    updater: (
      currentWorkspace: TopPageWorkspaceState
    ) => Promise<TopPageWorkspaceState> | TopPageWorkspaceState
  ) => {
    const currentWorkspace = workspaceRef.current;

    if (currentWorkspace === null) {
      return;
    }

    stopPolling();
    setComposerErrorMessage(null);
    const sequence = workspaceSequenceRef.current + 1;
    workspaceSequenceRef.current = sequence;
    setIsWorkspaceMutating(true);

    void (async () => {
      try {
        const nextWorkspace = await updater(currentWorkspace);

        if (!isActiveRef.current || sequence !== workspaceSequenceRef.current) {
          return;
        }

        commitWorkspace(nextWorkspace);
        setError(null);
        setHasError(false);
      } catch (nextError) {
        if (!isActiveRef.current || sequence !== workspaceSequenceRef.current) {
          return;
        }

        promoteToRouteError(nextError);
      } finally {
        if (isActiveRef.current && sequence === workspaceSequenceRef.current) {
          setIsWorkspaceMutating(false);
        }
      }
    })();
  };

  const submitMessage = () => {
    const currentWorkspace = workspaceRef.current;
    const trimmedMessage = composerText.trim();

    if (currentWorkspace === null || trimmedMessage.length === 0) {
      return;
    }

    setIsSubmittingMessage(true);
    setComposerErrorMessage(null);
    const sequence = workspaceSequenceRef.current;

    void (async () => {
      try {
        const nextWorkspace = await container.topPageController.submitMessage(
          currentWorkspace,
          trimmedMessage
        );

        if (!isActiveRef.current || sequence !== workspaceSequenceRef.current) {
          return;
        }

        commitWorkspace(nextWorkspace);
        setComposerText("");
        setError(null);
        setHasError(false);

        void refreshChannelsInPlace(sequence, "チャット一覧の更新に失敗しました。");

        if (nextWorkspace.selection.type === "existing") {
          await syncChatDetailRef.current({
            channelId: nextWorkspace.selection.channelId,
            errorMessage: "チャット履歴の更新に失敗しました。",
            refreshChannelsOnSettled: true,
            sequence,
          });
        }
      } catch (nextError) {
        if (!isActiveRef.current || sequence !== workspaceSequenceRef.current) {
          return;
        }

        reportInlineError(nextError, "メッセージの送信に失敗しました。");
      } finally {
        if (isActiveRef.current && sequence === workspaceSequenceRef.current) {
          setIsSubmittingMessage(false);
        }
      }
    })();
  };

  return {
    error,
    hasError,
    isLoading,
    isPending: isWorkspaceMutating,
    viewModel:
      workspace === null
        ? null
        : container.topPageController.present(workspace, {
            composerText,
            composerErrorMessage,
            isDrawerOpen,
            isSubmittingMessage,
          }),
    startNewChat: () => {
      setIsDrawerOpen(false);
      setComposerText("");
      updateWorkspace((currentWorkspace) => {
        return container.topPageController.startNewChat(currentWorkspace);
      });
    },
    selectChat: (channelId: string) => {
      setIsDrawerOpen(false);
      setComposerText("");
      updateWorkspace(async () => {
        return container.topPageController.openChat(channelId);
      });
    },
    deleteChat: (channelId: string) => {
      setIsDrawerOpen(false);
      setComposerText("");
      updateWorkspace((currentWorkspace) => {
        return container.topPageController.deleteChat(currentWorkspace, channelId);
      });
    },
    submitMessage,
    updateComposerText: (nextValue: string) => {
      setComposerText(nextValue);
      if (composerErrorMessage !== null) {
        setComposerErrorMessage(null);
      }
    },
    setDrawerOpen: setIsDrawerOpen,
  };
}
