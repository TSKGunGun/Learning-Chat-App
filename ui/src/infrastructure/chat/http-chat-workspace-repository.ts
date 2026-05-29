import type {
  ChatWorkspaceRepository,
  SubmittedUserMessage,
} from "@/application/ports/chat-workspace-repository";
import type { ChatChannelSummary } from "@/entities/chat/chat-channel-summary";
import type { ChatDetail } from "@/entities/chat/chat-detail";
import type { ChatMessage } from "@/entities/chat/chat-message";
import {
  RequestFailedError,
  UnauthorizedRequestError,
} from "@/shared/errors/request-errors";

const JSON_HEADERS = {
  "content-type": "application/json",
} as const;

interface ErrorResponseBody {
  readonly message: string;
}

interface ChatChannelSummaryResponseBody {
  readonly channel_id: string;
  readonly channel_name: string;
  readonly last_messaged_at: string;
}

interface ChatMessageResponseBody {
  readonly message_id: string;
  readonly sender_type: ChatMessage["senderType"];
  readonly message_text: string | null;
  readonly status: ChatMessage["status"];
  readonly ai_feedback: boolean | null;
  readonly created_at: string;
}

interface ChatDetailResponseBody {
  readonly channel_id: string;
  readonly channel_name: string;
  readonly last_messaged_at: string;
  readonly messages: ReadonlyArray<ChatMessageResponseBody>;
}

interface UserMessageResponseBody {
  readonly channel_id?: string;
  readonly channel_name: string;
  readonly message_id: string;
  readonly sender_type: "user";
  readonly message_text: string;
  readonly status: "completed";
  readonly created_at: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isErrorResponseBody = (value: unknown): value is ErrorResponseBody =>
  isRecord(value) && typeof value.message === "string";

const isMessageSenderType = (value: unknown): value is ChatMessage["senderType"] =>
  value === "user" || value === "ai";

const isMessageStatus = (value: unknown): value is ChatMessage["status"] =>
  value === "pending" || value === "completed" || value === "ai_timeout";

const isChatChannelSummaryResponseBody = (
  value: unknown
): value is ChatChannelSummaryResponseBody =>
  isRecord(value) &&
  typeof value.channel_id === "string" &&
  typeof value.channel_name === "string" &&
  typeof value.last_messaged_at === "string";

const isChatMessageResponseBody = (
  value: unknown
): value is ChatMessageResponseBody =>
  isRecord(value) &&
  typeof value.message_id === "string" &&
  isMessageSenderType(value.sender_type) &&
  (typeof value.message_text === "string" || value.message_text === null) &&
  isMessageStatus(value.status) &&
  (typeof value.ai_feedback === "boolean" || value.ai_feedback === null) &&
  typeof value.created_at === "string";

const isChatDetailResponseBody = (
  value: unknown
): value is ChatDetailResponseBody =>
  isRecord(value) &&
  typeof value.channel_id === "string" &&
  typeof value.channel_name === "string" &&
  typeof value.last_messaged_at === "string" &&
  Array.isArray(value.messages) &&
  value.messages.every(isChatMessageResponseBody);

const isUserMessageResponseBody = (
  value: unknown
): value is UserMessageResponseBody =>
  isRecord(value) &&
  (typeof value.channel_id === "undefined" || typeof value.channel_id === "string") &&
  typeof value.channel_name === "string" &&
  typeof value.message_id === "string" &&
  value.sender_type === "user" &&
  typeof value.message_text === "string" &&
  value.status === "completed" &&
  typeof value.created_at === "string";

const readErrorMessage = async (response: Response): Promise<string | null> => {
  const contentType = response.headers.get("content-type");

  if (contentType?.includes("application/json") !== true) {
    return null;
  }

  try {
    const payload = await response.json();

    return isErrorResponseBody(payload) ? payload.message : null;
  } catch {
    return null;
  }
};

const createRequestError = async (
  response: Response,
  fallbackMessage: string
): Promise<Error> => {
  const message = (await readErrorMessage(response)) ?? fallbackMessage;

  if (response.status === 401) {
    return new UnauthorizedRequestError(message);
  }

  return new RequestFailedError(message);
};

const parseJsonPayload = async (
  response: Response,
  fallbackMessage: string
): Promise<unknown> => {
  try {
    return await response.json();
  } catch {
    throw new RequestFailedError(fallbackMessage);
  }
};

const mapChatChannelSummary = (
  channel: ChatChannelSummaryResponseBody
): ChatChannelSummary => ({
  id: channel.channel_id,
  name: channel.channel_name,
  lastMessagedAt: channel.last_messaged_at,
});

const mapChatMessage = (message: ChatMessageResponseBody): ChatMessage => ({
  id: message.message_id,
  senderType: message.sender_type,
  body: message.message_text,
  status: message.status,
  aiFeedback: message.ai_feedback,
  createdAt: message.created_at,
});

const mapChatDetail = (detail: ChatDetailResponseBody): ChatDetail => ({
  channelId: detail.channel_id,
  channelName: detail.channel_name,
  lastMessagedAt: detail.last_messaged_at,
  messages: detail.messages.map(mapChatMessage),
});

const mapSubmittedUserMessage = (
  responseBody: UserMessageResponseBody,
  fallbackChannelId?: string
): SubmittedUserMessage => {
  const channelId = responseBody.channel_id ?? fallbackChannelId;

  if (channelId === undefined) {
    throw new RequestFailedError("送信レスポンスに channel_id が含まれていません。");
  }

  return {
    channelId,
    channelName: responseBody.channel_name,
    message: {
      id: responseBody.message_id,
      senderType: responseBody.sender_type,
      body: responseBody.message_text,
      status: responseBody.status,
      aiFeedback: null,
      createdAt: responseBody.created_at,
    },
  };
};

export class HttpChatWorkspaceRepository implements ChatWorkspaceRepository {
  public async listChats(): Promise<ReadonlyArray<ChatChannelSummary>> {
    const response = await fetch("/api/chats", {
      credentials: "include",
      headers: JSON_HEADERS,
    });

    if (!response.ok) {
      throw await createRequestError(
        response,
        "チャット一覧の取得に失敗しました。"
      );
    }

    const payload = await parseJsonPayload(
      response,
      "チャット一覧のレスポンスを読み取れませんでした。"
    );

    if (
      !Array.isArray(payload) ||
      !payload.every(isChatChannelSummaryResponseBody)
    ) {
      throw new RequestFailedError(
        "チャット一覧のレスポンス形式が不正です。"
      );
    }

    return payload.map(mapChatChannelSummary);
  }

