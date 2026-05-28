import type { ChatChannelSummary } from "@/entities/chat/chat-channel-summary";
import type { ChatDetail } from "@/entities/chat/chat-detail";

export interface ChatWorkspaceRepository {
  listChats(): Promise<ReadonlyArray<ChatChannelSummary>>;
  getChatById(channelId: string): Promise<ChatDetail>;
  deleteChatById(channelId: string): Promise<void>;
}
