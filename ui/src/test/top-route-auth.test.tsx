import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AppRoutes } from "@/framework/routes/AppRoutes";

const createJsonResponse = (
  status: number,
  body: unknown,
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

  it("renders API-backed chat content when the session is accepted", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(createJsonResponse(200, []))
        .mockResolvedValueOnce(
          createJsonResponse(200, [
            {
              channel_id: "channel-1",
              channel_name: "自己学習ルールの整理",
              last_messaged_at: "2026-05-28T09:45:00.000Z",
            },
          ])
        )
        .mockResolvedValueOnce(
          createJsonResponse(200, {
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
  });
});
