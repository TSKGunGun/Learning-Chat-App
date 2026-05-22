import { app } from "@/app";
import { OPENAPI_SOURCE_PATH } from "@/shared/contracts/openapi-source";

const VALID_CHANNEL_ID = "22222222-2222-4222-8222-222222222222";
const VALID_MESSAGE_ID = "33333333-3333-4333-8333-333333333333";
const AUTH_COOKIE = "session=scaffold-session";

describe("API scaffold app", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("exposes the Hono app entrypoint", async () => {
    const response = await app.request("http://localhost/");

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      message: "Learning Chat API scaffold is running.",
    });
  });

  it("returns 501 for the login scaffold endpoint", async () => {
    const response = await app.request("http://localhost/api/auth/login", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        username: "scaffold-user",
        password: "password",
      }),
    });

    expect(response.status).toBe(501);
    await expect(response.json()).resolves.toEqual({
      message: "POST /api/auth/login is not implemented yet.",
    });
  });

  it("returns 400 when the request body is invalid JSON", async () => {
    const response = await app.request("http://localhost/api/auth/login", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: "{invalid-json",
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      message: "Request body must be valid JSON.",
    });
  });

  it.each([
    ["GET", "http://localhost/api/chats", undefined],
    [
      "POST",
      "http://localhost/api/chats",
      JSON.stringify({ message_text: "hello scaffold" }),
    ],
    ["GET", `http://localhost/api/chats/${VALID_CHANNEL_ID}`, undefined],
    ["DELETE", `http://localhost/api/chats/${VALID_CHANNEL_ID}`, undefined],
    [
      "POST",
      `http://localhost/api/chats/${VALID_CHANNEL_ID}/messages`,
      JSON.stringify({ message_text: "hello scaffold" }),
    ],
    [
      "POST",
      `http://localhost/api/chats/${VALID_CHANNEL_ID}/messages/${VALID_MESSAGE_ID}/feedback`,
      JSON.stringify({ ai_feedback: true }),
    ],
  ])(
    "rejects unauthenticated access for %s %s",
    async (method, url, body) => {
      const response = await app.request(url, {
        method,
        headers:
          body === undefined
            ? undefined
            : {
                "content-type": "application/json",
              },
        body,
      });

      expect(response.status).toBe(401);
      await expect(response.json()).resolves.toEqual({
        message: "Authentication is required.",
      });
    }
  );

  it("returns 400 when ai_feedback is not a boolean", async () => {
    const response = await app.request(
      `http://localhost/api/chats/${VALID_CHANNEL_ID}/messages/${VALID_MESSAGE_ID}/feedback`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: AUTH_COOKIE,
        },
        body: JSON.stringify({ ai_feedback: "true" }),
      }
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      message: "ai_feedback must be a boolean.",
    });
  });

  it("does not accept the scaffold session token in production", async () => {
    vi.stubEnv("NODE_ENV", "production");

    const response = await app.request("http://localhost/api/chats", {
      method: "GET",
      headers: {
        cookie: AUTH_COOKIE,
      },
    });

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      message: "Authentication is required.",
    });
  });

  it.each([
    ["GET", "http://localhost/api/chats", undefined, 501],
    [
      "POST",
      "http://localhost/api/chats",
      JSON.stringify({ message_text: "hello scaffold" }),
      501,
    ],
    ["GET", `http://localhost/api/chats/${VALID_CHANNEL_ID}`, undefined, 501],
    ["DELETE", `http://localhost/api/chats/${VALID_CHANNEL_ID}`, undefined, 501],
    [
      "POST",
      `http://localhost/api/chats/${VALID_CHANNEL_ID}/messages`,
      JSON.stringify({ message_text: "hello scaffold" }),
      501,
    ],
    [
      "POST",
      `http://localhost/api/chats/${VALID_CHANNEL_ID}/messages/${VALID_MESSAGE_ID}/feedback`,
      JSON.stringify({ ai_feedback: true }),
      501,
    ],
  ])(
    "returns scaffold 501 for authenticated %s %s",
    async (method, url, body, expectedStatus) => {
      const response = await app.request(url, {
        method,
        headers: {
          ...(body === undefined ? {} : { "content-type": "application/json" }),
          cookie: AUTH_COOKIE,
        },
        body,
      });

      expect(response.status).toBe(expectedStatus);
      await expect(response.json()).resolves.toMatchObject({
        message: expect.stringContaining("is not implemented yet."),
      });
    }
  );

  it("keeps the OpenAPI source path inside docs", () => {
    expect(OPENAPI_SOURCE_PATH).toContain("docs/specs/api/openapi/openapi.yaml");
  });
});
