import type { ChatChannel } from "@/entities/chat-channel";

export interface ChatChannelRepository {
  listByUserId(userId: string): Promise<ReadonlyArray<ChatChannel>>;
}
