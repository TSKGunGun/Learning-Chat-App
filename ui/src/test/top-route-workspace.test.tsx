import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { TopPageWorkspaceState } from "@/application/use-cases/load-top-page-workspace-use-case";
import { container } from "@/di/container";
import { AppRoutes } from "@/framework/routes/AppRoutes";

const createWorkspace = (
  overrides: Partial<TopPageWorkspaceState> = {}
): TopPageWorkspaceState => ({
  channels: [
    {
      id: "channel-1",
      name: "週次ふり返り",
      lastMessagedAt: "2026-05-28T09:45:00.000Z",
    },
    {
      id: "channel-2",
      name: "次の会話",
      lastMessagedAt: "2026-05-27T09:30:00.000Z",
    },
  ],
  selection: {
    type: "existing",
    channelId: "channel-1",
  },
  activeChat: {
    channelId: "channel-1",
    channelName: "週次ふり返り",
    lastMessagedAt: "2026-05-28T09:45:00.000Z",
    messages: [
      {
        id: "message-1",
        senderType: "user",
        body: "先週の学習内容を整理してください。",
        status: "completed",
        aiFeedback: null,
      },
    ],
  },
  ...overrides,
});

describe("TopRoute workspace behavior", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("shows the most recent chat from the real in-memory workspace by default", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(null, { status: 501 }))
    );

    render(
      <MemoryRouter initialEntries={["/"]}>
        <AppRoutes />
      </MemoryRouter>
    );

    expect(
      await screen.findByRole("heading", { name: "自己学習ルールの整理" })
    ).toBeInTheDocument();
  });

  it("falls back to the draft pane when no chats exist", async () => {
    vi.spyOn(
      container.authenticationController,
      "requireAuthenticatedSession"
    ).mockResolvedValue();
    vi.spyOn(container.topPageController, "load").mockResolvedValue({
      channels: [],
      selection: { type: "new" },
      activeChat: null,
    });

    render(
      <MemoryRouter initialEntries={["/"]}>
        <AppRoutes />
      </MemoryRouter>
    );

    expect(
      await screen.findByRole("heading", { name: "新規チャット" })
    ).toBeInTheDocument();
    expect(screen.getByText("保存済みチャットはまだありません。")).toBeInTheDocument();
  });

  it("switches to the next available chat when the selected one is deleted", async () => {
    const user = userEvent.setup();

    vi.spyOn(
      container.authenticationController,
      "requireAuthenticatedSession"
    ).mockResolvedValue();
    vi.spyOn(container.topPageController, "load").mockResolvedValue(createWorkspace());
    vi.spyOn(container.topPageController, "deleteChat").mockResolvedValue(
      createWorkspace({
        channels: [
          {
            id: "channel-2",
            name: "次の会話",
            lastMessagedAt: "2026-05-27T09:30:00.000Z",
          },
        ],
        selection: {
          type: "existing",
          channelId: "channel-2",
        },
        activeChat: {
          channelId: "channel-2",
          channelName: "次の会話",
          lastMessagedAt: "2026-05-27T09:30:00.000Z",
          messages: [],
        },
      })
    );

    render(
      <MemoryRouter initialEntries={["/"]}>
        <AppRoutes />
      </MemoryRouter>
    );

    expect(
      await screen.findByRole("heading", { name: "週次ふり返り" })
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "週次ふり返りを削除" }));

    expect(
      await screen.findByRole("heading", { name: "次の会話" })
    ).toBeInTheDocument();
  });

  it("keeps the active pane when deleting a non-selected chat", async () => {
    const user = userEvent.setup();

    vi.spyOn(
      container.authenticationController,
      "requireAuthenticatedSession"
    ).mockResolvedValue();
    vi.spyOn(container.topPageController, "load").mockResolvedValue(createWorkspace());
    vi.spyOn(container.topPageController, "deleteChat").mockResolvedValue(
      createWorkspace({
        channels: [
          {
            id: "channel-1",
            name: "週次ふり返り",
            lastMessagedAt: "2026-05-28T09:45:00.000Z",
          },
        ],
      })
    );

    render(
      <MemoryRouter initialEntries={["/"]}>
        <AppRoutes />
      </MemoryRouter>
    );

    expect(
      await screen.findByRole("heading", { name: "週次ふり返り" })
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "次の会話を削除" }));

    expect(
      await screen.findByRole("heading", { name: "週次ふり返り" })
    ).toBeInTheDocument();
    expect(screen.queryByText("次の会話")).not.toBeInTheDocument();
  });

  it("opens the mobile drawer and closes it after selecting a chat", async () => {
    const user = userEvent.setup();

    vi.spyOn(
      container.authenticationController,
      "requireAuthenticatedSession"
    ).mockResolvedValue();
    vi.spyOn(container.topPageController, "load").mockResolvedValue({
      channels: [
        {
          id: "channel-1",
          name: "週次ふり返り",
          lastMessagedAt: "2026-05-28T09:45:00.000Z",
        },
      ],
      selection: { type: "new" },
      activeChat: null,
    });
    const openChatSpy = vi
      .spyOn(container.topPageController, "openChat")
      .mockResolvedValue(createWorkspace());

    render(
      <MemoryRouter initialEntries={["/"]}>
        <AppRoutes />
      </MemoryRouter>
    );

    expect(
      await screen.findByRole("heading", { name: "新規チャット" })
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "チャット一覧を開く" }));

    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByText("週次ふり返り"));

    await waitFor(() => {
      expect(openChatSpy).toHaveBeenCalledWith("channel-1");
    });
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });
});
