import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AppRoutes } from "@/framework/routes/AppRoutes";

const createJsonResponse = (
  status: number,
  body: Record<string, string>,
  contentType = "application/json"
) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": contentType,
    },
  });

describe("TopRoute authentication guard", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("redirects unauthenticated users to the login route", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        createJsonResponse(401, {
          message: "Authentication is required.",
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
        name: "ログイン",
      })
    ).toBeInTheDocument();
  });

  it("renders the top page shell when the session is accepted", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        createJsonResponse(501, {
          message: "GET /api/chats is not implemented yet.",
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
        name: "ChatApp",
      })
    ).toBeInTheDocument();
  });
});
