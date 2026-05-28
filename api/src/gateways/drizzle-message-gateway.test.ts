import fs from "node:fs";

import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import type { NodePgClient } from "drizzle-orm/node-postgres";
import { newDb } from "pg-mem";

import type { Database } from "@/db/client";
import { chatChannels, messages, users } from "@/db/schema";
import { DrizzleMessageGateway } from "@/gateways/drizzle-message-gateway";

const TEST_USER_ID = "11111111-1111-4111-8111-111111111111";
const OTHER_USER_ID = "22222222-2222-4222-8222-222222222222";
const TEST_CHANNEL_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const OTHER_CHANNEL_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

const migrationPaths = [
  new URL("../db/migrations/0000_users_and_sessions.sql", import.meta.url),
  new URL("../db/migrations/0001_chat_channels_and_messages.sql", import.meta.url),
  new URL(
    "../db/migrations/0002_messages_pending_ai_unique_index.sql",
    import.meta.url
  ),
] as const;

const createTestDatabase = (): Database => {
  const memoryDatabase = newDb({ autoCreateForeignKeyIndices: false });

  for (const migrationPath of migrationPaths) {
    const statements = fs
      .readFileSync(migrationPath, "utf8")
      .split("--> statement-breakpoint")
      .map((statement) => statement.trim())
      .filter((statement) => statement.length > 0);

    for (const statement of statements) {
      memoryDatabase.public.none(statement);
    }
  }

  const { Pool: MemoryPool } = memoryDatabase.adapters.createPg();
  const rawClient = new MemoryPool();
  const client = {
    async query(
      query:
        | string
        | {
            readonly text: string;
            readonly values?: ReadonlyArray<unknown>;
            readonly rowMode?: string;
            readonly types?: unknown;
          },
      values?: ReadonlyArray<unknown>
    ) {
      if (typeof query === "string") {
        return rawClient.query(query, values);
      }

      const { rowMode, ...queryWithoutPgFeatures } = query;
      delete queryWithoutPgFeatures.types;
      const result = await rawClient.query(queryWithoutPgFeatures, values);

      if (rowMode !== "array") {
        return result;
      }

      return {
        ...result,
        rows: result.rows.map((row: Record<string, unknown>) => Object.values(row)),
      };
    },
  } as unknown as NodePgClient;

  return drizzle(client, {
    schema: {
      chatChannels,
      messages,
      users,
    },
  }) as unknown as Database;
};

const insertUser = async (database: Database, id: string, username: string) => {
  const now = new Date("2026-05-28T00:00:00.000Z");

  await database.insert(users).values({
    id,
    username,
    passwordHash: "hashed-password",
    createdAt: now,
    updatedAt: now,
  });
};

const insertChannel = async (
  database: Database,
  channel: {
    readonly id: string;
    readonly userId: string;
    readonly name: string;
    readonly lastMessagedAt: string;
    readonly isDeleted?: boolean;
  }
) => {
  const now = new Date("2026-05-28T00:00:00.000Z");

  await database.insert(chatChannels).values({
    id: channel.id,
    userId: channel.userId,
    channelName: channel.name,
    isDeleted: channel.isDeleted ?? false,
    lastMessagedAt: new Date(channel.lastMessagedAt),
    createdAt: now,
    updatedAt: now,
  });
};

const insertMessage = async (
  database: Database,
  message: {
    readonly id: string;
    readonly channelId: string;
    readonly senderType: "user" | "ai";
    readonly messageText: string | null;
    readonly status: "pending" | "completed" | "ai_timeout";
    readonly aiFeedback: boolean | null;
    readonly createdAt: string;
  }
) => {
  await database.insert(messages).values({
    id: message.id,
    channelId: message.channelId,
    senderType: message.senderType,
    messageText: message.messageText,
    status: message.status,
    aiFeedback: message.aiFeedback,
    feedbackUpdatedAt:
      message.aiFeedback === null ? null : new Date(message.createdAt),
    createdAt: new Date(message.createdAt),
  });
};

