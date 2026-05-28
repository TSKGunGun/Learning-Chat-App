import { and, desc, eq } from "drizzle-orm";

import type { Database } from "@/db/client";
import { chatChannels, messages } from "@/db/schema";
import type { ChatChannel } from "@/entities/chat-channel";
import type {
  ChatChannelGateway,
  CreateChatChannelInput,
} from "@/gateways/chat-channel-gateway";
import { ApplicationError } from "@/shared/errors/application-error";

const mapChatChannel = (record: {
  readonly id: string;
  readonly channelName: string;
  readonly lastMessagedAt: Date;
}): ChatChannel => ({
  id: record.id,
  name: record.channelName,
  lastMessagedAt: record.lastMessagedAt.toISOString(),
});

const iso8601DateTimePattern =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/;

const parseLastMessagedAt = (lastMessagedAtValue: string): Date => {
  if (!iso8601DateTimePattern.test(lastMessagedAtValue)) {
    throw new ApplicationError(
      "lastMessagedAt must be a valid ISO 8601 datetime.",
      400
    );
  }

  const lastMessagedAt = new Date(lastMessagedAtValue);

  if (Number.isNaN(lastMessagedAt.getTime())) {
    throw new ApplicationError(
      "lastMessagedAt must be a valid ISO 8601 datetime.",
      400
    );
  }

  return lastMessagedAt;
};

export class DrizzleChatChannelGateway implements ChatChannelGateway {
  public constructor(private readonly database: Database) {}

  public async listActiveByUserId(
    userId: string
  ): Promise<ReadonlyArray<ChatChannel>> {
    const messageChannels = this.database
      .select({
        channelId: messages.channelId,
      })
      .from(messages)
      .groupBy(messages.channelId)
      .as("message_channels");

    const rows = await this.database
      .select({
        id: chatChannels.id,
        channelName: chatChannels.channelName,
        lastMessagedAt: chatChannels.lastMessagedAt,
      })
      .from(chatChannels)
      .innerJoin(messageChannels, eq(messageChannels.channelId, chatChannels.id))
      .where(
        and(
          eq(chatChannels.userId, userId),
          eq(chatChannels.isDeleted, false)
        )
      )
      .orderBy(desc(chatChannels.lastMessagedAt));

    return rows.map(mapChatChannel);
  }

  public async findActiveOwnedById(
    userId: string,
    channelId: string
  ): Promise<ChatChannel | null> {
    const [row] = await this.database
      .select({
        id: chatChannels.id,
        channelName: chatChannels.channelName,
        lastMessagedAt: chatChannels.lastMessagedAt,
      })
      .from(chatChannels)
      .where(
        and(
          eq(chatChannels.id, channelId),
          eq(chatChannels.userId, userId),
          eq(chatChannels.isDeleted, false)
        )
      )
      .limit(1);

    return row ? mapChatChannel(row) : null;
  }

  public async create(channel: CreateChatChannelInput): Promise<ChatChannel> {
    const now = new Date();
    const lastMessagedAt = parseLastMessagedAt(channel.lastMessagedAt);

    const [createdChannel] = await this.database
      .insert(chatChannels)
      .values({
        id: channel.id,
        userId: channel.userId,
        channelName: channel.name,
        isDeleted: false,
        lastMessagedAt,
        createdAt: now,
        updatedAt: now,
      })
      .returning({
        id: chatChannels.id,
        channelName: chatChannels.channelName,
        lastMessagedAt: chatChannels.lastMessagedAt,
      });

    return mapChatChannel(createdChannel);
  }

  public async softDeleteOwnedById(
    userId: string,
    channelId: string
  ): Promise<boolean> {
    const deletedChannels = await this.database
      .update(chatChannels)
      .set({
        isDeleted: true,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(chatChannels.id, channelId),
          eq(chatChannels.userId, userId),
          eq(chatChannels.isDeleted, false)
        )
      )
      .returning({ id: chatChannels.id });

    return deletedChannels.length > 0;
  }

  public async updateLastMessagedAtOwnedById(
    userId: string,
    channelId: string,
    lastMessagedAtValue: string
  ): Promise<boolean> {
    const lastMessagedAt = parseLastMessagedAt(lastMessagedAtValue);

    const updatedChannels = await this.database
      .update(chatChannels)
      .set({
        lastMessagedAt,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(chatChannels.id, channelId),
          eq(chatChannels.userId, userId),
          eq(chatChannels.isDeleted, false)
        )
      )
      .returning({ id: chatChannels.id });

    return updatedChannels.length > 0;
  }
}
