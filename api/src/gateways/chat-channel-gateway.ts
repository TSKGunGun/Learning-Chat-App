import type { ChatChannel } from "@/entities/chat-channel";

export interface CreateChatChannelInput {
  readonly id: string;
  readonly userId: string;
  readonly name: string;
  readonly lastMessagedAt: string;
}

export interface ChatChannelGateway {
  listActiveByUserId(userId: string): Promise<ReadonlyArray<ChatChannel>>;
  findActiveOwnedById(
    userId: string,
    channelId: string
  ): Promise<ChatChannel | null>;
  create(channel: CreateChatChannelInput): Promise<ChatChannel>;
  softDeleteOwnedById(userId: string, channelId: string): Promise<boolean>;
  updateLastMessagedAtOwnedById(
    userId: string,
    channelId: string,
    lastMessagedAt: string
  ): Promise<boolean>;
}
