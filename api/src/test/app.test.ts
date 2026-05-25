import crypto from "node:crypto";

import type { AuthenticationUserRecord, UserGateway } from "@/gateways/user-gateway";
import type { SessionGateway } from "@/gateways/session-gateway";
import { BcryptPasswordHasher } from "@/gateways/bcrypt-password-hasher";
import { honoFactory } from "@/hono-factory";
import { registerErrorHandler } from "@/middleware/error-handler";
import { createAuthRoutes } from "@/routes/auth-routes";
import { createChatRoutes } from "@/routes/chat-routes";
import { createMessageRoutes } from "@/routes/message-routes";
import { OPENAPI_SOURCE_PATH } from "@/shared/contracts/openapi-source";
import { CreateChatWithFirstMessageUseCase } from "@/use-cases/create-chat-with-first-message-use-case";
import { DeleteChatByIdUseCase } from "@/use-cases/delete-chat-by-id-use-case";
import { GetChatByIdUseCase } from "@/use-cases/get-chat-by-id-use-case";
import { ListChatsUseCase } from "@/use-cases/list-chats-use-case";
import type { ListChatsQuery } from "@/use-cases/list-chats-use-case";
import { LoginUseCase } from "@/use-cases/login-use-case";
import { SendMessageFeedbackUseCase } from "@/use-cases/send-message-feedback-use-case";
import { SendMessageToChatUseCase } from "@/use-cases/send-message-to-chat-use-case";

const VALID_CHANNEL_ID = "22222222-2222-4222-8222-222222222222";
const VALID_MESSAGE_ID = "33333333-3333-4333-8333-333333333333";
const TEST_PASSWORD = "dev-password";
const TEST_USERNAME = "dev-user";
const TEST_USER_ID = "11111111-1111-4111-8111-111111111111";
const SESSION_TTL_SECONDS = 60 * 60;

interface PersistedSessionRecord {
  readonly sessionTokenHash: string;
  readonly userId: string;
  readonly expiresAt: Date;
  revokedAt: Date | null;
}

interface TestAuthContext {
  readonly loginUseCase: LoginUseCase;
  readonly sessionGateway: TestSessionGateway;
  readonly persistedUsers: Map<string, AuthenticationUserRecord>;
  readonly persistedSessions: PersistedSessionRecord[];
}

const hashSessionToken = (sessionToken: string): string =>
  crypto.createHash("sha256").update(sessionToken).digest("hex");

class TestUserGateway implements UserGateway {
  public constructor(
    private readonly usersByUsername: Map<string, AuthenticationUserRecord>
  ) {}

  public async findByUsername(
    username: string
  ): Promise<AuthenticationUserRecord | null> {
    return this.usersByUsername.get(username) ?? null;
  }
}

class TestSessionGateway implements SessionGateway {
  public constructor(
    private readonly persistedUsers: Map<string, AuthenticationUserRecord>,
    private readonly persistedSessions: PersistedSessionRecord[],
    private readonly sessionTtlSeconds: number
  ) {}

  public async createSession(userId: string): Promise<string> {
    const sessionToken = crypto.randomBytes(32).toString("hex");

    this.persistedSessions.push({
      sessionTokenHash: hashSessionToken(sessionToken),
      userId,
      expiresAt: new Date(Date.now() + this.sessionTtlSeconds * 1_000),
      revokedAt: null,
    });

    return sessionToken;
  }

  public async getAuthenticatedUser(sessionToken: string) {
    const now = new Date();
    const sessionTokenHash = hashSessionToken(sessionToken);
    const activeSession = this.persistedSessions.find(
      (session) =>
        session.sessionTokenHash === sessionTokenHash &&
        session.expiresAt > now &&
        session.revokedAt === null
    );

    if (!activeSession) {
      return null;
    }

    const authenticatedUser = Array.from(this.persistedUsers.values()).find(
      (user) => user.id === activeSession.userId
    );

    if (!authenticatedUser) {
      return null;
    }

    return {
      id: authenticatedUser.id,
      username: authenticatedUser.username,
    };
  }

  public async createExpiredSession(userId: string): Promise<string> {
    const sessionToken = crypto.randomBytes(32).toString("hex");

    this.persistedSessions.push({
      sessionTokenHash: hashSessionToken(sessionToken),
      userId,
      expiresAt: new Date(Date.now() - 60_000),
      revokedAt: null,
    });

    return sessionToken;
  }

  public async createRevokedSession(userId: string): Promise<string> {
    const sessionToken = await this.createSession(userId);
    const persistedSession = this.persistedSessions.at(-1);

    if (persistedSession) {
      persistedSession.revokedAt = new Date();
    }

    return sessionToken;
  }
}

