import crypto from "node:crypto";

import type { ChatChannel } from "@/entities/chat-channel";
import type { ChatMessage } from "@/entities/chat-message";
import type {
  ChatChannelGateway,
  CreateChatChannelInput,
} from "@/gateways/chat-channel-gateway";
import type {
  ChannelNameGeneratorGateway,
  GenerateChannelNameInput,
} from "@/gateways/channel-name-generator-gateway";
import type {
  ChatCompletionGateway,
  ChatCompletionRequest,
} from "@/gateways/chat-completion-gateway";
import type {
  AnalyzeCorrectionConversationInput,
  CorrectionAnalysisGateway,
  CorrectionAnalysisResult,
} from "@/gateways/correction-analysis-gateway";
import type {
  CorrectionRuleGateway,
  RelevantCorrectionRule,
  SaveCorrectionRuleInput,
} from "@/gateways/correction-rule-gateway";
import type { EmbeddingGateway } from "@/gateways/embedding-gateway";
import type { MessageGateway, UpdateAiMessageInput } from "@/gateways/message-gateway";
import type {
  AiFeedbackExample,
  OwnedAiMessageForFeedback,
} from "@/gateways/message-gateway";
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
import { AiReplyLifecycleService } from "@/services/ai-reply-lifecycle-service";
import type { Clock } from "@/shared/clock";
import type { IdGenerator } from "@/shared/id-generator";
import { PendingAiMessageAlreadyExistsError } from "@/shared/errors/application-error";

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
  readonly messageGateway: TestMessageGateway;
  readonly listChatsUseCase: ListChatsUseCase;
  readonly getChatByIdUseCase: GetChatByIdUseCase;
  readonly deleteChatByIdUseCase: DeleteChatByIdUseCase;
}

interface MessageFlowTestContext {
  readonly chatChannelGateway: TestChatChannelGateway;
  readonly messageGateway: TestMessageGateway;
  readonly channelNameGeneratorGateway: TestChannelNameGeneratorGateway;
  readonly chatCompletionGateway: TestChatCompletionGateway;
  readonly correctionAnalysisGateway: TestCorrectionAnalysisGateway;
  readonly correctionRuleGateway: TestCorrectionRuleGateway;
  readonly embeddingGateway: TestEmbeddingGateway;
  readonly createChatUseCase: CreateChatWithFirstMessageUseCase;
  readonly sendMessageToChatUseCase: SendMessageToChatUseCase;
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
  public readonly createdChannels: CreateChatChannelInput[] = [];
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

  public ownsChannel(userId: string, channelId: string): boolean {
    return this.channels.some(
      (candidate) => candidate.userId === userId && candidate.id === channelId
    );
  }

