import { relations, sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey(),
    username: text("username").notNull(),
    passwordHash: text("password_hash").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [uniqueIndex("users_username_key").on(table.username)]
);

export const chatChannels = pgTable(
  "chat_channels",
  {
    id: uuid("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    channelName: text("channel_name").notNull(),
    isDeleted: boolean("is_deleted").notNull().default(false),
    lastMessagedAt: timestamp("last_messaged_at", { withTimezone: true })
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("chat_channels_user_id_idx").on(table.userId),
    index("chat_channels_user_id_is_deleted_last_messaged_at_idx").on(
      table.userId,
      table.isDeleted,
      table.lastMessagedAt
    ),
  ]
);

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    sessionTokenHash: text("session_token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("sessions_session_token_hash_key").on(table.sessionTokenHash),
    index("sessions_user_id_idx").on(table.userId),
    index("sessions_expires_at_idx").on(table.expiresAt),
    index("sessions_revoked_at_idx").on(table.revokedAt),
  ]
);

export const messages = pgTable(
  "messages",
  {
    id: uuid("id").primaryKey(),
    channelId: uuid("channel_id")
      .notNull()
      .references(() => chatChannels.id, { onDelete: "cascade" }),
    senderType: text("sender_type").$type<"user" | "ai">().notNull(),
    messageText: text("message_text"),
    status: text("status")
      .$type<"pending" | "completed" | "ai_timeout">()
      .notNull(),
    aiFeedback: boolean("ai_feedback"),
    feedbackUpdatedAt: timestamp("feedback_updated_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("messages_channel_id_idx").on(table.channelId),
    index("messages_channel_id_created_at_idx").on(
      table.channelId,
      table.createdAt
    ),
    check(
      "messages_sender_type_check",
      sql`${table.senderType} in ('user', 'ai')`
    ),
    check(
      "messages_status_check",
      sql`${table.status} in ('pending', 'completed', 'ai_timeout')`
    ),
    check(
      "messages_state_check",
      sql`(
        ${table.senderType} = 'user'
        and ${table.status} = 'completed'
        and ${table.messageText} is not null
        and ${table.aiFeedback} is null
      ) or (
        ${table.senderType} = 'ai'
        and ${table.status} = 'pending'
        and ${table.messageText} is null
        and ${table.aiFeedback} is null
      ) or (
        ${table.senderType} = 'ai'
        and ${table.status} in ('completed', 'ai_timeout')
        and ${table.messageText} is not null
      )`
    ),
  ]
);

export const usersRelations = relations(users, ({ many }) => ({
  chatChannels: many(chatChannels),
  sessions: many(sessions),
}));

export const chatChannelsRelations = relations(chatChannels, ({ many, one }) => ({
  user: one(users, {
    fields: [chatChannels.userId],
    references: [users.id],
  }),
  messages: many(messages),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  chatChannel: one(chatChannels, {
    fields: [messages.channelId],
    references: [chatChannels.id],
  }),
}));

export type UserRecord = typeof users.$inferSelect;
export type NewUserRecord = typeof users.$inferInsert;
export type SessionRecord = typeof sessions.$inferSelect;
export type NewSessionRecord = typeof sessions.$inferInsert;
export type ChatChannelRecord = typeof chatChannels.$inferSelect;
export type NewChatChannelRecord = typeof chatChannels.$inferInsert;
export type MessageRecord = typeof messages.$inferSelect;
export type NewMessageRecord = typeof messages.$inferInsert;