const createApiApp = ({
  loginUseCase,
  sessionGateway,
  listChatsUseCase = new ListChatsUseCase(),
  createChatUseCase = new CreateChatWithFirstMessageUseCase(),
  getChatByIdUseCase = new GetChatByIdUseCase(),
  deleteChatByIdUseCase = new DeleteChatByIdUseCase(),
  sendMessageToChatUseCase = new SendMessageToChatUseCase(),
  sendMessageFeedbackUseCase = new SendMessageFeedbackUseCase(),
}: {
  readonly loginUseCase: LoginUseCase;
  readonly sessionGateway: SessionGateway;
  readonly listChatsUseCase?: ListChatsUseCase;
  readonly createChatUseCase?: CreateChatWithFirstMessageUseCase;
  readonly getChatByIdUseCase?: GetChatByIdUseCase;
  readonly deleteChatByIdUseCase?: DeleteChatByIdUseCase;
  readonly sendMessageToChatUseCase?: SendMessageToChatUseCase;
  readonly sendMessageFeedbackUseCase?: SendMessageFeedbackUseCase;
}) => {
  const app = honoFactory.createApp();

  registerErrorHandler(app);

  app.get("/", (context) => {
    return context.json(
      {
        message: "Learning Chat API scaffold is running.",
      },
      200
    );
  });

  app.route(
    "/",
    createAuthRoutes({
      loginUseCase,
    })
  );
  app.route(
    "/",
    createChatRoutes({
      sessionGateway,
      listChatsUseCase,
      createChatUseCase,
      getChatByIdUseCase,
      deleteChatByIdUseCase,
      sendMessageToChatUseCase,
    })
  );
  app.route(
    "/",
    createMessageRoutes({
      sessionGateway,
      sendMessageFeedbackUseCase,
    })
  );

  return app;
};

const extractSessionToken = (setCookieHeader: string | null): string => {
  const matchedToken = setCookieHeader?.match(/^session=([^;]+)/);

  if (!matchedToken) {
    throw new Error("Expected Set-Cookie to contain a session token.");
  }

  return matchedToken[1];
};

const createAuthTestContext = async (): Promise<TestAuthContext> => {
  const passwordHasher = new BcryptPasswordHasher();
  const persistedUsers = new Map<string, AuthenticationUserRecord>();
  const persistedSessions: PersistedSessionRecord[] = [];
  const userRecord: AuthenticationUserRecord = {
    id: TEST_USER_ID,
    username: TEST_USERNAME,
    passwordHash: await passwordHasher.hash(TEST_PASSWORD),
  };

  persistedUsers.set(TEST_USERNAME, userRecord);

  const sessionGateway = new TestSessionGateway(
    persistedUsers,
    persistedSessions,
    SESSION_TTL_SECONDS
  );

  return {
    persistedUsers,
    persistedSessions,
    sessionGateway,
    loginUseCase: new LoginUseCase({
      userGateway: new TestUserGateway(persistedUsers),
      sessionGateway,
      passwordHasher,
    }),
  };
};