  public setLastMessagedAt(channelId: string, lastMessagedAt: string): void {
    const channelIndex = this.channels.findIndex(
      (candidate) => candidate.id === channelId
    );

    if (channelIndex === -1) {
      return;
    }

    this.channels[channelIndex] = {
      ...this.channels[channelIndex],
      lastMessagedAt,
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
    this.createdChannels.push(channel);
    this.channels.push({
      id: channel.id,
      userId: channel.userId,
      name: channel.name,
      lastMessagedAt: channel.lastMessagedAt,
      isDeleted: false,
    });

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
  public readonly createdMessages: ChatMessage[] = [];
  public readonly updatedAiMessages: Array<{
    readonly messageId: string;
    readonly status: "completed" | "ai_timeout";
    readonly messageText: string;
  }> = [];
  public readonly updatedFeedbacks: Array<{
    readonly messageId: string;
    readonly aiFeedback: boolean | null;
  }> = [];
  private readonly feedbackUpdatedAtByMessageId = new Map<string, string>();

  public constructor(
    private readonly messagesByChannelId: Map<string, ChatMessage[]>,
    private readonly chatChannelGateway: TestChatChannelGateway
  ) {
    for (const channelMessages of messagesByChannelId.values()) {
      for (const message of channelMessages) {
        if (message.aiFeedback !== null) {
          this.feedbackUpdatedAtByMessageId.set(message.id, message.createdAt);
        }
      }
    }
  }

  public async listByChannelId(
    channelId: string
  ): Promise<ReadonlyArray<ChatMessage>> {
    return [...(this.messagesByChannelId.get(channelId) ?? [])].sort(
      (left, right) => left.createdAt.localeCompare(right.createdAt)
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
    this.createdMessages.push(message);
    const existingMessages = this.messagesByChannelId.get(message.channelId) ?? [];

    existingMessages.push(message);
    this.messagesByChannelId.set(message.channelId, existingMessages);

    return message;
  }

  public async appendUserMessageWithPendingAiMessage(input: {
    readonly channelId: string;
    readonly userMessage: ChatMessage;
    readonly pendingAiMessage: ChatMessage;
  }): Promise<{
    readonly userMessage: ChatMessage;
    readonly pendingAiMessage: ChatMessage;
  }> {
    const existingMessages = this.messagesByChannelId.get(input.channelId) ?? [];
    const hasPendingAiMessage = existingMessages.some(
      (message) =>
        message.senderType === "ai" && message.status === "pending"
    );

    if (hasPendingAiMessage) {
      throw new PendingAiMessageAlreadyExistsError();
    }

    this.createdMessages.push(input.userMessage, input.pendingAiMessage);
    this.messagesByChannelId.set(input.channelId, [
      ...existingMessages,
      input.userMessage,
      input.pendingAiMessage,
    ]);
    this.chatChannelGateway.setLastMessagedAt(
      input.channelId,
      input.pendingAiMessage.createdAt
    );

    return {
      userMessage: input.userMessage,
      pendingAiMessage: input.pendingAiMessage,
    };
  }

  public async updateAiMessage(
    messageId: string,
    input: UpdateAiMessageInput
  ): Promise<void> {
    for (const [channelId, channelMessages] of this.messagesByChannelId.entries()) {
      const messageIndex = channelMessages.findIndex(
        (message) => message.id === messageId
      );

      if (messageIndex === -1) {
        continue;
      }

      this.updatedAiMessages.push({
        messageId,
        status: input.status,
        messageText: input.messageText,
      });
      this.chatChannelGateway.setLastMessagedAt(
        input.channelId,
        input.lastMessagedAt
      );
      this.messagesByChannelId.set(channelId, [
        ...channelMessages.slice(0, messageIndex),
        {
          ...channelMessages[messageIndex],
          status: input.status,
          messageText: input.messageText,
        },
        ...channelMessages.slice(messageIndex + 1),
      ]);

      return;
    }
  }

  public async updateMessageFeedback(
    messageId: string,
    feedback: boolean | null
  ): Promise<void> {
    this.updatedFeedbacks.push({
      messageId,
      aiFeedback: feedback,
    });
    this.feedbackUpdatedAtByMessageId.set(messageId, new Date().toISOString());

    for (const [channelId, channelMessages] of this.messagesByChannelId.entries()) {
      const messageIndex = channelMessages.findIndex(
        (message) => message.id === messageId
      );

      if (messageIndex === -1) {
        continue;
      }

      this.messagesByChannelId.set(channelId, [
        ...channelMessages.slice(0, messageIndex),
        {
          ...channelMessages[messageIndex],
          aiFeedback: feedback,
        },
        ...channelMessages.slice(messageIndex + 1),
      ]);

      return;
    }
  }

  public async findOwnedAiMessageForFeedback(
    userId: string,
    channelId: string,
    messageId: string
  ): Promise<OwnedAiMessageForFeedback | null> {
    const activeChannel = await this.chatChannelGateway.findActiveOwnedById(
      userId,
      channelId
    );

    if (!activeChannel) {
      return null;
    }

    const channelMessages = this.messagesByChannelId.get(channelId) ?? [];
    const message = channelMessages.find(
      (candidate) =>
        candidate.id === messageId && candidate.senderType === "ai"
    );

    if (!message) {
      return null;
    }

    return {
      id: message.id,
      channelId: message.channelId,
      status: message.status,
      aiFeedback: message.aiFeedback,
    };
  }

  public async listFeedbackExamplesByUserId(
    userId: string,
    limit: number
  ): Promise<ReadonlyArray<AiFeedbackExample>> {
    const feedbackExamples = Array.from(this.messagesByChannelId.entries())
      .flatMap(([channelId, channelMessages]) => {
        if (!this.chatChannelGateway.ownsChannel(userId, channelId)) {
          return [];
        }

        return channelMessages.flatMap((message) => {
          if (
            message.senderType !== "ai" ||
            message.status !== "completed" ||
            message.aiFeedback === null ||
            message.messageText === null
          ) {
            return [];
          }

          return [
            {
              messageId: message.id,
              channelId: message.channelId,
              messageText: message.messageText,
              aiFeedback: message.aiFeedback,
              feedbackUpdatedAt:
                this.feedbackUpdatedAtByMessageId.get(message.id) ??
                message.createdAt,
            },
          ];
        });
      })
      .sort((left, right) =>
        right.feedbackUpdatedAt.localeCompare(left.feedbackUpdatedAt)
      );

    return feedbackExamples.slice(0, limit);
  }
}

class SequenceClock implements Clock {
  private lastValue = "2026-05-29T00:00:00.000Z";

  public constructor(private readonly values: string[]) {}

  public now(): Date {
    const nextValue = this.values.shift() ?? this.lastValue;

    this.lastValue = nextValue;

    return new Date(nextValue);
  }
}

class StubIdGenerator implements IdGenerator {
  public constructor(private readonly values: string[]) {}

  public generate(): string {
    const nextValue = this.values.shift();

    if (!nextValue) {
      throw new Error("Expected StubIdGenerator to have another value.");
    }

    return nextValue;
  }
}

class TestChannelNameGeneratorGateway
  implements ChannelNameGeneratorGateway
{
  public readonly calls: GenerateChannelNameInput[] = [];

  public constructor(private readonly channelName: string) {}

  public async generateChannelName(
    input: GenerateChannelNameInput
  ): Promise<string> {
    this.calls.push(input);

    return this.channelName;
  }
}

class TestChatCompletionGateway implements ChatCompletionGateway {
  public readonly calls: ChatCompletionRequest[] = [];

  public constructor(
    private readonly replyFactory: (
      request: ChatCompletionRequest
    ) => Promise<string>
  ) {}

  public async generateReply(
    request: ChatCompletionRequest
  ): Promise<string> {
    this.calls.push(request);

    return this.replyFactory(request);
  }
}

class TestCorrectionAnalysisGateway implements CorrectionAnalysisGateway {
  public readonly calls: AnalyzeCorrectionConversationInput[] = [];

  public constructor(
    private readonly analysisFactory: (
      input: AnalyzeCorrectionConversationInput
    ) => Promise<CorrectionAnalysisResult>
  ) {}

  public async analyzeConversation(
    input: AnalyzeCorrectionConversationInput
  ): Promise<CorrectionAnalysisResult> {
    this.calls.push(input);

    return this.analysisFactory(input);
  }
}

class TestCorrectionRuleGateway implements CorrectionRuleGateway {
  public readonly savedRules: SaveCorrectionRuleInput[] = [];
  public readonly relevantRuleQueries: Array<{
    readonly userId: string;
    readonly queryEmbedding: ReadonlyArray<number>;
    readonly limit: number;
  }> = [];

  public constructor(
    private readonly relevantRulesFactory: (
      input: {
        readonly userId: string;
        readonly queryEmbedding: ReadonlyArray<number>;
        readonly limit: number;
      }
    ) => Promise<ReadonlyArray<RelevantCorrectionRule>>
  ) {}

  public async saveRules(rules: ReadonlyArray<SaveCorrectionRuleInput>): Promise<void> {
    this.savedRules.push(...rules);
  }

  public async findRelevantRulesByUserId(input: {
    readonly userId: string;
    readonly queryEmbedding: ReadonlyArray<number>;
    readonly limit: number;
  }): Promise<ReadonlyArray<RelevantCorrectionRule>> {
    this.relevantRuleQueries.push(input);

    return this.relevantRulesFactory(input);
  }
}

class TestEmbeddingGateway implements EmbeddingGateway {
  public readonly calls: string[] = [];

  public constructor(
    private readonly embeddingFactory: (
      input: string
    ) => Promise<ReadonlyArray<number>>
  ) {}

  public async generateEmbedding(
    input: string
  ): Promise<ReadonlyArray<number>> {
    this.calls.push(input);

    return this.embeddingFactory(input);
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
    new Map<string, ChatMessage[]>([
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
    ,
    chatChannelGateway
  );

  return {
    chatChannelGateway,
    messageGateway,
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

const createMessageFlowTestContext = ({
  channelName = "AI Summary Channel",
  replyFactory = async () => "AI generated reply",
  correctionAnalysisFactory = async () => ({
    isCorrectionIntent: false,
    extractedRules: [],
  }),
  relevantRulesFactory = async () => [],
  embeddingFactory = async () => [0.1, 0.2, 0.3],
  clockValues = [
    "2026-05-29T00:00:00.000Z",
    "2026-05-29T00:00:01.000Z",
    "2026-05-29T00:00:02.000Z",
    "2026-05-29T00:00:03.000Z",
  ],
  generatedIds = [
    "aaaaaaa1-aaaa-4aaa-8aaa-aaaaaaaaaaa1",
    "bbbbbbb2-bbbb-4bbb-8bbb-bbbbbbbbbbb2",
    "ccccccc3-cccc-4ccc-8ccc-ccccccccccc3",
  ],
  channels = [
    {
      id: VALID_CHANNEL_ID,
      userId: TEST_USER_ID,
      name: "Project Kickoff",
      lastMessagedAt: "2026-05-28T10:30:00.000Z",
    },
  ] satisfies StoredChatChannel[],
  messagesByChannelId = new Map<string, ChatMessage[]>([
    [
      VALID_CHANNEL_ID,
      [
        {
          id: VALID_MESSAGE_ID,
          channelId: VALID_CHANNEL_ID,
          senderType: "user",
          messageText: "Need help with the kickoff doc.",
          status: "completed",
          aiFeedback: null,
          createdAt: "2026-05-28T10:30:00.000Z",
        },
      ],
    ],
  ]),
}: {
  readonly channelName?: string;
  readonly replyFactory?: (
    request: ChatCompletionRequest
  ) => Promise<string>;
  readonly correctionAnalysisFactory?: (
    input: AnalyzeCorrectionConversationInput
  ) => Promise<CorrectionAnalysisResult>;
  readonly relevantRulesFactory?: (
    input: {
      readonly userId: string;
      readonly queryEmbedding: ReadonlyArray<number>;
      readonly limit: number;
    }
  ) => Promise<ReadonlyArray<RelevantCorrectionRule>>;
  readonly embeddingFactory?: (
    input: string
  ) => Promise<ReadonlyArray<number>>;
  readonly clockValues?: string[];
  readonly generatedIds?: string[];
  readonly channels?: StoredChatChannel[];
  readonly messagesByChannelId?: Map<string, ChatMessage[]>;
} = {}): MessageFlowTestContext => {
  const chatChannelGateway = new TestChatChannelGateway([...channels]);
  const messageGateway = new TestMessageGateway(
    messagesByChannelId,
    chatChannelGateway
  );
  const clock = new SequenceClock([...clockValues]);
  const idGenerator = new StubIdGenerator([...generatedIds]);
  const chatCompletionGateway = new TestChatCompletionGateway(replyFactory);
  const channelNameGeneratorGateway = new TestChannelNameGeneratorGateway(
    channelName
  );
  const correctionAnalysisGateway = new TestCorrectionAnalysisGateway(
    correctionAnalysisFactory
  );
  const correctionRuleGateway = new TestCorrectionRuleGateway(
    relevantRulesFactory
  );
  const embeddingGateway = new TestEmbeddingGateway(embeddingFactory);
  const aiReplyLifecycleService = new AiReplyLifecycleService({
    messageGateway,
    chatCompletionGateway,
    correctionAnalysisGateway,
    correctionRuleGateway,
    embeddingGateway,
    clock,
    idGenerator,
  });

  return {
    chatChannelGateway,
    messageGateway,
    channelNameGeneratorGateway,
    chatCompletionGateway,
    correctionAnalysisGateway,
    correctionRuleGateway,
    embeddingGateway,
    createChatUseCase: new CreateChatWithFirstMessageUseCase({
      chatChannelGateway,
      messageGateway,
      aiReplyLifecycleService,
      channelNameGeneratorGateway,
      clock,
      idGenerator,
    }),
    sendMessageToChatUseCase: new SendMessageToChatUseCase({
      chatChannelGateway,
      messageGateway,
      aiReplyLifecycleService,
      clock,
      idGenerator,
    }),
  };
};

const flushMicrotasks = async (): Promise<void> => {
  for (let index = 0; index < 10; index += 1) {
    await Promise.resolve();
  }
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

  it("creates a chat, stores the first user message, and completes the AI reply lifecycle", async () => {
    const { loginUseCase, sessionGateway } = await createAuthTestContext();
    const {
      chatChannelGateway,
      messageGateway,
      channelNameGeneratorGateway,
      chatCompletionGateway,
      createChatUseCase,
    } = createMessageFlowTestContext({
      channelName: "AI要約タイトル",
      replyFactory: async () => "生成済みのAI回答",
      clockValues: [
        "2026-05-29T00:00:00.000Z",
        "2026-05-29T00:00:01.000Z",
        "2026-05-29T00:00:02.000Z",
      ],
      generatedIds: [
        "10101010-1010-4010-8010-101010101010",
        "20202020-2020-4020-8020-202020202020",
        "30303030-3030-4030-8030-303030303030",
      ],
      channels: [],
      messagesByChannelId: new Map<string, ChatMessage[]>(),
    });
    const sessionToken = await sessionGateway.createSession(TEST_USER_ID);
    const app = createApiApp({
      loginUseCase,
      sessionGateway,
      createChatUseCase,
    });
    const response = await app.request("http://localhost/api/chats", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: `session=${sessionToken}`,
      },
      body: JSON.stringify({
        message_text: "最初の相談内容です",
      }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      channel_id: "10101010-1010-4010-8010-101010101010",
      channel_name: "AI要約タイトル",
      message_id: "20202020-2020-4020-8020-202020202020",
      sender_type: "user",
      message_text: "最初の相談内容です",
      status: "completed",
      created_at: "2026-05-29T00:00:00.000Z",
    });

    await flushMicrotasks();
    await flushMicrotasks();

    expect(channelNameGeneratorGateway.calls).toEqual([
      {
        firstMessageText: "最初の相談内容です",
        userId: TEST_USER_ID,
      },
    ]);
    expect(chatChannelGateway.createdChannels).toEqual([
      {
        id: "10101010-1010-4010-8010-101010101010",
        userId: TEST_USER_ID,
        name: "AI要約タイトル",
        lastMessagedAt: "2026-05-29T00:00:00.000Z",
      },
    ]);
    expect(chatCompletionGateway.calls).toHaveLength(1);
    expect(chatCompletionGateway.calls[0]?.conversationHistory).toEqual([
      {
        role: "user",
        content: "最初の相談内容です",
      },
    ]);

    const storedMessages = await messageGateway.listByChannelId(
      "10101010-1010-4010-8010-101010101010"
    );

    expect(storedMessages).toEqual([
      {
        id: "20202020-2020-4020-8020-202020202020",
        channelId: "10101010-1010-4010-8010-101010101010",
        senderType: "user",
        messageText: "最初の相談内容です",
        status: "completed",
        aiFeedback: null,
        createdAt: "2026-05-29T00:00:00.000Z",
      },
      {
        id: "30303030-3030-4030-8030-303030303030",
        channelId: "10101010-1010-4010-8010-101010101010",
        senderType: "ai",
        messageText: "生成済みのAI回答",
        status: "completed",
        aiFeedback: null,
        createdAt: "2026-05-29T00:00:01.000Z",
      },
    ]);
    await expect(
      chatChannelGateway.findActiveOwnedById(
        TEST_USER_ID,
        "10101010-1010-4010-8010-101010101010"
      )
    ).resolves.toEqual({
      id: "10101010-1010-4010-8010-101010101010",
      name: "AI要約タイトル",
      lastMessagedAt: "2026-05-29T00:00:02.000Z",
    });
  });

  it("sends a message to an existing chat and updates the pending message to completed", async () => {
    const { loginUseCase, sessionGateway } = await createAuthTestContext();
    const { chatChannelGateway, messageGateway, sendMessageToChatUseCase } =
      createMessageFlowTestContext({
        replyFactory: async () => "後続のAI回答",
        clockValues: [
          "2026-05-29T01:00:00.000Z",
          "2026-05-29T01:00:01.000Z",
          "2026-05-29T01:00:02.000Z",
        ],
        generatedIds: [
          "40404040-4040-4040-8040-404040404040",
          "50505050-5050-4050-8050-505050505050",
        ],
      });
    const sessionToken = await sessionGateway.createSession(TEST_USER_ID);
    const app = createApiApp({
      loginUseCase,
      sessionGateway,
      sendMessageToChatUseCase,
    });
    const response = await app.request(
      `http://localhost/api/chats/${VALID_CHANNEL_ID}/messages`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: `session=${sessionToken}`,
        },
        body: JSON.stringify({
          message_text: "続きの質問を送ります",
        }),
      }
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      channel_name: "Project Kickoff",
      message_id: "40404040-4040-4040-8040-404040404040",
      sender_type: "user",
      message_text: "続きの質問を送ります",
      status: "completed",
      created_at: "2026-05-29T01:00:00.000Z",
    });

    await flushMicrotasks();

    const storedMessages = await messageGateway.listByChannelId(VALID_CHANNEL_ID);

    expect(storedMessages).toEqual([
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
        id: "40404040-4040-4040-8040-404040404040",
        channelId: VALID_CHANNEL_ID,
        senderType: "user",
        messageText: "続きの質問を送ります",
        status: "completed",
        aiFeedback: null,
        createdAt: "2026-05-29T01:00:00.000Z",
      },
      {
        id: "50505050-5050-4050-8050-505050505050",
        channelId: VALID_CHANNEL_ID,
        senderType: "ai",
        messageText: "後続のAI回答",
        status: "completed",
        aiFeedback: null,
        createdAt: "2026-05-29T01:00:01.000Z",
      },
    ]);
    await expect(
      chatChannelGateway.findActiveOwnedById(TEST_USER_ID, VALID_CHANNEL_ID)
    ).resolves.toEqual({
      id: VALID_CHANNEL_ID,
      name: "Project Kickoff",
      lastMessagedAt: "2026-05-29T01:00:02.000Z",
    });
  });

  it("extracts correction rules and includes rules plus feedback examples in the reply prompt", async () => {
    const { loginUseCase, sessionGateway } = await createAuthTestContext();
    const {
      correctionAnalysisGateway,
      correctionRuleGateway,
      embeddingGateway,
      sendMessageToChatUseCase,
      chatCompletionGateway,
    } = createMessageFlowTestContext({
      replyFactory: async () => "訂正を反映したAI回答",
      correctionAnalysisFactory: async () => ({
        isCorrectionIntent: true,
        extractedRules: ["結論から答える", "箇条書きは必要なときだけ使う"],
      }),
      embeddingFactory: async (input) => {
        if (input === "結論から答える") {
          return [0.11, 0.12, 0.13];
        }

        if (input === "箇条書きは必要なときだけ使う") {
          return [0.21, 0.22, 0.23];
        }

        return [0.31, 0.32, 0.33];
      },
      relevantRulesFactory: async () => [
        {
          ruleText: "冒頭で要点を先に述べる",
          similarity: 0.95,
          channelId: VALID_CHANNEL_ID,
          triggerMessageId: VALID_MESSAGE_ID,
          createdAt: "2026-05-28T10:00:00.000Z",
        },
      ],
      channels: [
        {
          id: VALID_CHANNEL_ID,
          userId: TEST_USER_ID,
          name: "Project Kickoff",
          lastMessagedAt: "2026-05-28T10:30:00.000Z",
        },
        {
          id: SECOND_CHANNEL_ID,
          userId: TEST_USER_ID,
          name: "Deleted Learning Channel",
          lastMessagedAt: "2026-05-27T09:00:00.000Z",
          isDeleted: true,
        },
      ],
      messagesByChannelId: new Map<string, ChatMessage[]>([
        [
          VALID_CHANNEL_ID,
          [
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
              id: SECOND_MESSAGE_ID,
              channelId: VALID_CHANNEL_ID,
              senderType: "ai",
              messageText: "情報を長く並べた回答です。",
              status: "completed",
              aiFeedback: false,
              createdAt: "2026-05-28T10:31:00.000Z",
            },
          ],
        ],
        [
          SECOND_CHANNEL_ID,
          [
            {
              id: THIRD_MESSAGE_ID,
              channelId: SECOND_CHANNEL_ID,
              senderType: "ai",
              messageText: "結論を先に短く述べた回答です。",
              status: "completed",
              aiFeedback: true,
              createdAt: "2026-05-27T09:00:00.000Z",
            },
          ],
        ],
      ]),
      clockValues: [
        "2026-05-29T03:00:00.000Z",
        "2026-05-29T03:00:01.000Z",
        "2026-05-29T03:00:02.000Z",
        "2026-05-29T03:00:03.000Z",
      ],
      generatedIds: [
        "81818181-8181-4181-8181-818181818181",
        "91919191-9191-4191-8191-919191919191",
        "a1a1a1a1-a1a1-41a1-81a1-a1a1a1a1a1a1",
        "b2b2b2b2-b2b2-42b2-82b2-b2b2b2b2b2b2",
      ],
    });
    const sessionToken = await sessionGateway.createSession(TEST_USER_ID);
    const app = createApiApp({
      loginUseCase,
      sessionGateway,
      sendMessageToChatUseCase,
    });
    const response = await app.request(
      `http://localhost/api/chats/${VALID_CHANNEL_ID}/messages`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: `session=${sessionToken}`,
        },
        body: JSON.stringify({
          message_text: "前の回答を訂正してください。要点を先に短く答えてください。",
        }),
      }
    );

    expect(response.status).toBe(200);

    await flushMicrotasks();

    expect(chatCompletionGateway.calls).toHaveLength(1);
    expect(correctionAnalysisGateway.calls).toHaveLength(1);
    expect(correctionRuleGateway.savedRules.map((rule) => rule.ruleText)).toEqual([
      "結論から答える",
      "箇条書きは必要なときだけ使う",
    ]);
    expect(embeddingGateway.calls).toEqual([
      "結論から答える",
      "箇条書きは必要なときだけ使う",
      "前の回答を訂正してください。要点を先に短く答えてください。",
    ]);
    expect(chatCompletionGateway.calls[0]?.systemPrompt).toContain(
      "冒頭で要点を先に述べる"
    );
    expect(chatCompletionGateway.calls[0]?.systemPrompt).toContain(
      "Bad: 情報を長く並べた回答です。"
    );
    expect(chatCompletionGateway.calls[0]?.systemPrompt).toContain(
      "Good: 結論を先に短く述べた回答です。"
    );
  });

  it("falls back to a normal reply when correction extraction fails", async () => {
    const { loginUseCase, sessionGateway } = await createAuthTestContext();
    const {
      correctionRuleGateway,
      sendMessageToChatUseCase,
      chatCompletionGateway,
    } = createMessageFlowTestContext({
      replyFactory: async () => "通常のAI回答",
      correctionAnalysisFactory: async () => {
        throw new Error("analysis failed");
      },
      clockValues: [
        "2026-05-29T03:30:00.000Z",
        "2026-05-29T03:30:01.000Z",
        "2026-05-29T03:30:02.000Z",
      ],
      generatedIds: [
        "c3c3c3c3-c3c3-43c3-83c3-c3c3c3c3c3c3",
        "d4d4d4d4-d4d4-44d4-84d4-d4d4d4d4d4d4",
      ],
    });
    const sessionToken = await sessionGateway.createSession(TEST_USER_ID);
    const app = createApiApp({
      loginUseCase,
      sessionGateway,
      sendMessageToChatUseCase,
    });
    const response = await app.request(
      `http://localhost/api/chats/${VALID_CHANNEL_ID}/messages`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: `session=${sessionToken}`,
        },
        body: JSON.stringify({
          message_text: "前の回答を修正してください。",
        }),
      }
    );

    expect(response.status).toBe(200);

    await flushMicrotasks();
    await flushMicrotasks();

    expect(chatCompletionGateway.calls).toHaveLength(1);
    expect(correctionRuleGateway.savedRules).toEqual([]);
    expect(chatCompletionGateway.calls[0]?.systemPrompt).toContain(
      "あなたは親しみやすく、会話しやすいAIアシスタントです。"
    );
  });

  it("returns 422 when an existing chat already has a pending AI response", async () => {
    const { loginUseCase, sessionGateway } = await createAuthTestContext();
    const { chatChannelGateway, messageGateway, sendMessageToChatUseCase } =
      createMessageFlowTestContext({
        messagesByChannelId: new Map<string, ChatMessage[]>([
          [
            VALID_CHANNEL_ID,
            [
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
                id: SECOND_MESSAGE_ID,
                channelId: VALID_CHANNEL_ID,
                senderType: "ai",
                messageText: null,
                status: "pending",
                aiFeedback: null,
                createdAt: "2026-05-28T10:31:00.000Z",
              },
            ],
          ],
        ]),
      });
    const sessionToken = await sessionGateway.createSession(TEST_USER_ID);
    const app = createApiApp({
      loginUseCase,
      sessionGateway,
      sendMessageToChatUseCase,
    });
    const response = await app.request(
      `http://localhost/api/chats/${VALID_CHANNEL_ID}/messages`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: `session=${sessionToken}`,
        },
        body: JSON.stringify({
          message_text: "この送信は拒否されるはずです",
        }),
      }
    );

    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toEqual({
      message: "Pending AI response already exists.",
    });
    expect(messageGateway.createdMessages).toEqual([]);
    expect(chatChannelGateway.lastMessagedAtUpdates).toEqual([]);
  });

  it.each([
    [
      "other user channel",
      OTHER_CHANNEL_ID,
      [
        {
          id: VALID_CHANNEL_ID,
          userId: TEST_USER_ID,
          name: "Project Kickoff",
          lastMessagedAt: "2026-05-28T10:30:00.000Z",
        },
      ] satisfies StoredChatChannel[],
    ],
    [
      "deleted channel",
      VALID_CHANNEL_ID,
      [
        {
          id: VALID_CHANNEL_ID,
          userId: TEST_USER_ID,
          name: "Deleted Channel",
          lastMessagedAt: "2026-05-28T10:30:00.000Z",
          isDeleted: true,
        },
      ] satisfies StoredChatChannel[],
    ],
  ])(
    "returns 404 when sending to a non-visible existing chat: %s",
    async (_label, channelId, channels) => {
      const { loginUseCase, sessionGateway } = await createAuthTestContext();
      const { sendMessageToChatUseCase } = createMessageFlowTestContext({
        channels,
      });
      const sessionToken = await sessionGateway.createSession(TEST_USER_ID);
      const app = createApiApp({
        loginUseCase,
        sessionGateway,
        sendMessageToChatUseCase,
      });
      const response = await app.request(
        `http://localhost/api/chats/${channelId}/messages`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            cookie: `session=${sessionToken}`,
          },
          body: JSON.stringify({
            message_text: "送信できないチャットです",
          }),
        }
      );

      expect(response.status).toBe(404);
      await expect(response.json()).resolves.toEqual({
        message: "Chat channel not found.",
      });
    }
  );

  it.each([
    ["create", "http://localhost/api/chats"],
    ["send", `http://localhost/api/chats/${VALID_CHANNEL_ID}/messages`],
  ])("returns 400 when %s request body is invalid JSON", async (_label, url) => {
    const { loginUseCase, sessionGateway } = await createAuthTestContext();
    const { createChatUseCase, sendMessageToChatUseCase } =
      createMessageFlowTestContext();
    const sessionToken = await sessionGateway.createSession(TEST_USER_ID);
    const app = createApiApp({
      loginUseCase,
      sessionGateway,
      createChatUseCase,
      sendMessageToChatUseCase,
    });
    const response = await app.request(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: `session=${sessionToken}`,
      },
      body: "{invalid-json",
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      message: "Request body must be valid JSON.",
    });
  });

  it.each([
    [
      "create",
      "http://localhost/api/chats",
      JSON.stringify({}),
      "message_text is required.",
    ],
    [
      "send",
      `http://localhost/api/chats/${VALID_CHANNEL_ID}/messages`,
      JSON.stringify({}),
      "message_text is required.",
    ],
    [
      "send invalid uuid",
      "http://localhost/api/chats/not-a-uuid/messages",
      JSON.stringify({ message_text: "hello" }),
      "channel_id must be a valid UUID.",
    ],
  ])(
    "returns 400 for invalid create/send input: %s",
    async (_label, url, body, expectedMessage) => {
      const { loginUseCase, sessionGateway } = await createAuthTestContext();
      const { createChatUseCase, sendMessageToChatUseCase } =
        createMessageFlowTestContext();
      const sessionToken = await sessionGateway.createSession(TEST_USER_ID);
      const app = createApiApp({
        loginUseCase,
        sessionGateway,
        createChatUseCase,
        sendMessageToChatUseCase,
      });
      const response = await app.request(url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: `session=${sessionToken}`,
        },
        body,
      });

      expect(response.status).toBe(400);
      await expect(response.json()).resolves.toEqual({
        message: expectedMessage,
      });
    }
  );

  it("updates the pending AI message to ai_timeout after 60 seconds", async () => {
    vi.useFakeTimers();

    try {
      const { loginUseCase, sessionGateway } = await createAuthTestContext();
      const { chatChannelGateway, messageGateway, sendMessageToChatUseCase } =
        createMessageFlowTestContext({
          replyFactory: async () => await new Promise<string>(() => {}),
          clockValues: [
            "2026-05-29T02:00:00.000Z",
            "2026-05-29T02:00:01.000Z",
            "2026-05-29T02:01:00.000Z",
          ],
          generatedIds: [
            "60606060-6060-4060-8060-606060606060",
            "70707070-7070-4070-8070-707070707070",
          ],
        });
      const sessionToken = await sessionGateway.createSession(TEST_USER_ID);
      const app = createApiApp({
        loginUseCase,
        sessionGateway,
        sendMessageToChatUseCase,
      });
      const response = await app.request(
        `http://localhost/api/chats/${VALID_CHANNEL_ID}/messages`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            cookie: `session=${sessionToken}`,
          },
          body: JSON.stringify({
            message_text: "タイムアウト確認",
          }),
        }
      );

      expect(response.status).toBe(200);

      await vi.advanceTimersByTimeAsync(60_000);
      await flushMicrotasks();

      const storedMessages = await messageGateway.listByChannelId(VALID_CHANNEL_ID);

      expect(storedMessages).toEqual([
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
          id: "60606060-6060-4060-8060-606060606060",
          channelId: VALID_CHANNEL_ID,
          senderType: "user",
          messageText: "タイムアウト確認",
          status: "completed",
          aiFeedback: null,
          createdAt: "2026-05-29T02:00:00.000Z",
        },
        {
          id: "70707070-7070-4070-8070-707070707070",
          channelId: VALID_CHANNEL_ID,
          senderType: "ai",
          messageText: "AI応答がありません",
          status: "ai_timeout",
          aiFeedback: null,
          createdAt: "2026-05-29T02:00:01.000Z",
        },
      ]);
      await expect(
        chatChannelGateway.findActiveOwnedById(TEST_USER_ID, VALID_CHANNEL_ID)
      ).resolves.toEqual({
        id: VALID_CHANNEL_ID,
        name: "Project Kickoff",
        lastMessagedAt: "2026-05-29T02:01:00.000Z",
      });
    } finally {
      vi.useRealTimers();
    }
  });

  it("stores feedback for a completed ai message", async () => {
    const { loginUseCase, sessionGateway } = await createAuthTestContext();
    const { messageGateway } = createMessageFlowTestContext({
      messagesByChannelId: new Map<string, ChatMessage[]>([
        [
          VALID_CHANNEL_ID,
          [
            {
              id: SECOND_MESSAGE_ID,
              channelId: VALID_CHANNEL_ID,
              senderType: "ai",
              messageText: "完成したAI回答です。",
              status: "completed",
              aiFeedback: null,
              createdAt: "2026-05-28T10:31:00.000Z",
            },
          ],
        ],
      ]),
    });
    const sessionToken = await sessionGateway.createSession(TEST_USER_ID);
    const app = createApiApp({
      loginUseCase,
      sessionGateway,
      sendMessageFeedbackUseCase: new SendMessageFeedbackUseCase({
        messageGateway,
      }),
    });
    const response = await app.request(
      `http://localhost/api/chats/${VALID_CHANNEL_ID}/messages/${SECOND_MESSAGE_ID}/feedback`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: `session=${sessionToken}`,
        },
        body: JSON.stringify({ ai_feedback: true }),
      }
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      message_id: SECOND_MESSAGE_ID,
      ai_feedback: true,
    });
    expect(messageGateway.updatedFeedbacks).toEqual([
      {
        messageId: SECOND_MESSAGE_ID,
        aiFeedback: true,
      },
    ]);
  });

  it("toggles feedback off when the same value is sent twice", async () => {
    const { loginUseCase, sessionGateway } = await createAuthTestContext();
    const { messageGateway } = createMessageFlowTestContext({
      messagesByChannelId: new Map<string, ChatMessage[]>([
        [
          VALID_CHANNEL_ID,
          [
            {
              id: SECOND_MESSAGE_ID,
              channelId: VALID_CHANNEL_ID,
              senderType: "ai",
              messageText: "すでにGood評価のAI回答です。",
              status: "completed",
              aiFeedback: true,
              createdAt: "2026-05-28T10:31:00.000Z",
            },
          ],
        ],
      ]),
    });
    const sessionToken = await sessionGateway.createSession(TEST_USER_ID);
    const app = createApiApp({
      loginUseCase,
      sessionGateway,
      sendMessageFeedbackUseCase: new SendMessageFeedbackUseCase({
        messageGateway,
      }),
    });
    const response = await app.request(
      `http://localhost/api/chats/${VALID_CHANNEL_ID}/messages/${SECOND_MESSAGE_ID}/feedback`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: `session=${sessionToken}`,
        },
        body: JSON.stringify({ ai_feedback: true }),
      }
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      message_id: SECOND_MESSAGE_ID,
      ai_feedback: null,
    });
  });

  it("returns 404 when feedback targets a non-ai or missing message", async () => {
    const { loginUseCase, sessionGateway } = await createAuthTestContext();
    const { messageGateway } = createMessageFlowTestContext();
    const sessionToken = await sessionGateway.createSession(TEST_USER_ID);
    const app = createApiApp({
      loginUseCase,
      sessionGateway,
      sendMessageFeedbackUseCase: new SendMessageFeedbackUseCase({
        messageGateway,
      }),
    });
    const response = await app.request(
      `http://localhost/api/chats/${VALID_CHANNEL_ID}/messages/${VALID_MESSAGE_ID}/feedback`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: `session=${sessionToken}`,
        },
        body: JSON.stringify({ ai_feedback: true }),
      }
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      message: "AI message not found.",
    });
  });

  it("returns 422 when feedback targets a pending ai message", async () => {
    const { loginUseCase, sessionGateway } = await createAuthTestContext();
    const { messageGateway } = createMessageFlowTestContext({
      messagesByChannelId: new Map<string, ChatMessage[]>([
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
          ],
        ],
      ]),
    });
    const sessionToken = await sessionGateway.createSession(TEST_USER_ID);
    const app = createApiApp({
      loginUseCase,
      sessionGateway,
      sendMessageFeedbackUseCase: new SendMessageFeedbackUseCase({
        messageGateway,
      }),
    });
    const response = await app.request(
      `http://localhost/api/chats/${VALID_CHANNEL_ID}/messages/${SECOND_MESSAGE_ID}/feedback`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: `session=${sessionToken}`,
        },
        body: JSON.stringify({ ai_feedback: true }),
      }
    );

    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toEqual({
      message: "Feedback is only available for completed AI messages.",
    });
  });

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
