import crypto from "node:crypto";

import bcrypt from "bcryptjs";
import { eq, sql } from "drizzle-orm";

import { createDatabaseConnection } from "./client";
import { getDevSeedConfig } from "./env";
import { chatChannels, messages, sessions, users } from "./schema";

const SEEDED_CHANNEL_FIXTURES = [
  {
    id: "34d6763f-d7d2-46d1-89b8-5f8c17db61eb",
    channelName: "自己学習ルールの整理",
    lastMessagedAt: new Date("2026-05-28T09:45:00.000Z"),
    messages: [
      {
        id: "acfc27ea-c10b-47e2-92ec-d0a62bb9d373",
        senderType: "user" as const,
        messageText: "訂正ルールの見直し観点を整理したいです。",
        status: "completed" as const,
        aiFeedback: null,
        createdAt: new Date("2026-05-28T09:44:00.000Z"),
      },
      {
        id: "b8ad7ba0-a891-4997-80a1-93a8ff58f487",
        senderType: "ai" as const,
        messageText:
          "過去の訂正履歴から再発しやすい指摘をまとめて確認しましょう。",
        status: "completed" as const,
        aiFeedback: true,
        createdAt: new Date("2026-05-28T09:45:00.000Z"),
      },
    ],
  },
  {
    id: "3c804a40-93ca-45b4-a169-b49eea7ba544",
    channelName: "トップ画面 2 ペイン構成",
    lastMessagedAt: new Date("2026-05-27T12:15:00.000Z"),
    messages: [
      {
        id: "0cd6488f-6ad2-4e25-b18d-df06350636ef",
        senderType: "user" as const,
        messageText:
          "モバイルのドロワー表示も今回の範囲に含めたいです。",
        status: "completed" as const,
        aiFeedback: null,
        createdAt: new Date("2026-05-27T12:14:00.000Z"),
      },
      {
        id: "9fca65af-ebf3-4296-b20d-b19614f6ec31",
        senderType: "ai" as const,
        messageText:
          "一覧操作を優先しつつ、モバイルではドロワー型サイドバーへ切り替えます。",
        status: "completed" as const,
        aiFeedback: false,
        createdAt: new Date("2026-05-27T12:15:00.000Z"),
      },
    ],
  },
  {
    id: "87db15fd-b32e-4665-af91-d80cb7b13772",
    channelName: "AI 応答待ちの確認",
    lastMessagedAt: new Date("2026-05-26T06:30:00.000Z"),
    messages: [
      {
        id: "8c54f95a-6ed7-4cdc-89da-cd9e4883c7a2",
        senderType: "user" as const,
        messageText: "ポーリング対象の見せ方も確認したいです。",
        status: "completed" as const,
        aiFeedback: null,
        createdAt: new Date("2026-05-26T06:29:00.000Z"),
      },
      {
        id: "7ac241f5-d9f2-4221-ad04-7f0c1d6641c5",
        senderType: "ai" as const,
        messageText: null,
        status: "pending" as const,
        aiFeedback: null,
        createdAt: new Date("2026-05-26T06:30:00.000Z"),
      },
    ],
  },
] as const;

const seed = async (): Promise<void> => {
  const { pool, database } = createDatabaseConnection();
  const { password, saltRounds, username } = getDevSeedConfig();
  const passwordHash = await bcrypt.hash(password, saltRounds);

  try {
    const [seededUser] = await database
      .insert(users)
      .values({
        id: crypto.randomUUID(),
        username,
        passwordHash,
      })
      .onConflictDoUpdate({
        target: users.username,
        set: {
          passwordHash,
          updatedAt: sql`now()`,
        },
      })
      .returning({
        id: users.id,
        username: users.username,
      });

    await database.delete(sessions).where(eq(sessions.userId, seededUser.id));
    await database
      .delete(chatChannels)
      .where(eq(chatChannels.userId, seededUser.id));

    await database.insert(chatChannels).values(
      SEEDED_CHANNEL_FIXTURES.map((channel) => ({
        id: channel.id,
        userId: seededUser.id,
        channelName: channel.channelName,
        isDeleted: false,
        lastMessagedAt: channel.lastMessagedAt,
        createdAt: channel.messages[0].createdAt,
        updatedAt: channel.lastMessagedAt,
      }))
    );

    await database.insert(messages).values(
      SEEDED_CHANNEL_FIXTURES.flatMap((channel) =>
        channel.messages.map((message) => ({
          id: message.id,
          channelId: channel.id,
          senderType: message.senderType,
          messageText: message.messageText,
          status: message.status,
          aiFeedback: message.aiFeedback,
          feedbackUpdatedAt:
            message.aiFeedback === null ? null : message.createdAt,
          createdAt: message.createdAt,
        }))
      )
    );

    console.info(
      `Seeded development user "${seededUser.username}" with ${SEEDED_CHANNEL_FIXTURES.length} chat channels and cleared existing sessions.`
    );
  } finally {
    await pool.end();
  }
};

seed().catch((error: unknown) => {
  console.error("Failed to seed the development user.", error);
  process.exitCode = 1;
});