describe("API auth persistence", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("exposes the Hono app entrypoint", async () => {
    const { loginUseCase, sessionGateway } = await createAuthTestContext();
    const app = createApiApp({
      loginUseCase,
      sessionGateway,
    });
    const response = await app.request("http://localhost/");

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      message: "Learning Chat API scaffold is running.",
    });
  });

  it("returns 200 and sets a cookie when login succeeds", async () => {
    const { loginUseCase, sessionGateway } = await createAuthTestContext();
    const app = createApiApp({
      loginUseCase,
      sessionGateway,
    });
    const response = await app.request("http://localhost/api/auth/login", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        username: TEST_USERNAME,
        password: TEST_PASSWORD,
      }),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toContain("session=");
    expect(response.headers.get("set-cookie")).toContain("HttpOnly");
    expect(response.headers.get("set-cookie")).toContain("SameSite=Lax");
    await expect(response.json()).resolves.toEqual({
      id: TEST_USER_ID,
      username: TEST_USERNAME,
    });
  });

  it("sets Secure on the session cookie in production", async () => {
    vi.stubEnv("NODE_ENV", "production");

    const { loginUseCase, sessionGateway } = await createAuthTestContext();
    const app = createApiApp({
      loginUseCase,
      sessionGateway,
    });
    const response = await app.request("http://localhost/api/auth/login", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        username: TEST_USERNAME,
        password: TEST_PASSWORD,
      }),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toContain("Secure");
  });

  it("returns 401 and does not set a cookie when credentials are invalid", async () => {
    const { loginUseCase, sessionGateway } = await createAuthTestContext();
    const app = createApiApp({
      loginUseCase,
      sessionGateway,
    });
    const response = await app.request("http://localhost/api/auth/login", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        username: TEST_USERNAME,
        password: "wrong-password",
      }),
    });

    expect(response.status).toBe(401);
    expect(response.headers.get("set-cookie")).toBeNull();
    await expect(response.json()).resolves.toEqual({
      message: "Invalid username or password.",
    });
  });

  it("returns 400 when the request body is invalid JSON", async () => {
    const { loginUseCase, sessionGateway } = await createAuthTestContext();
    const app = createApiApp({
      loginUseCase,
      sessionGateway,
    });
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

  it("stores only password hashes and session token hashes", async () => {
    const { loginUseCase, persistedSessions, persistedUsers, sessionGateway } =
      await createAuthTestContext();
    const app = createApiApp({
      loginUseCase,
      sessionGateway,
    });
    const response = await app.request("http://localhost/api/auth/login", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        username: TEST_USERNAME,
        password: TEST_PASSWORD,
      }),
    });
    const sessionToken = extractSessionToken(response.headers.get("set-cookie"));
    const persistedUser = persistedUsers.get(TEST_USERNAME);
    const persistedSession = persistedSessions[0];

    expect(persistedUser?.passwordHash).not.toBe(TEST_PASSWORD);
    expect(persistedUser?.passwordHash.startsWith("$2")).toBe(true);
    expect(persistedSession.sessionTokenHash).not.toBe(sessionToken);
    expect(persistedSession.sessionTokenHash).toHaveLength(64);
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
      const { loginUseCase, sessionGateway } = await createAuthTestContext();
      const app = createApiApp({
        loginUseCase,
        sessionGateway,
      });
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

  it("rejects invalid session tokens", async () => {
    const { loginUseCase, sessionGateway } = await createAuthTestContext();
    const app = createApiApp({
      loginUseCase,
      sessionGateway,
    });
    const response = await app.request("http://localhost/api/chats", {
      method: "GET",
      headers: {
        cookie: "session=invalid-token",
      },
    });

    expect(response.status).toBe(401);
  });

  it("rejects expired sessions", async () => {
    const { loginUseCase, sessionGateway } = await createAuthTestContext();
    const expiredSessionToken = await sessionGateway.createExpiredSession(
      TEST_USER_ID
    );
    const app = createApiApp({
      loginUseCase,
      sessionGateway,
    });
    const response = await app.request("http://localhost/api/chats", {
      method: "GET",
      headers: {
        cookie: `session=${expiredSessionToken}`,
      },
    });

    expect(response.status).toBe(401);
  });

  it("rejects revoked sessions", async () => {
    const { loginUseCase, sessionGateway } = await createAuthTestContext();
    const revokedSessionToken = await sessionGateway.createRevokedSession(
      TEST_USER_ID
    );
    const app = createApiApp({
      loginUseCase,
      sessionGateway,
    });
    const response = await app.request("http://localhost/api/chats", {
      method: "GET",
      headers: {
        cookie: `session=${revokedSessionToken}`,
      },
    });

    expect(response.status).toBe(401);
  });

  it("passes the authenticated user id to downstream use cases", async () => {
    const { loginUseCase, sessionGateway } = await createAuthTestContext();
    const recordedCalls: string[] = [];
    const sessionToken = await sessionGateway.createSession(TEST_USER_ID);
    const app = createApiApp({
      loginUseCase,
      sessionGateway,
      listChatsUseCase: {
        async execute(query: ListChatsQuery) {
          recordedCalls.push(query.authenticatedUserId);
          return [];
        },
      } as ListChatsUseCase,
    });
    const response = await app.request("http://localhost/api/chats", {
      method: "GET",
      headers: {
        cookie: `session=${sessionToken}`,
      },
    });

    expect(response.status).toBe(200);
    expect(recordedCalls).toEqual([TEST_USER_ID]);
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
    "keeps scaffold responses for authenticated %s %s",
    async (method, url, body, expectedStatus) => {
      const { loginUseCase, sessionGateway } = await createAuthTestContext();
      const sessionToken = await sessionGateway.createSession(TEST_USER_ID);
      const app = createApiApp({
        loginUseCase,
        sessionGateway,
      });
      const response = await app.request(url, {
        method,
        headers: {
          ...(body === undefined ? {} : { "content-type": "application/json" }),
          cookie: `session=${sessionToken}`,
        },
        body,
      });

      expect(response.status).toBe(expectedStatus);
      await expect(response.json()).resolves.toMatchObject({
        message: expect.stringContaining("is not implemented yet."),
      });
    }
  );

  it("returns 400 when ai_feedback is not a boolean", async () => {
    const { loginUseCase, sessionGateway } = await createAuthTestContext();
    const sessionToken = await sessionGateway.createSession(TEST_USER_ID);
    const app = createApiApp({
      loginUseCase,
      sessionGateway,
    });
    const response = await app.request(
      `http://localhost/api/chats/${VALID_CHANNEL_ID}/messages/${VALID_MESSAGE_ID}/feedback`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: `session=${sessionToken}`,
        },
        body: JSON.stringify({ ai_feedback: "true" }),
      }
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      message: "ai_feedback must be a boolean.",
    });
  });

  it("keeps the OpenAPI source path inside docs", () => {
    expect(OPENAPI_SOURCE_PATH).toContain("docs/specs/api/openapi/openapi.yaml");
  });
});
