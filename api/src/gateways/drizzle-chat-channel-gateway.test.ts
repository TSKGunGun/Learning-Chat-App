import fs from "node:fs";

import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import type { NodePgClient } from "drizzle-orm/node-postgres";
import { newDb } from "pg-mem";

import type { Database } from "@/db/client";
import { chatChannels, messages, users } from "@/db/schema";
import { DrizzleChatChannelGateway } from "@/gateways/drizzle-chat-channel-gateway";

const TEST_USER_ID = "11111111-1111-4111-8111-111111111111";
const OTHER_USER_ID = "22222222-2222-4222-8222-222222222222";

const migrationPaths = [
  new URL("../db/migrations/0000_users_and_sessions.sql", import.meta.url),
  new URL("../db/migrations/0001_chat_channels_and_messages.sql", import.meta.url),
] as const;

const createTestDatabase = (): Database => {
  const memoryDatabase = newDb({ autoCreateForeignKeyIndices: false });

  for (const migrationPath of migrationPaths) {
    const statements = fs
      .readFileSync(migrationPath, "utf8")
      .split("--> statement-breakpoint")
      .map((statement) => statement.trim())
      .filter(
        (statement) =>
          statement.length > 0 &&
          !statement.startsWith("CREATE INDEX") &&
          !statement.startsWith("CREATE UNIQUE INDEX")
      );

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
  }) as Database;
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

const insertCompletedUserMessage = async (
  database: Database,
  message: {
    readonly id: string;
    readonly channelId: string;
    readonly createdAt: string;
  }
) => {
  await database.insert(messages).values({
    id: message.id,
    channelId: message.channelId,
    senderType: "user",
    messageText: `message-${message.id}`,
    status: "completed",
    aiFeedback: null,
    feedbackUpdatedAt: null,
    createdAt: new Date(message.createdAt),
  });
};

