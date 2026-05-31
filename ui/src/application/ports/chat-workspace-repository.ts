import type { ChatChannelSummary } from "@/entities/chat/chat-channel-summary";
import type { ChatDetail } from "@/entities/chat/chat-detail";
import type { ChatMessage } from "@/entities/chat/chat-message";

export interface SubmittedUserMessage {
  readonly channelId: string;
  readonly channelName: string;
  readonly message: ChatMessage;
}

export interface SubmittedMessageFeedback {
  readonly messageId: string;
  readonly aiFeedback: boolean | null;
}

export interface ChatWorkspaceRepository {
  listChats(): Promise<ReadonlyArray<ChatChannelSummary>>;
  getChatById(channelId: string): Promise<ChatDetail>;
  createChatWithFirstMessage(messageText: string): Promise<SubmittedUserMessage>;
  sendMessageToChat(
    channelId: string,
    messageText: string
  ): Promise<SubmittedUserMessage>;
  sendMessageFeedback(
    channelId: string,
    messageId: string,
    aiFeedback: boolean
  ): Promise<SubmittedMessageFeedback>;
  deleteChatById(channelId: string): Promise<void>;
}
