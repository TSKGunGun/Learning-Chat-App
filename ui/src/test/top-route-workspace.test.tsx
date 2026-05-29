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

const createMessageResponse = (overrides: {
  readonly message_id: string;
  readonly sender_type: "user" | "ai";
  readonly message_text: string | null;
  readonly status: "pending" | "completed" | "ai_timeout";
  readonly ai_feedback: boolean | null;
  readonly created_at: string;
}) => overrides;

const createChatDetailResponse = (overrides: {
  readonly channel_id: string;
  readonly channel_name: string;
  readonly last_messaged_at: string;
  readonly messages: ReadonlyArray<ReturnType<typeof createMessageResponse>>;
}) => overrides;

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
        createdAt: "2026-05-28T09:45:00.000Z",
      },
    ],
  },
  ...overrides,
});

const renderTopRoute = () =>
  render(
    <MemoryRouter initialEntries={["/"]}>
      <AppRoutes />
    </MemoryRouter>
  );

describe("TopRoute workspace behavior", () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("loads the most recent chat from the API by default", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input, init) => {
        const url = typeof input === "string" ? input : input.url;
        const method = init?.method ?? "GET";

        if (method === "GET" && url === "/api/chats") {
          return createJsonResponse([
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
          ]);
        }

        if (method === "GET" && url === "/api/chats/channel-1") {
          return createJsonResponse(
            createChatDetailResponse({
              channel_id: "channel-1",
              channel_name: "自己学習ルールの整理",
              last_messaged_at: "2026-05-28T09:45:00.000Z",
              messages: [
                createMessageResponse({
                  message_id: "message-1",
                  sender_type: "user",
                  message_text: "訂正ルールの見直し観点を整理したいです。",
                  status: "completed",
                  ai_feedback: null,
                  created_at: "2026-05-28T09:45:00.000Z",
                }),
              ],
            })
          );
        }

        throw new Error(`Unhandled request: ${method} ${url}`);
      })
    );

    renderTopRoute();

    expect(
      await screen.findByRole("heading", { name: "自己学習ルールの整理" })
    ).toBeInTheDocument();
  });

  it("loads chat detail from the API when selecting another chat", async () => {
    const user = userEvent.setup();

    vi.stubGlobal(
      "fetch",
      vi.fn(async (input, init) => {
        const url = typeof input === "string" ? input : input.url;
        const method = init?.method ?? "GET";

        if (method === "GET" && url === "/api/chats") {
          return createJsonResponse([
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
          ]);
        }

        if (method === "GET" && url === "/api/chats/channel-1") {
          return createJsonResponse(
            createChatDetailResponse({
              channel_id: "channel-1",
              channel_name: "自己学習ルールの整理",
              last_messaged_at: "2026-05-28T09:45:00.000Z",
              messages: [],
            })
          );
        }

        if (method === "GET" && url === "/api/chats/channel-2") {
          return createJsonResponse(
            createChatDetailResponse({
              channel_id: "channel-2",
              channel_name: "トップ画面 2 ペイン構成",
              last_messaged_at: "2026-05-27T12:15:00.000Z",
              messages: [
                createMessageResponse({
                  message_id: "message-2",
                  sender_type: "ai",
                  message_text:
                    "一覧操作を優先しつつ、モバイルではドロワー型サイドバーへ切り替えます。",
                  status: "completed",
                  ai_feedback: false,
                  created_at: "2026-05-27T12:15:00.000Z",
                }),
              ],
            })
          );
        }

        throw new Error(`Unhandled request: ${method} ${url}`);
      })
    );

    renderTopRoute();

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

    renderTopRoute();

    expect(
      await screen.findByRole("heading", { name: "新規チャット" })
    ).toBeInTheDocument();
    expect(screen.getByText("保存済みチャットはまだありません。")).toBeInTheDocument();
  });

  it("reflects the first message immediately and then shows the pending ai response", async () => {
    const user = userEvent.setup();
    let createdChat = false;

    vi.stubGlobal(
      "fetch",
      vi.fn(async (input, init) => {
        const url = typeof input === "string" ? input : input.url;
        const method = init?.method ?? "GET";

        if (method === "GET" && url === "/api/chats") {
          return createJsonResponse(
            createdChat
              ? [
                  {
                    channel_id: "channel-new",
                    channel_name: "新しい会話",
                    last_messaged_at: "2026-05-28T10:01:00.000Z",
                  },
                ]
              : []
          );
        }

        if (method === "POST" && url === "/api/chats") {
          createdChat = true;

          return createJsonResponse({
            channel_id: "channel-new",
            channel_name: "新しい会話",
            message_id: "message-user-1",
            sender_type: "user",
            message_text: "新規チャットで相談したいです。",
            status: "completed",
            created_at: "2026-05-28T10:00:00.000Z",
          });
        }

        if (method === "GET" && url === "/api/chats/channel-new") {
          return createJsonResponse(
            createChatDetailResponse({
              channel_id: "channel-new",
              channel_name: "新しい会話",
              last_messaged_at: "2026-05-28T10:01:00.000Z",
              messages: [
                createMessageResponse({
                  message_id: "message-user-1",
                  sender_type: "user",
                  message_text: "新規チャットで相談したいです。",
                  status: "completed",
                  ai_feedback: null,
                  created_at: "2026-05-28T10:00:00.000Z",
                }),
                createMessageResponse({
                  message_id: "message-ai-1",
                  sender_type: "ai",
                  message_text: null,
                  status: "pending",
                  ai_feedback: null,
                  created_at: "2026-05-28T10:01:00.000Z",
                }),
              ],
            })
          );
        }

        throw new Error(`Unhandled request: ${method} ${url}`);
      })
    );

    renderTopRoute();

    expect(
      await screen.findByRole("heading", { name: "新規チャット" })
    ).toBeInTheDocument();

    await user.type(
      screen.getByRole("textbox", { name: "メッセージ入力" }),
      "新規チャットで相談したいです。"
    );
    await user.click(screen.getByRole("button", { name: "送信" }));

    expect(
      await screen.findByRole("heading", { name: "新しい会話" })
    ).toBeInTheDocument();
    expect(screen.getByText("新規チャットで相談したいです。")).toBeInTheDocument();
    expect((await screen.findAllByText("AI回答生成中")).length).toBeGreaterThan(0);
    expect(screen.getAllByText("新しい会話").length).toBeGreaterThan(0);
  });

  it("appends a new user message, refreshes sidebar data, and shows pending state for an existing chat", async () => {
    const user = userEvent.setup();
    let sentMessage = false;

    vi.stubGlobal(
      "fetch",
      vi.fn(async (input, init) => {
        const url = typeof input === "string" ? input : input.url;
        const method = init?.method ?? "GET";

        if (method === "GET" && url === "/api/chats") {
          return createJsonResponse([
            {
              channel_id: "channel-1",
              channel_name: sentMessage ? "週次ふり返り 更新版" : "週次ふり返り",
              last_messaged_at: sentMessage
                ? "2026-05-28T10:01:00.000Z"
                : "2026-05-28T09:45:00.000Z",
            },
          ]);
        }

        if (method === "GET" && url === "/api/chats/channel-1") {
          return createJsonResponse(
            createChatDetailResponse({
              channel_id: "channel-1",
              channel_name: sentMessage ? "週次ふり返り 更新版" : "週次ふり返り",
              last_messaged_at: sentMessage
                ? "2026-05-28T10:01:00.000Z"
                : "2026-05-28T09:45:00.000Z",
              messages: sentMessage
                ? [
                    createMessageResponse({
                      message_id: "message-1",
                      sender_type: "user",
                      message_text: "先週の学習内容を整理してください。",
                      status: "completed",
                      ai_feedback: null,
                      created_at: "2026-05-28T09:45:00.000Z",
                    }),
                    createMessageResponse({
                      message_id: "message-2",
                      sender_type: "user",
                      message_text: "次の観点も追加してください。",
                      status: "completed",
                      ai_feedback: null,
                      created_at: "2026-05-28T10:00:00.000Z",
                    }),
                    createMessageResponse({
                      message_id: "message-3",
                      sender_type: "ai",
                      message_text: null,
                      status: "pending",
                      ai_feedback: null,
                      created_at: "2026-05-28T10:01:00.000Z",
                    }),
                  ]
                : [
                    createMessageResponse({
                      message_id: "message-1",
                      sender_type: "user",
                      message_text: "先週の学習内容を整理してください。",
                      status: "completed",
                      ai_feedback: null,
                      created_at: "2026-05-28T09:45:00.000Z",
                    }),
                  ],
            })
          );
        }

        if (method === "POST" && url === "/api/chats/channel-1/messages") {
          sentMessage = true;

          return createJsonResponse({
            channel_name: "週次ふり返り 更新版",
            message_id: "message-2",
            sender_type: "user",
            message_text: "次の観点も追加してください。",
            status: "completed",
            created_at: "2026-05-28T10:00:00.000Z",
          });
        }

        throw new Error(`Unhandled request: ${method} ${url}`);
      })
    );

    renderTopRoute();

    expect(
      await screen.findByRole("heading", { name: "週次ふり返り" })
    ).toBeInTheDocument();

    await user.type(
      screen.getByRole("textbox", { name: "メッセージ入力" }),
      "次の観点も追加してください。"
    );
    await user.click(screen.getByRole("button", { name: "送信" }));

    expect(
      await screen.findByRole("heading", { name: "週次ふり返り 更新版" })
    ).toBeInTheDocument();
    expect(screen.getByText("次の観点も追加してください。")).toBeInTheDocument();
    expect((await screen.findAllByText("AI回答生成中")).length).toBeGreaterThan(0);
    expect(screen.getAllByText("週次ふり返り 更新版").length).toBeGreaterThan(0);
  });

  it("starts polling for an opened pending chat and stops after completion", async () => {
    let detailRequestCount = 0;
    const fetchSpy = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input instanceof Request ? input.url : input.toString();
      const method = init?.method ?? "GET";

      if (method === "GET" && url === "/api/chats") {
        return createJsonResponse([
          {
            channel_id: "channel-1",
            channel_name: "AI 応答待ちの確認",
            last_messaged_at: "2026-05-28T10:02:00.000Z",
          },
        ]);
      }

      if (method === "GET" && url === "/api/chats/channel-1") {
        detailRequestCount += 1;

        return createJsonResponse(
          detailRequestCount === 1
            ? createChatDetailResponse({
                channel_id: "channel-1",
                channel_name: "AI 応答待ちの確認",
                last_messaged_at: "2026-05-28T10:01:00.000Z",
                messages: [
                  createMessageResponse({
                    message_id: "message-user-1",
                    sender_type: "user",
                    message_text: "ポーリング対象の見せ方も確認したいです。",
                    status: "completed",
                    ai_feedback: null,
                    created_at: "2026-05-28T10:00:00.000Z",
                  }),
                  createMessageResponse({
                    message_id: "message-ai-1",
                    sender_type: "ai",
                    message_text: null,
                    status: "pending",
                    ai_feedback: null,
                    created_at: "2026-05-28T10:01:00.000Z",
                  }),
                ],
              })
            : createChatDetailResponse({
                channel_id: "channel-1",
                channel_name: "AI 応答待ちの確認",
                last_messaged_at: "2026-05-28T10:02:00.000Z",
                messages: [
                  createMessageResponse({
                    message_id: "message-user-1",
                    sender_type: "user",
                    message_text: "ポーリング対象の見せ方も確認したいです。",
                    status: "completed",
                    ai_feedback: null,
                    created_at: "2026-05-28T10:00:00.000Z",
                  }),
                  createMessageResponse({
                    message_id: "message-ai-1",
                    sender_type: "ai",
                    message_text: "確認ポイントを整理しました。",
                    status: "completed",
                    ai_feedback: null,
                    created_at: "2026-05-28T10:01:00.000Z",
                  }),
                ],
              })
        );
      }

      throw new Error(`Unhandled request: ${method} ${url}`);
    });

    vi.stubGlobal("fetch", fetchSpy);

    renderTopRoute();

    expect(
      await screen.findByRole("heading", { name: "AI 応答待ちの確認" })
    ).toBeInTheDocument();
    expect((await screen.findAllByText("AI回答生成中")).length).toBeGreaterThan(0);

    await waitFor(() => {
      expect(screen.getByText("確認ポイントを整理しました。")).toBeInTheDocument();
    });
    expect(detailRequestCount).toBe(2);

    await new Promise((resolve) => {
      globalThis.setTimeout(resolve, 1200);
    });
    expect(detailRequestCount).toBe(2);
  }, 10000);

  it("stops polling for the previous chat when another chat is selected", async () => {
    const user = userEvent.setup();
    let channelOneDetailCount = 0;

    vi.stubGlobal(
      "fetch",
      vi.fn(async (input, init) => {
        const url = typeof input === "string" ? input : input.url;
        const method = init?.method ?? "GET";

        if (method === "GET" && url === "/api/chats") {
          return createJsonResponse([
            {
              channel_id: "channel-1",
              channel_name: "AI 応答待ちの確認",
              last_messaged_at: "2026-05-28T10:01:00.000Z",
            },
            {
              channel_id: "channel-2",
              channel_name: "完了済みチャット",
              last_messaged_at: "2026-05-27T09:30:00.000Z",
            },
          ]);
        }

        if (method === "GET" && url === "/api/chats/channel-1") {
          channelOneDetailCount += 1;

          return createJsonResponse(
            createChatDetailResponse({
              channel_id: "channel-1",
              channel_name: "AI 応答待ちの確認",
              last_messaged_at: "2026-05-28T10:01:00.000Z",
              messages: [
                createMessageResponse({
                  message_id: "message-user-1",
                  sender_type: "user",
                  message_text: "ポーリング対象の見せ方も確認したいです。",
                  status: "completed",
                  ai_feedback: null,
                  created_at: "2026-05-28T10:00:00.000Z",
                }),
                createMessageResponse({
                  message_id: "message-ai-1",
                  sender_type: "ai",
                  message_text: null,
                  status: "pending",
                  ai_feedback: null,
                  created_at: "2026-05-28T10:01:00.000Z",
                }),
              ],
            })
          );
        }

        if (method === "GET" && url === "/api/chats/channel-2") {
          return createJsonResponse(
            createChatDetailResponse({
              channel_id: "channel-2",
              channel_name: "完了済みチャット",
              last_messaged_at: "2026-05-27T09:30:00.000Z",
              messages: [
                createMessageResponse({
                  message_id: "message-user-2",
                  sender_type: "user",
                  message_text: "完了済みの内容です。",
                  status: "completed",
                  ai_feedback: null,
                  created_at: "2026-05-27T09:29:00.000Z",
                }),
              ],
            })
          );
        }

        throw new Error(`Unhandled request: ${method} ${url}`);
      })
    );

    renderTopRoute();

    expect(
      await screen.findByRole("heading", { name: "AI 応答待ちの確認" })
    ).toBeInTheDocument();

    await user.click(screen.getByText("完了済みチャット"));

    expect(
      await screen.findByRole("heading", { name: "完了済みチャット" })
    ).toBeInTheDocument();

    await new Promise((resolve) => {
      globalThis.setTimeout(resolve, 1200);
    });
    expect(channelOneDetailCount).toBe(1);
  }, 10000);

  it("renders the ai timeout message after polling updates the response", async () => {
    let detailRequestCount = 0;

    vi.stubGlobal(
      "fetch",
      vi.fn(async (input, init) => {
        const url = typeof input === "string" ? input : input.url;
        const method = init?.method ?? "GET";

        if (method === "GET" && url === "/api/chats") {
          return createJsonResponse([
            {
              channel_id: "channel-1",
              channel_name: "AI 応答待ちの確認",
              last_messaged_at: "2026-05-28T10:02:00.000Z",
            },
          ]);
        }

        if (method === "GET" && url === "/api/chats/channel-1") {
          detailRequestCount += 1;

          return createJsonResponse(
            detailRequestCount === 1
              ? createChatDetailResponse({
                  channel_id: "channel-1",
                  channel_name: "AI 応答待ちの確認",
                  last_messaged_at: "2026-05-28T10:01:00.000Z",
                  messages: [
                    createMessageResponse({
                      message_id: "message-user-1",
                      sender_type: "user",
                      message_text: "ポーリング対象の見せ方も確認したいです。",
                      status: "completed",
                      ai_feedback: null,
                      created_at: "2026-05-28T10:00:00.000Z",
                    }),
                    createMessageResponse({
                      message_id: "message-ai-1",
                      sender_type: "ai",
                      message_text: null,
                      status: "pending",
                      ai_feedback: null,
                      created_at: "2026-05-28T10:01:00.000Z",
                    }),
                  ],
                })
              : createChatDetailResponse({
                  channel_id: "channel-1",
                  channel_name: "AI 応答待ちの確認",
                  last_messaged_at: "2026-05-28T10:02:00.000Z",
                  messages: [
                    createMessageResponse({
                      message_id: "message-user-1",
                      sender_type: "user",
                      message_text: "ポーリング対象の見せ方も確認したいです。",
                      status: "completed",
                      ai_feedback: null,
                      created_at: "2026-05-28T10:00:00.000Z",
                    }),
                    createMessageResponse({
                      message_id: "message-ai-1",
                      sender_type: "ai",
                      message_text: "AI応答がありません",
                      status: "ai_timeout",
                      ai_feedback: null,
                      created_at: "2026-05-28T10:01:00.000Z",
                    }),
                  ],
                })
          );
        }

        throw new Error(`Unhandled request: ${method} ${url}`);
      })
    );

    renderTopRoute();

    expect((await screen.findAllByText("AI回答生成中")).length).toBeGreaterThan(0);

    await waitFor(() => {
      expect(screen.getAllByText("AI応答がありません").length).toBeGreaterThan(0);
    });
  }, 10000);

  it("shows an inline error and keeps the current chat when message sending fails", async () => {
    const user = userEvent.setup();

    vi.stubGlobal(
      "fetch",
      vi.fn(async (input, init) => {
        const url = typeof input === "string" ? input : input.url;
        const method = init?.method ?? "GET";

        if (method === "GET" && url === "/api/chats") {
          return createJsonResponse([
            {
              channel_id: "channel-1",
              channel_name: "週次ふり返り",
              last_messaged_at: "2026-05-28T09:45:00.000Z",
            },
          ]);
        }

        if (method === "GET" && url === "/api/chats/channel-1") {
          return createJsonResponse(
            createChatDetailResponse({
              channel_id: "channel-1",
              channel_name: "週次ふり返り",
              last_messaged_at: "2026-05-28T09:45:00.000Z",
              messages: [
                createMessageResponse({
                  message_id: "message-1",
                  sender_type: "user",
                  message_text: "先週の学習内容を整理してください。",
                  status: "completed",
                  ai_feedback: null,
                  created_at: "2026-05-28T09:45:00.000Z",
                }),
              ],
            })
          );
        }

        if (method === "POST" && url === "/api/chats/channel-1/messages") {
          return createJsonResponse(
            {
              message: "Pending AI response already exists.",
            },
            422
          );
        }

        throw new Error(`Unhandled request: ${method} ${url}`);
      })
    );

    renderTopRoute();

    expect(
      await screen.findByRole("heading", { name: "週次ふり返り" })
    ).toBeInTheDocument();

    await user.type(
      screen.getByRole("textbox", { name: "メッセージ入力" }),
      "次の観点も追加してください。"
    );
    await user.click(screen.getByRole("button", { name: "送信" }));

    expect(
      await screen.findByRole("heading", { name: "週次ふり返り" })
    ).toBeInTheDocument();
    expect(
      screen.getByText("先週の学習内容を整理してください。")
    ).toBeInTheDocument();
    expect(
      await screen.findByRole("alert")
    ).toHaveTextContent("Pending AI response already exists.");
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

    renderTopRoute();

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

    renderTopRoute();

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

    renderTopRoute();

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
