import { and, desc, eq, exists, sql } from "drizzle-orm";

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

export class DrizzleChatChannelGateway implements ChatChannelGateway {
  public constructor(private readonly database: Database) {}

  public async listActiveByUserId(
    userId: string
  ): Promise<ReadonlyArray<ChatChannel>> {
    const rows = await this.database
      .select({
        id: chatChannels.id,
        channelName: chatChannels.channelName,
        lastMessagedAt: chatChannels.lastMessagedAt,
      })
      .from(chatChannels)
      .where(
        and(
          eq(chatChannels.userId, userId),
          eq(chatChannels.isDeleted, false),
          exists(
            this.database
              .select({ value: sql`1` })
              .from(messages)
              .where(eq(messages.channelId, chatChannels.id))
          )
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
    const lastMessagedAt = new Date(channel.lastMessagedAt);

    if (Number.isNaN(lastMessagedAt.getTime())) {
      throw new ApplicationError(
        "lastMessagedAt must be a valid ISO 8601 datetime.",
        400
      );
    }

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
}