describe("DrizzleChatChannelGateway", () => {
  let database: Database;
  let gateway: DrizzleChatChannelGateway;

  beforeEach(async () => {
    database = createTestDatabase();
    gateway = new DrizzleChatChannelGateway(database);

    await insertUser(database, TEST_USER_ID, "test-user");
    await insertUser(database, OTHER_USER_ID, "other-user");
  });

  it("lists only active channels for the user that have messages, ordered by last_messaged_at desc", async () => {
    await insertChannel(database, {
      id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      userId: TEST_USER_ID,
      name: "Newest Visible",
      lastMessagedAt: "2026-05-28T10:30:00.000Z",
    });
    await insertChannel(database, {
      id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      userId: TEST_USER_ID,
      name: "Older Visible",
      lastMessagedAt: "2026-05-27T09:00:00.000Z",
    });
    await insertChannel(database, {
      id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
      userId: TEST_USER_ID,
      name: "No Messages",
      lastMessagedAt: "2026-05-29T08:00:00.000Z",
    });
    await insertChannel(database, {
      id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
      userId: TEST_USER_ID,
      name: "Deleted Channel",
      lastMessagedAt: "2026-05-30T08:00:00.000Z",
      isDeleted: true,
    });
    await insertChannel(database, {
      id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
      userId: OTHER_USER_ID,
      name: "Other User Channel",
      lastMessagedAt: "2026-05-31T08:00:00.000Z",
    });

    await insertCompletedUserMessage(database, {
      id: "11111111-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      channelId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      createdAt: "2026-05-28T10:30:00.000Z",
    });
    await insertCompletedUserMessage(database, {
      id: "11111111-ffff-4fff-8fff-ffffffffffff",
      channelId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      createdAt: "2026-05-28T10:31:00.000Z",
    });
    await insertCompletedUserMessage(database, {
      id: "22222222-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      channelId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      createdAt: "2026-05-27T09:00:00.000Z",
    });
    await insertCompletedUserMessage(database, {
      id: "33333333-dddd-4ddd-8ddd-dddddddddddd",
      channelId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
      createdAt: "2026-05-30T08:00:00.000Z",
    });
    await insertCompletedUserMessage(database, {
      id: "44444444-eeee-4eee-8eee-eeeeeeeeeeee",
      channelId: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
      createdAt: "2026-05-31T08:00:00.000Z",
    });

    await expect(gateway.listActiveByUserId(TEST_USER_ID)).resolves.toEqual([
      {
        id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        name: "Newest Visible",
        lastMessagedAt: "2026-05-28T10:30:00.000Z",
      },
      {
        id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        name: "Older Visible",
        lastMessagedAt: "2026-05-27T09:00:00.000Z",
      },
    ]);
  });

  it("finds only active channels owned by the user", async () => {
    await insertChannel(database, {
      id: "abababab-abab-4bab-8bab-abababababab",
      userId: TEST_USER_ID,
      name: "Visible Channel",
      lastMessagedAt: "2026-05-28T10:30:00.000Z",
    });
    await insertChannel(database, {
      id: "cdcdcdcd-cdcd-4dcd-8dcd-cdcdcdcdcdcd",
      userId: TEST_USER_ID,
      name: "Deleted Channel",
      lastMessagedAt: "2026-05-28T11:30:00.000Z",
      isDeleted: true,
    });
    await insertChannel(database, {
      id: "efefefef-efef-4fef-8fef-efefefefefef",
      userId: OTHER_USER_ID,
      name: "Other User Channel",
      lastMessagedAt: "2026-05-28T12:30:00.000Z",
    });

    await expect(
      gateway.findActiveOwnedById(
        TEST_USER_ID,
        "abababab-abab-4bab-8bab-abababababab"
      )
    ).resolves.toEqual({
      id: "abababab-abab-4bab-8bab-abababababab",
      name: "Visible Channel",
      lastMessagedAt: "2026-05-28T10:30:00.000Z",
    });
    await expect(
      gateway.findActiveOwnedById(
        TEST_USER_ID,
        "cdcdcdcd-cdcd-4dcd-8dcd-cdcdcdcdcdcd"
      )
    ).resolves.toBeNull();
    await expect(
      gateway.findActiveOwnedById(
        TEST_USER_ID,
        "efefefef-efef-4fef-8fef-efefefefefef"
      )
    ).resolves.toBeNull();
  });

  it("creates a channel and persists the record", async () => {
    const createdChannel = await gateway.create({
      id: "ffffffff-ffff-4fff-8fff-ffffffffffff",
      userId: TEST_USER_ID,
      name: "Fresh Channel",
      lastMessagedAt: "2026-05-28T11:00:00.000Z",
    });

    expect(createdChannel).toEqual({
      id: "ffffffff-ffff-4fff-8fff-ffffffffffff",
      name: "Fresh Channel",
      lastMessagedAt: "2026-05-28T11:00:00.000Z",
    });

    const [storedChannel] = await database
      .select({
        id: chatChannels.id,
        userId: chatChannels.userId,
        channelName: chatChannels.channelName,
        isDeleted: chatChannels.isDeleted,
        lastMessagedAt: chatChannels.lastMessagedAt,
      })
      .from(chatChannels)
      .where(eq(chatChannels.id, "ffffffff-ffff-4fff-8fff-ffffffffffff"));

    expect(storedChannel).toEqual({
      id: "ffffffff-ffff-4fff-8fff-ffffffffffff",
      userId: TEST_USER_ID,
      channelName: "Fresh Channel",
      isDeleted: false,
      lastMessagedAt: new Date("2026-05-28T11:00:00.000Z"),
    });
  });

  it("rejects create when lastMessagedAt is not a valid ISO 8601 datetime", async () => {
    await expect(
      gateway.create({
        id: "99999999-9999-4999-8999-999999999999",
        userId: TEST_USER_ID,
        name: "Broken Channel",
        lastMessagedAt: "not-a-datetime",
      })
    ).rejects.toMatchObject({
      message: "lastMessagedAt must be a valid ISO 8601 datetime.",
      statusCode: 400,
    });
  });

  it("soft deletes an owned active channel", async () => {
    await insertChannel(database, {
      id: "12121212-1212-4121-8121-121212121212",
      userId: TEST_USER_ID,
      name: "Delete Me",
      lastMessagedAt: "2026-05-28T09:00:00.000Z",
    });
    await insertCompletedUserMessage(database, {
      id: "56565656-5656-4565-8565-565656565656",
      channelId: "12121212-1212-4121-8121-121212121212",
      createdAt: "2026-05-28T09:00:00.000Z",
    });

    await expect(
      gateway.softDeleteOwnedById(
        TEST_USER_ID,
        "12121212-1212-4121-8121-121212121212"
      )
    ).resolves.toBe(true);

    const [storedChannel] = await database
      .select({
        isDeleted: chatChannels.isDeleted,
      })
      .from(chatChannels)
      .where(eq(chatChannels.id, "12121212-1212-4121-8121-121212121212"));

    expect(storedChannel).toEqual({
      isDeleted: true,
    });
    await expect(gateway.listActiveByUserId(TEST_USER_ID)).resolves.toEqual([]);
  });

  it("updates last_messaged_at only for owned active channels", async () => {
    await insertChannel(database, {
      id: "13131313-1313-4131-8131-131313131313",
      userId: TEST_USER_ID,
      name: "Original Newest",
      lastMessagedAt: "2026-05-28T10:30:00.000Z",
    });
    await insertChannel(database, {
      id: "14141414-1414-4141-8141-141414141414",
      userId: TEST_USER_ID,
      name: "To Be Bumped",
      lastMessagedAt: "2026-05-27T09:00:00.000Z",
    });
    await insertChannel(database, {
      id: "15151515-1515-4151-8151-151515151515",
      userId: OTHER_USER_ID,
      name: "Other User Channel",
      lastMessagedAt: "2026-05-27T08:00:00.000Z",
    });
    await insertChannel(database, {
      id: "16161616-1616-4161-8161-161616161616",
      userId: TEST_USER_ID,
      name: "Deleted Channel",
      lastMessagedAt: "2026-05-27T07:00:00.000Z",
      isDeleted: true,
    });
    await insertCompletedUserMessage(database, {
      id: "67676767-6767-4676-8676-676767676767",
      channelId: "13131313-1313-4131-8131-131313131313",
      createdAt: "2026-05-28T10:30:00.000Z",
    });
    await insertCompletedUserMessage(database, {
      id: "78787878-7878-4787-8787-787878787878",
      channelId: "14141414-1414-4141-8141-141414141414",
      createdAt: "2026-05-27T09:00:00.000Z",
    });

    await expect(
      gateway.updateLastMessagedAtOwnedById(
        TEST_USER_ID,
        "14141414-1414-4141-8141-141414141414",
        "2026-05-28T12:00:00.000Z"
      )
    ).resolves.toBe(true);
    await expect(
      gateway.updateLastMessagedAtOwnedById(
        TEST_USER_ID,
        "15151515-1515-4151-8151-151515151515",
        "2026-05-28T12:30:00.000Z"
      )
    ).resolves.toBe(false);
    await expect(
      gateway.updateLastMessagedAtOwnedById(
        TEST_USER_ID,
        "16161616-1616-4161-8161-161616161616",
        "2026-05-28T13:00:00.000Z"
      )
    ).resolves.toBe(false);
    await expect(
      gateway.updateLastMessagedAtOwnedById(
        TEST_USER_ID,
        "14141414-1414-4141-8141-141414141414",
        "not-a-datetime"
      )
    ).rejects.toMatchObject({
      message: "lastMessagedAt must be a valid ISO 8601 datetime.",
      statusCode: 400,
    });

    const [storedChannel] = await database
      .select({
        lastMessagedAt: chatChannels.lastMessagedAt,
      })
      .from(chatChannels)
      .where(eq(chatChannels.id, "14141414-1414-4141-8141-141414141414"));

    expect(storedChannel).toEqual({
      lastMessagedAt: new Date("2026-05-28T12:00:00.000Z"),
    });
    await expect(gateway.listActiveByUserId(TEST_USER_ID)).resolves.toEqual([
      {
        id: "14141414-1414-4141-8141-141414141414",
        name: "To Be Bumped",
        lastMessagedAt: "2026-05-28T12:00:00.000Z",
      },
      {
        id: "13131313-1313-4131-8131-131313131313",
        name: "Original Newest",
        lastMessagedAt: "2026-05-28T10:30:00.000Z",
      },
    ]);
  });
});