describe("DrizzleMessageGateway", () => {
  let database: Database;
  let gateway: DrizzleMessageGateway;

  beforeEach(async () => {
    database = createTestDatabase();
    gateway = new DrizzleMessageGateway(database);

    await insertUser(database, TEST_USER_ID, "test-user");
    await insertUser(database, OTHER_USER_ID, "other-user");
    await insertChannel(database, {
      id: TEST_CHANNEL_ID,
      userId: TEST_USER_ID,
      name: "Visible Channel",
      lastMessagedAt: "2026-05-28T08:00:00.000Z",
    });
    await insertChannel(database, {
      id: OTHER_CHANNEL_ID,
      userId: OTHER_USER_ID,
      name: "Other User Channel",
      lastMessagedAt: "2026-05-28T07:00:00.000Z",
    });
  });

  it("creates a user message with completed status", async () => {
    const createdMessage = await gateway.createMessage({
      id: "11111111-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      channelId: TEST_CHANNEL_ID,
      senderType: "user",
      messageText: "user message",
      status: "completed",
      aiFeedback: null,
      createdAt: "2026-05-28T10:00:00.000Z",
    });

    expect(createdMessage).toEqual({
      id: "11111111-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      channelId: TEST_CHANNEL_ID,
      senderType: "user",
      messageText: "user message",
      status: "completed",
      aiFeedback: null,
      createdAt: "2026-05-28T10:00:00.000Z",
    });
  });

  it("creates a pending ai message with nullable message_text", async () => {
    const createdMessage = await gateway.createMessage({
      id: "22222222-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      channelId: TEST_CHANNEL_ID,
      senderType: "ai",
      messageText: null,
      status: "pending",
      aiFeedback: null,
      createdAt: "2026-05-28T10:01:00.000Z",
    });

    expect(createdMessage).toEqual({
      id: "22222222-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      channelId: TEST_CHANNEL_ID,
      senderType: "ai",
      messageText: null,
      status: "pending",
      aiFeedback: null,
      createdAt: "2026-05-28T10:01:00.000Z",
    });
  });

  it("appends a user message and pending ai message atomically and bumps channel last_messaged_at", async () => {
    const result = await gateway.appendUserMessageWithPendingAiMessage({
      channelId: TEST_CHANNEL_ID,
      userMessage: {
        id: "33333333-cccc-4ccc-8ccc-cccccccccccc",
        channelId: TEST_CHANNEL_ID,
        senderType: "user",
        messageText: "hello",
        status: "completed",
        aiFeedback: null,
        createdAt: "2026-05-28T10:02:00.000Z",
      },
      pendingAiMessage: {
        id: "44444444-dddd-4ddd-8ddd-dddddddddddd",
        channelId: TEST_CHANNEL_ID,
        senderType: "ai",
        messageText: null,
        status: "pending",
        aiFeedback: null,
        createdAt: "2026-05-28T10:03:00.000Z",
      },
    });

    expect(result).toEqual({
      userMessage: {
        id: "33333333-cccc-4ccc-8ccc-cccccccccccc",
        channelId: TEST_CHANNEL_ID,
        senderType: "user",
        messageText: "hello",
        status: "completed",
        aiFeedback: null,
        createdAt: "2026-05-28T10:02:00.000Z",
      },
      pendingAiMessage: {
        id: "44444444-dddd-4ddd-8ddd-dddddddddddd",
        channelId: TEST_CHANNEL_ID,
        senderType: "ai",
        messageText: null,
        status: "pending",
        aiFeedback: null,
        createdAt: "2026-05-28T10:03:00.000Z",
      },
    });

    await expect(gateway.listByChannelId(TEST_CHANNEL_ID)).resolves.toEqual([
      {
        id: "33333333-cccc-4ccc-8ccc-cccccccccccc",
        channelId: TEST_CHANNEL_ID,
        senderType: "user",
        messageText: "hello",
        status: "completed",
        aiFeedback: null,
        createdAt: "2026-05-28T10:02:00.000Z",
      },
      {
        id: "44444444-dddd-4ddd-8ddd-dddddddddddd",
        channelId: TEST_CHANNEL_ID,
        senderType: "ai",
        messageText: null,
        status: "pending",
        aiFeedback: null,
        createdAt: "2026-05-28T10:03:00.000Z",
      },
    ]);

    const [storedChannel] = await database
      .select({
        lastMessagedAt: chatChannels.lastMessagedAt,
      })
      .from(chatChannels)
      .where(eq(chatChannels.id, TEST_CHANNEL_ID));

    expect(storedChannel).toEqual({
      lastMessagedAt: new Date("2026-05-28T10:03:00.000Z"),
    });
  });

  it("rolls back the bundle when another pending ai message already exists", async () => {
    await insertMessage(database, {
      id: "55555555-eeee-4eee-8eee-eeeeeeeeeeee",
      channelId: TEST_CHANNEL_ID,
      senderType: "ai",
      messageText: null,
      status: "pending",
      aiFeedback: null,
      createdAt: "2026-05-28T10:04:00.000Z",
    });

    await expect(
      gateway.appendUserMessageWithPendingAiMessage({
        channelId: TEST_CHANNEL_ID,
        userMessage: {
          id: "66666666-ffff-4fff-8fff-ffffffffffff",
          channelId: TEST_CHANNEL_ID,
          senderType: "user",
          messageText: "should rollback",
          status: "completed",
          aiFeedback: null,
          createdAt: "2026-05-28T10:05:00.000Z",
        },
        pendingAiMessage: {
          id: "77777777-1111-4111-8111-111111111111",
          channelId: TEST_CHANNEL_ID,
          senderType: "ai",
          messageText: null,
          status: "pending",
          aiFeedback: null,
          createdAt: "2026-05-28T10:06:00.000Z",
        },
      })
    ).rejects.toMatchObject({
      message: "Pending AI response already exists.",
      statusCode: 422,
    });

    await expect(gateway.listByChannelId(TEST_CHANNEL_ID)).resolves.toEqual([
      {
        id: "55555555-eeee-4eee-8eee-eeeeeeeeeeee",
        channelId: TEST_CHANNEL_ID,
        senderType: "ai",
        messageText: null,
        status: "pending",
        aiFeedback: null,
        createdAt: "2026-05-28T10:04:00.000Z",
      },
    ]);
  });

  it("updates ai message status and bumps channel last_messaged_at in one operation", async () => {
    await insertMessage(database, {
      id: "88888888-2222-4222-8222-222222222222",
      channelId: TEST_CHANNEL_ID,
      senderType: "ai",
      messageText: null,
      status: "pending",
      aiFeedback: null,
      createdAt: "2026-05-28T10:07:00.000Z",
    });

    await gateway.updateAiMessage("88888888-2222-4222-8222-222222222222", {
      channelId: TEST_CHANNEL_ID,
      status: "completed",
      messageText: "completed reply",
      lastMessagedAt: "2026-05-28T10:08:00.000Z",
    });

    const [storedMessage] = await database
      .select({
        status: messages.status,
        messageText: messages.messageText,
      })
      .from(messages)
      .where(eq(messages.id, "88888888-2222-4222-8222-222222222222"));

    expect(storedMessage).toEqual({
      status: "completed",
      messageText: "completed reply",
    });

    const [storedChannel] = await database
      .select({
        lastMessagedAt: chatChannels.lastMessagedAt,
      })
      .from(chatChannels)
      .where(eq(chatChannels.id, TEST_CHANNEL_ID));

    expect(storedChannel).toEqual({
      lastMessagedAt: new Date("2026-05-28T10:08:00.000Z"),
    });
  });

  it("lists channel messages in created_at ascending order and respects active ownership", async () => {
    await insertMessage(database, {
      id: "99999999-3333-4333-8333-333333333333",
      channelId: TEST_CHANNEL_ID,
      senderType: "ai",
      messageText: "later reply",
      status: "completed",
      aiFeedback: true,
      createdAt: "2026-05-28T10:10:00.000Z",
    });
    await insertMessage(database, {
      id: "aaaaaaaa-4444-4444-8444-444444444444",
      channelId: TEST_CHANNEL_ID,
      senderType: "user",
      messageText: "earlier user message",
      status: "completed",
      aiFeedback: null,
      createdAt: "2026-05-28T10:09:00.000Z",
    });
    await insertMessage(database, {
      id: "bbbbbbbb-5555-4555-8555-555555555555",
      channelId: OTHER_CHANNEL_ID,
      senderType: "user",
      messageText: "other user message",
      status: "completed",
      aiFeedback: null,
      createdAt: "2026-05-28T10:11:00.000Z",
    });
    await database
      .update(chatChannels)
      .set({
        isDeleted: true,
      })
      .where(eq(chatChannels.id, OTHER_CHANNEL_ID));

    await expect(gateway.listByChannelId(TEST_CHANNEL_ID)).resolves.toEqual([
      {
        id: "aaaaaaaa-4444-4444-8444-444444444444",
        channelId: TEST_CHANNEL_ID,
        senderType: "user",
        messageText: "earlier user message",
        status: "completed",
        aiFeedback: null,
        createdAt: "2026-05-28T10:09:00.000Z",
      },
      {
        id: "99999999-3333-4333-8333-333333333333",
        channelId: TEST_CHANNEL_ID,
        senderType: "ai",
        messageText: "later reply",
        status: "completed",
        aiFeedback: true,
        createdAt: "2026-05-28T10:10:00.000Z",
      },
    ]);
    await expect(
      gateway.listByActiveOwnedChannelId(TEST_USER_ID, TEST_CHANNEL_ID)
    ).resolves.toEqual([
      {
        id: "aaaaaaaa-4444-4444-8444-444444444444",
        channelId: TEST_CHANNEL_ID,
        senderType: "user",
        messageText: "earlier user message",
        status: "completed",
        aiFeedback: null,
        createdAt: "2026-05-28T10:09:00.000Z",
      },
      {
        id: "99999999-3333-4333-8333-333333333333",
        channelId: TEST_CHANNEL_ID,
        senderType: "ai",
        messageText: "later reply",
        status: "completed",
        aiFeedback: true,
        createdAt: "2026-05-28T10:10:00.000Z",
      },
    ]);
    await expect(
      gateway.listByActiveOwnedChannelId(OTHER_USER_ID, OTHER_CHANNEL_ID)
    ).resolves.toEqual([]);
  });

  it("validates lastMessagedAt input when updating ai message", async () => {
    await insertMessage(database, {
      id: "cccccccc-6666-4666-8666-666666666666",
      channelId: TEST_CHANNEL_ID,
      senderType: "ai",
      messageText: null,
      status: "pending",
      aiFeedback: null,
      createdAt: "2026-05-28T10:12:00.000Z",
    });

    await expect(
      gateway.updateAiMessage("cccccccc-6666-4666-8666-666666666666", {
        channelId: TEST_CHANNEL_ID,
        status: "ai_timeout",
        messageText: "AI応答がありません",
        lastMessagedAt: "not-a-datetime",
      })
    ).rejects.toMatchObject({
      message: "lastMessagedAt must be a valid ISO 8601 datetime.",
      statusCode: 400,
    });
  });
});
