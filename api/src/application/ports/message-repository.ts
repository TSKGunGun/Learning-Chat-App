import type { ChatMessage } from "@/entities/chat-message";

export interface MessageRepository {
  listByChannelId(channelId: string): Promise<ReadonlyArray<ChatMessage>>;
}
