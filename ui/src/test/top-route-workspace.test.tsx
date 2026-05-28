import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { TopPageWorkspaceState } from "@/application/use-cases/load-top-page-workspace-use-case";
import { container } from "@/di/container";
import { AppRoutes } from "@/framework/routes/AppRoutes";

const createJsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json",
    },
  });

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

  it("loads the most recent chat from the API by default", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(createJsonResponse([]))
        .mockResolvedValueOnce(
          createJsonResponse([
            {
              channel_id: "channel-1",
              channel_name: "自己学習ルールの整理",
              last_messaged_at: "2026-05-28T09:45:00.000Z",
            },
            {
              channel_id: "channel-2",
              channel_name: "トップ画面 2 ペイン構成",
              last_messaged_at: "2026-05-27T12:15:00.000Z",
            },
          ])
        )
        .mockResolvedValueOnce(
          createJsonResponse({
            channel_id: "channel-1",
            channel_name: "自己学習ルールの整理",
            last_messaged_at: "2026-05-28T09:45:00.000Z",
            messages: [
              {
                message_id: "message-1",
                sender_type: "user",
                message_text: "訂正ルールの見直し観点を整理したいです。",
                status: "completed",
                ai_feedback: null,
              },
            ],
          })
        )
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

  it("loads chat detail from the API when selecting another chat", async () => {
    const user = userEvent.setup();

    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(createJsonResponse([]))
        .mockResolvedValueOnce(
          createJsonResponse([
            {
              channel_id: "channel-1",
              channel_name: "自己学習ルールの整理",
              last_messaged_at: "2026-05-28T09:45:00.000Z",
            },
            {
              channel_id: "channel-2",
              channel_name: "トップ画面 2 ペイン構成",
              last_messaged_at: "2026-05-27T12:15:00.000Z",
            },
          ])
        )
        .mockResolvedValueOnce(
          createJsonResponse({
            channel_id: "channel-1",
            channel_name: "自己学習ルールの整理",
            last_messaged_at: "2026-05-28T09:45:00.000Z",
            messages: [],
          })
        )
        .mockResolvedValueOnce(
          createJsonResponse({
            channel_id: "channel-2",
            channel_name: "トップ画面 2 ペイン構成",
            last_messaged_at: "2026-05-27T12:15:00.000Z",
            messages: [
              {
                message_id: "message-2",
                sender_type: "ai",
                message_text:
                  "一覧操作を優先しつつ、モバイルではドロワー型サイドバーへ切り替えます。",
                status: "completed",
                ai_feedback: false,
              },
            ],
          })
        )
        .mockResolvedValueOnce(
          createJsonResponse([
            {
              channel_id: "channel-1",
              channel_name: "自己学習ルールの整理",
              last_messaged_at: "2026-05-28T09:45:00.000Z",
            },
            {
              channel_id: "channel-2",
              channel_name: "トップ画面 2 ペイン構成",
              last_messaged_at: "2026-05-27T12:15:00.000Z",
            },
          ])
        )
    );

    render(
      <MemoryRouter initialEntries={["/"]}>
        <AppRoutes />
      </MemoryRouter>
    );

    expect(
      await screen.findByRole("heading", { name: "自己学習ルールの整理" })
    ).toBeInTheDocument();

    await user.click(screen.getByText("トップ画面 2 ペイン構成"));

    expect(
      await screen.findByRole("heading", { name: "トップ画面 2 ペイン構成" })
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "一覧操作を優先しつつ、モバイルではドロワー型サイドバーへ切り替えます。"
      )
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
