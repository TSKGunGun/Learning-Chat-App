import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import { AppRoutes } from "@/framework/routes/AppRoutes";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("AppRoutes", () => {
  it("renders the top route placeholder", async () => {
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
      await screen.findByRole("heading", {
        name: "ChatApp",
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
