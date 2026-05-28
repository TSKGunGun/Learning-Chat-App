import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import { AppRoutes } from "@/framework/routes/AppRoutes";

const createJsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json",
    },
  });

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("AppRoutes", () => {
  it("renders the top route with API-backed chat data", async () => {
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
    );

    render(
      <MemoryRouter initialEntries={["/"]}>
        <AppRoutes />
      </MemoryRouter>
    );

    expect(
      await screen.findByRole("heading", {
        name: "自己学習ルールの整理",
      })
    ).toBeInTheDocument();
    expect(screen.getByText("新規チャットを開始")).toBeInTheDocument();
  });

  it("renders the login route placeholder", async () => {
    render(
      <MemoryRouter initialEntries={["/login"]}>
        <AppRoutes />
      </MemoryRouter>
    );

    expect(
      await screen.findByRole("heading", {
        name: "ログイン",
      })
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/ユーザー名/)).toBeInTheDocument();
    expect(screen.getByLabelText(/パスワード/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "ログインする" })).toBeDisabled();
  });

  it("renders the not found route for unknown paths", () => {
    render(
      <MemoryRouter initialEntries={["/unknown"]}>
        <AppRoutes />
      </MemoryRouter>
    );

    expect(
      screen.getByRole("heading", { name: "ページが見つかりません" })
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "トップ画面へ戻る" })).toBeInTheDocument();
  });
});
