import type { ChatChannel } from "@/entities/chat-channel";

export interface ChatChannelGateway {
  listByUserId(userId: string): Promise<ReadonlyArray<ChatChannel>>;
  getById(channelId: string): Promise<ChatChannel | null>;
  create(channel: ChatChannel): Promise<ChatChannel>;
  deleteById(channelId: string): Promise<void>;
}