  public async getChatById(channelId: string): Promise<ChatDetail> {
    const response = await fetch(`/api/chats/${channelId}`, {
      credentials: "include",
      headers: JSON_HEADERS,
    });

    if (!response.ok) {
      throw await createRequestError(
        response,
        "チャット詳細の取得に失敗しました。"
      );
    }

    const payload = await parseJsonPayload(
      response,
      "チャット詳細のレスポンスを読み取れませんでした。"
    );

    if (!isChatDetailResponseBody(payload)) {
      throw new RequestFailedError(
        "チャット詳細のレスポンス形式が不正です。"
      );
    }

    return mapChatDetail(payload);
  }

  public async createChatWithFirstMessage(
    messageText: string
  ): Promise<SubmittedUserMessage> {
    const response = await fetch("/api/chats", {
      method: "POST",
      credentials: "include",
      headers: JSON_HEADERS,
      body: JSON.stringify({
        message_text: messageText,
      }),
    });

    if (!response.ok) {
      throw await createRequestError(
        response,
        "チャットの作成に失敗しました。"
      );
    }

    const payload = await parseJsonPayload(
      response,
      "チャット作成レスポンスを読み取れませんでした。"
    );

    if (!isUserMessageResponseBody(payload)) {
      throw new RequestFailedError(
        "チャット作成レスポンスの形式が不正です。"
      );
    }

    return mapSubmittedUserMessage(payload);
  }

  public async sendMessageToChat(
    channelId: string,
    messageText: string
  ): Promise<SubmittedUserMessage> {
    const response = await fetch(`/api/chats/${channelId}/messages`, {
      method: "POST",
      credentials: "include",
      headers: JSON_HEADERS,
      body: JSON.stringify({
        message_text: messageText,
      }),
    });

    if (!response.ok) {
      throw await createRequestError(
        response,
        "メッセージの送信に失敗しました。"
      );
    }

    const payload = await parseJsonPayload(
      response,
      "メッセージ送信レスポンスを読み取れませんでした。"
    );

    if (!isUserMessageResponseBody(payload)) {
      throw new RequestFailedError(
        "メッセージ送信レスポンスの形式が不正です。"
      );
    }

    return mapSubmittedUserMessage(payload, channelId);
  }

  public async deleteChatById(channelId: string): Promise<void> {
    const response = await fetch(`/api/chats/${channelId}`, {
      method: "DELETE",
      credentials: "include",
      headers: JSON_HEADERS,
    });

    if (!response.ok) {
      throw await createRequestError(
        response,
        "チャットの削除に失敗しました。"
      );
    }
  }
}
