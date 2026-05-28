import crypto from "node:crypto";

import type { ChatChannel } from "@/entities/chat-channel";
import type { ChatMessage } from "@/entities/chat-message";
import type {
  ChatChannelGateway,
  CreateChatChannelInput,
} from "@/gateways/chat-channel-gateway";
import type { MessageGateway } from "@/gateways/message-gateway";
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
import { LoginUseCase } from "@/use-cases/login-use-case";
import { SendMessageFeedbackUseCase } from "@/use-cases/send-message-feedback-use-case";
import { SendMessageToChatUseCase } from "@/use-cases/send-message-to-chat-use-case";

const VALID_CHANNEL_ID = "22222222-2222-4222-8222-222222222222";
const VALID_MESSAGE_ID = "33333333-3333-4333-8333-333333333333";
const SECOND_CHANNEL_ID = "44444444-4444-4444-8444-444444444444";
const OTHER_USER_ID = "55555555-5555-4555-8555-555555555555";
const OTHER_CHANNEL_ID = "66666666-6666-4666-8666-666666666666";
const SECOND_MESSAGE_ID = "77777777-7777-4777-8777-777777777777";
const THIRD_MESSAGE_ID = "88888888-8888-4888-8888-888888888888";
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

interface StoredChatChannel extends ChatChannel {
  readonly userId: string;
  isDeleted?: boolean;
}

interface ChatSliceTestContext {
  readonly chatChannelGateway: TestChatChannelGateway;
  readonly listChatsUseCase: ListChatsUseCase;
  readonly getChatByIdUseCase: GetChatByIdUseCase;
  readonly deleteChatByIdUseCase: DeleteChatByIdUseCase;
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

class TestChatChannelGateway implements ChatChannelGateway {
  public readonly deletedChannelIds: string[] = [];
  public readonly lastMessagedAtUpdates: Array<{
    readonly userId: string;
    readonly channelId: string;
    readonly lastMessagedAt: string;
  }> = [];

  public constructor(private readonly channels: StoredChatChannel[]) {}

  private toChatChannel(channel: StoredChatChannel): ChatChannel {
    return {
      id: channel.id,
      name: channel.name,
      lastMessagedAt: channel.lastMessagedAt,
    };
  }

  public async listActiveByUserId(
    userId: string
  ): Promise<ReadonlyArray<ChatChannel>> {
    return this.channels
      .filter((channel) => channel.userId === userId && !channel.isDeleted)
      .sort((left, right) =>
        right.lastMessagedAt.localeCompare(left.lastMessagedAt)
      )
      .map((channel) => this.toChatChannel(channel));
  }

  public async findActiveOwnedById(
    userId: string,
    channelId: string
  ): Promise<ChatChannel | null> {
    const channel = this.channels.find(
      (candidate) =>
        candidate.userId === userId &&
        candidate.id === channelId &&
        !candidate.isDeleted
    );

    if (!channel) {
      return null;
    }

    return this.toChatChannel(channel);
  }

  public async create(channel: CreateChatChannelInput): Promise<ChatChannel> {
    return {
      id: channel.id,
      name: channel.name,
      lastMessagedAt: channel.lastMessagedAt,
    };
  }

  public async softDeleteOwnedById(
    userId: string,
    channelId: string
  ): Promise<boolean> {
    const channel = this.channels.find(
      (candidate) =>
        candidate.userId === userId &&
        candidate.id === channelId &&
        !candidate.isDeleted
    );

    if (!channel) {
      return false;
    }

    this.deletedChannelIds.push(channelId);
    channel.isDeleted = true;

    return true;
  }

  public async updateLastMessagedAtOwnedById(
    userId: string,
    channelId: string,
    lastMessagedAt: string
  ): Promise<boolean> {
    const channelIndex = this.channels.findIndex(
      (candidate) =>
        candidate.userId === userId &&
        candidate.id === channelId &&
        !candidate.isDeleted
    );

    if (channelIndex === -1) {
      return false;
    }

    this.lastMessagedAtUpdates.push({
      userId,
      channelId,
      lastMessagedAt,
    });
    this.channels[channelIndex] = {
      ...this.channels[channelIndex],
      lastMessagedAt,
    };

    return true;
  }
}

class TestMessageGateway implements MessageGateway {
  public constructor(
    private readonly messagesByChannelId: ReadonlyMap<string, ReadonlyArray<ChatMessage>>
  ) {}

