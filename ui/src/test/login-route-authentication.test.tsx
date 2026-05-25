import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AppRoutes } from "@/framework/routes/AppRoutes";

describe("LoginRoute authentication flow", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("logs in through the API and navigates to the top route", async () => {
    const user = userEvent.setup();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: "11111111-1111-4111-8111-111111111111",
            username: "scaffold-user",
          }),
          {
            status: 200,
            headers: {
              "content-type": "application/json",
            },
          }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            message: "GET /api/chats is not implemented yet.",
          }),
          {
            status: 501,
            headers: {
              "content-type": "application/json",
            },
          }
        )
      );

    vi.stubGlobal("fetch", fetchMock);

    render(
      <MemoryRouter initialEntries={["/login"]}>
        <AppRoutes />
      </MemoryRouter>
    );

    await user.type(
      await screen.findByLabelText(/ユーザー名/),
      "scaffold-user"
    );
    await user.type(screen.getByLabelText(/パスワード/), "password");
    await user.click(screen.getByRole("button", { name: "ログインする" }));

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "/api/auth/login",
      expect.objectContaining({
        method: "POST",
        credentials: "include",
      })
    );
    expect(
      await screen.findByRole("heading", {
        name: "ChatApp",
      })
    ).toBeInTheDocument();
  });
});
