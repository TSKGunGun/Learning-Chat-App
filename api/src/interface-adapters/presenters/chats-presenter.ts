import type {
  CreateChatWithFirstMessageResult,
} from "@/application/use-cases/create-chat-with-first-message-use-case";
import type { GetChatByIdResult } from "@/application/use-cases/get-chat-by-id-use-case";
import type { ChatChannelSummaryResult } from "@/application/use-cases/list-chats-use-case";
import type { SendMessageToChatResult } from "@/application/use-cases/send-message-to-chat-use-case";

export interface ChatChannelSummaryBody {
  readonly channel_id: string;
  readonly channel_name: string;
  readonly last_messaged_at: string;
}

export interface CreateChatResponseBody {
  readonly channel_id: string;
  readonly channel_name: string;
  readonly message_id: string;
  readonly sender_type: "user";
  readonly message_text: string;
  readonly status: "completed";
  readonly created_at: string;
}

export interface ChatMessageBody {
  readonly message_id: string;
  readonly sender_type: "user" | "ai";
  readonly message_text: string | null;
  readonly status: "pending" | "completed" | "ai_timeout";
  readonly ai_feedback: boolean | null;
  readonly created_at: string;
}

export interface ChatDetailResponseBody {
  readonly channel_id: string;
  readonly channel_name: string;
  readonly last_messaged_at: string;
  readonly messages: ReadonlyArray<ChatMessageBody>;
}

export interface SendMessageResponseBody {
  readonly channel_name: string;
  readonly message_id: string;
  readonly sender_type: "user";
  readonly message_text: string;
  readonly status: "completed";
  readonly created_at: string;
}

export class ChatsPresenter {
  public presentChatList(
    result: ReadonlyArray<ChatChannelSummaryResult>
  ): ReadonlyArray<ChatChannelSummaryBody> {
    return result.map((channel) => ({
      channel_id: channel.channelId,
      channel_name: channel.channelName,
      last_messaged_at: channel.lastMessagedAt,
    }));
  }

  public presentCreateChat(
    result: CreateChatWithFirstMessageResult
  ): CreateChatResponseBody {
    return {
      channel_id: result.channelId,
      channel_name: result.channelName,
      message_id: result.messageId,
      sender_type: result.senderType,
      message_text: result.messageText,
      status: result.status,
      created_at: result.createdAt,
    };
  }

  public presentChatDetail(result: GetChatByIdResult): ChatDetailResponseBody {
    return {
      channel_id: result.channelId,
      channel_name: result.channelName,
      last_messaged_at: result.lastMessagedAt,
      messages: result.messages.map((message) => ({
        message_id: message.messageId,
        sender_type: message.senderType,
        message_text: message.messageText,
        status: message.status,
        ai_feedback: message.aiFeedback,
        created_at: message.createdAt,
      })),
    };
  }

  public presentSendMessage(
    result: SendMessageToChatResult
  ): SendMessageResponseBody {
    return {
      channel_name: result.channelName,
      message_id: result.messageId,
      sender_type: result.senderType,
      message_text: result.messageText,
      status: result.status,
      created_at: result.createdAt,
    };
  }
}
