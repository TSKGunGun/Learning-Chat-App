import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";

import { AppRoutes } from "@/app/routes/AppRoutes";

describe("AppRoutes", () => {
  it("renders the top route placeholder", async () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <AppRoutes />
      </MemoryRouter>
    );

    expect(
      await screen.findByRole("heading", {
        name: "自己学習型AIチャットのUIワークスペース",
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
    expect(screen.getByRole("button", { name: "ログインする" })).toBeInTheDocument();
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