  public async listByChannelId(
    channelId: string
  ): Promise<ReadonlyArray<ChatMessage>> {
    return [...(this.messagesByChannelId.get(channelId) ?? [])].sort((left, right) =>
      left.createdAt.localeCompare(right.createdAt)
    );
  }

  public async listByActiveOwnedChannelId(
    _userId: string,
    channelId: string
  ): Promise<ReadonlyArray<ChatMessage>> {
    void _userId;

    return this.listByChannelId(channelId);
  }

  public async createMessage(message: ChatMessage): Promise<ChatMessage> {
    return message;
  }

  public async updateMessageFeedback(
    _messageId: string,
    _feedback: boolean | null
  ): Promise<void> {
    void _messageId;
    void _feedback;
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

const createChatSliceTestContext = (): ChatSliceTestContext => {
  const chatChannelGateway = new TestChatChannelGateway([
    {
      id: SECOND_CHANNEL_ID,
      userId: TEST_USER_ID,
      name: "Daily Notes",
      lastMessagedAt: "2026-05-27T09:00:00.000Z",
    },
    {
      id: VALID_CHANNEL_ID,
      userId: TEST_USER_ID,
      name: "Project Kickoff",
      lastMessagedAt: "2026-05-28T10:30:00.000Z",
    },
    {
      id: OTHER_CHANNEL_ID,
      userId: OTHER_USER_ID,
      name: "Other User Channel",
      lastMessagedAt: "2026-05-28T08:00:00.000Z",
    },
  ]);
  const messageGateway = new TestMessageGateway(
    new Map<string, ReadonlyArray<ChatMessage>>([
      [
        VALID_CHANNEL_ID,
        [
          {
            id: SECOND_MESSAGE_ID,
            channelId: VALID_CHANNEL_ID,
            senderType: "ai",
            messageText: null,
            status: "pending",
            aiFeedback: null,
            createdAt: "2026-05-28T10:31:00.000Z",
          },
          {
            id: VALID_MESSAGE_ID,
            channelId: VALID_CHANNEL_ID,
            senderType: "user",
            messageText: "Need help with the kickoff doc.",
            status: "completed",
            aiFeedback: null,
            createdAt: "2026-05-28T10:30:00.000Z",
          },
          {
            id: THIRD_MESSAGE_ID,
            channelId: VALID_CHANNEL_ID,
            senderType: "ai",
            messageText: "Here is a draft plan.",
            status: "completed",
            aiFeedback: true,
            createdAt: "2026-05-28T10:32:00.000Z",
          },
        ],
      ],
      [
        SECOND_CHANNEL_ID,
        [
          {
            id: "99999999-9999-4999-8999-999999999998",
            channelId: SECOND_CHANNEL_ID,
            senderType: "user",
            messageText: "Daily note",
            status: "completed",
            aiFeedback: null,
            createdAt: "2026-05-27T09:00:00.000Z",
          },
        ],
      ],
    ])
  );

  return {
    chatChannelGateway,
    listChatsUseCase: new ListChatsUseCase({
      chatChannelGateway,
    }),
    getChatByIdUseCase: new GetChatByIdUseCase({
      chatChannelGateway,
      messageGateway,
    }),
    deleteChatByIdUseCase: new DeleteChatByIdUseCase({
      chatChannelGateway,
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
    const listChatsUseCase = new ListChatsUseCase({
      chatChannelGateway: {
        async listActiveByUserId(userId: string) {
          recordedCalls.push(userId);
          return [];
        },
        async findActiveOwnedById() {
          return null;
        },
        async create(channel: CreateChatChannelInput) {
          return {
            id: channel.id,
            name: channel.name,
            lastMessagedAt: channel.lastMessagedAt,
          };
        },
        async softDeleteOwnedById() {
          return false;
        },
        async updateLastMessagedAtOwnedById() {
          return false;
        },
      },
    });
    const app = createApiApp({
      loginUseCase,
      sessionGateway,
      listChatsUseCase,
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

  it("returns the authenticated chat list", async () => {
    const { loginUseCase, sessionGateway } = await createAuthTestContext();
    const { listChatsUseCase, getChatByIdUseCase, deleteChatByIdUseCase } =
      createChatSliceTestContext();
    const sessionToken = await sessionGateway.createSession(TEST_USER_ID);
    const app = createApiApp({
      loginUseCase,
      sessionGateway,
      listChatsUseCase,
      getChatByIdUseCase,
      deleteChatByIdUseCase,
    });
    const response = await app.request("http://localhost/api/chats", {
      method: "GET",
      headers: {
        cookie: `session=${sessionToken}`,
      },
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual([
      {
        channel_id: VALID_CHANNEL_ID,
        channel_name: "Project Kickoff",
        last_messaged_at: "2026-05-28T10:30:00.000Z",
      },
      {
        channel_id: SECOND_CHANNEL_ID,
        channel_name: "Daily Notes",
        last_messaged_at: "2026-05-27T09:00:00.000Z",
      },
    ]);
  });

  it("returns the authenticated chat detail", async () => {
    const { loginUseCase, sessionGateway } = await createAuthTestContext();
    const { listChatsUseCase, getChatByIdUseCase, deleteChatByIdUseCase } =
      createChatSliceTestContext();
    const sessionToken = await sessionGateway.createSession(TEST_USER_ID);
    const app = createApiApp({
      loginUseCase,
      sessionGateway,
      listChatsUseCase,
      getChatByIdUseCase,
      deleteChatByIdUseCase,
    });
    const response = await app.request(
      `http://localhost/api/chats/${VALID_CHANNEL_ID}`,
      {
        method: "GET",
        headers: {
          cookie: `session=${sessionToken}`,
        },
      }
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      channel_id: VALID_CHANNEL_ID,
      channel_name: "Project Kickoff",
      last_messaged_at: "2026-05-28T10:30:00.000Z",
      messages: [
        {
          message_id: VALID_MESSAGE_ID,
          sender_type: "user",
          message_text: "Need help with the kickoff doc.",
          status: "completed",
          ai_feedback: null,
          created_at: "2026-05-28T10:30:00.000Z",
        },
        {
          message_id: SECOND_MESSAGE_ID,
          sender_type: "ai",
          message_text: null,
          status: "pending",
          ai_feedback: null,
          created_at: "2026-05-28T10:31:00.000Z",
        },
        {
          message_id: THIRD_MESSAGE_ID,
          sender_type: "ai",
          message_text: "Here is a draft plan.",
          status: "completed",
          ai_feedback: true,
          created_at: "2026-05-28T10:32:00.000Z",
        },
      ],
    });
  });

  it("returns 400 when chat detail channel_id is not a UUID", async () => {
    const { loginUseCase, sessionGateway } = await createAuthTestContext();
    const { listChatsUseCase, getChatByIdUseCase, deleteChatByIdUseCase } =
      createChatSliceTestContext();
    const sessionToken = await sessionGateway.createSession(TEST_USER_ID);
    const app = createApiApp({
      loginUseCase,
      sessionGateway,
      listChatsUseCase,
      getChatByIdUseCase,
      deleteChatByIdUseCase,
    });
    const response = await app.request("http://localhost/api/chats/not-a-uuid", {
      method: "GET",
      headers: {
        cookie: `session=${sessionToken}`,
      },
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      message: "channel_id must be a valid UUID.",
    });
  });

  it("returns 404 when chat detail is not visible to the authenticated user", async () => {
    const { loginUseCase, sessionGateway } = await createAuthTestContext();
    const { listChatsUseCase, getChatByIdUseCase, deleteChatByIdUseCase } =
      createChatSliceTestContext();
    const sessionToken = await sessionGateway.createSession(TEST_USER_ID);
    const app = createApiApp({
      loginUseCase,
      sessionGateway,
      listChatsUseCase,
      getChatByIdUseCase,
      deleteChatByIdUseCase,
    });
    const response = await app.request(
      `http://localhost/api/chats/${OTHER_CHANNEL_ID}`,
      {
        method: "GET",
        headers: {
          cookie: `session=${sessionToken}`,
        },
      }
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      message: "Chat channel not found.",
    });
  });

  it("returns 204 when deleting an authenticated chat", async () => {
    const { loginUseCase, sessionGateway } = await createAuthTestContext();
    const {
      chatChannelGateway,
      listChatsUseCase,
      getChatByIdUseCase,
      deleteChatByIdUseCase,
    } = createChatSliceTestContext();
    const sessionToken = await sessionGateway.createSession(TEST_USER_ID);
    const app = createApiApp({
      loginUseCase,
      sessionGateway,
      listChatsUseCase,
      getChatByIdUseCase,
      deleteChatByIdUseCase,
    });
    const response = await app.request(
      `http://localhost/api/chats/${VALID_CHANNEL_ID}`,
      {
        method: "DELETE",
        headers: {
          cookie: `session=${sessionToken}`,
        },
      }
    );

    expect(response.status).toBe(204);
    await expect(response.text()).resolves.toBe("");
    expect(chatChannelGateway.deletedChannelIds).toEqual([VALID_CHANNEL_ID]);
  });

  it("excludes a deleted chat from subsequent list and detail reads", async () => {
    const { loginUseCase, sessionGateway } = await createAuthTestContext();
    const { listChatsUseCase, getChatByIdUseCase, deleteChatByIdUseCase } =
      createChatSliceTestContext();
    const sessionToken = await sessionGateway.createSession(TEST_USER_ID);
    const app = createApiApp({
      loginUseCase,
      sessionGateway,
      listChatsUseCase,
      getChatByIdUseCase,
      deleteChatByIdUseCase,
    });

    const deleteResponse = await app.request(
      `http://localhost/api/chats/${VALID_CHANNEL_ID}`,
      {
        method: "DELETE",
        headers: {
          cookie: `session=${sessionToken}`,
        },
      }
    );

    expect(deleteResponse.status).toBe(204);

    const listResponse = await app.request("http://localhost/api/chats", {
      method: "GET",
      headers: {
        cookie: `session=${sessionToken}`,
      },
    });

    expect(listResponse.status).toBe(200);
    await expect(listResponse.json()).resolves.toEqual([
      {
        channel_id: SECOND_CHANNEL_ID,
        channel_name: "Daily Notes",
        last_messaged_at: "2026-05-27T09:00:00.000Z",
      },
    ]);

    const detailResponse = await app.request(
      `http://localhost/api/chats/${VALID_CHANNEL_ID}`,
      {
        method: "GET",
        headers: {
          cookie: `session=${sessionToken}`,
        },
      }
    );

    expect(detailResponse.status).toBe(404);
    await expect(detailResponse.json()).resolves.toEqual({
      message: "Chat channel not found.",
    });
  });

  it("returns 400 when delete channel_id is not a UUID", async () => {
    const { loginUseCase, sessionGateway } = await createAuthTestContext();
    const { listChatsUseCase, getChatByIdUseCase, deleteChatByIdUseCase } =
      createChatSliceTestContext();
    const sessionToken = await sessionGateway.createSession(TEST_USER_ID);
    const app = createApiApp({
      loginUseCase,
      sessionGateway,
      listChatsUseCase,
      getChatByIdUseCase,
      deleteChatByIdUseCase,
    });
    const response = await app.request("http://localhost/api/chats/not-a-uuid", {
      method: "DELETE",
      headers: {
        cookie: `session=${sessionToken}`,
      },
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      message: "channel_id must be a valid UUID.",
    });
  });

  it("returns 404 when deleting a chat that is not visible to the authenticated user", async () => {
    const { loginUseCase, sessionGateway } = await createAuthTestContext();
    const {
      chatChannelGateway,
      listChatsUseCase,
      getChatByIdUseCase,
      deleteChatByIdUseCase,
    } = createChatSliceTestContext();
    const sessionToken = await sessionGateway.createSession(TEST_USER_ID);
    const app = createApiApp({
      loginUseCase,
      sessionGateway,
      listChatsUseCase,
      getChatByIdUseCase,
      deleteChatByIdUseCase,
    });
    const response = await app.request(
      `http://localhost/api/chats/${OTHER_CHANNEL_ID}`,
      {
        method: "DELETE",
        headers: {
          cookie: `session=${sessionToken}`,
        },
      }
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      message: "Chat channel not found.",
    });
    expect(chatChannelGateway.deletedChannelIds).toEqual([]);
  });

  it.each([
    [
      "POST",
      "http://localhost/api/chats",
      JSON.stringify({ message_text: "hello scaffold" }),
      501,
    ],
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
