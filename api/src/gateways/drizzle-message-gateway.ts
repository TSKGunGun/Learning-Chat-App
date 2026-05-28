import { and, asc, eq } from "drizzle-orm";

import type { Database } from "@/db/client";
import { chatChannels, messages } from "@/db/schema";
import type { ChatMessage } from "@/entities/chat-message";
import type { MessageGateway } from "@/gateways/message-gateway";

const mapChatMessage = (record: {
  readonly id: string;
  readonly channelId: string;
  readonly senderType: "user" | "ai";
  readonly messageText: string | null;
  readonly status: "pending" | "completed" | "ai_timeout";
  readonly aiFeedback: boolean | null;
  readonly createdAt: Date;
}): ChatMessage => ({
  id: record.id,
  channelId: record.channelId,
  senderType: record.senderType,
  messageText: record.messageText,
  status: record.status,
  aiFeedback: record.aiFeedback,
  createdAt: record.createdAt.toISOString(),
});

export class DrizzleMessageGateway implements MessageGateway {
  public constructor(private readonly database: Database) {}

  public async listByChannelId(
    channelId: string
  ): Promise<ReadonlyArray<ChatMessage>> {
    const rows = await this.database
      .select({
        id: messages.id,
        channelId: messages.channelId,
        senderType: messages.senderType,
        messageText: messages.messageText,
        status: messages.status,
        aiFeedback: messages.aiFeedback,
        createdAt: messages.createdAt,
      })
      .from(messages)
      .where(eq(messages.channelId, channelId))
      .orderBy(asc(messages.createdAt));

    return rows.map(mapChatMessage);
  }

  public async listByActiveOwnedChannelId(
    userId: string,
    channelId: string
  ): Promise<ReadonlyArray<ChatMessage>> {
    const rows = await this.database
      .select({
        id: messages.id,
        channelId: messages.channelId,
        senderType: messages.senderType,
        messageText: messages.messageText,
        status: messages.status,
        aiFeedback: messages.aiFeedback,
        createdAt: messages.createdAt,
      })
      .from(messages)
      .innerJoin(chatChannels, eq(messages.channelId, chatChannels.id))
      .where(
        and(
          eq(messages.channelId, channelId),
          eq(chatChannels.userId, userId),
          eq(chatChannels.isDeleted, false)
        )
      )
      .orderBy(asc(messages.createdAt));

    return rows.map(mapChatMessage);
  }

  public async createMessage(message: ChatMessage): Promise<ChatMessage> {
    const [createdMessage] = await this.database
      .insert(messages)
      .values({
        id: message.id,
        channelId: message.channelId,
        senderType: message.senderType,
        messageText: message.messageText,
        status: message.status,
        aiFeedback: message.aiFeedback,
        feedbackUpdatedAt:
          message.aiFeedback === null ? null : new Date(message.createdAt),
        createdAt: new Date(message.createdAt),
      })
      .returning({
        id: messages.id,
        channelId: messages.channelId,
        senderType: messages.senderType,
        messageText: messages.messageText,
        status: messages.status,
        aiFeedback: messages.aiFeedback,
        createdAt: messages.createdAt,
      });

    return mapChatMessage(createdMessage);
  }

  public async updateMessageFeedback(
    messageId: string,
    feedback: boolean | null
  ): Promise<void> {
    await this.database
      .update(messages)
      .set({
        aiFeedback: feedback,
        feedbackUpdatedAt: new Date(),
      })
      .where(eq(messages.id, messageId));
  }
}
