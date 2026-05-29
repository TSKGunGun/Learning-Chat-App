import type { ChatWorkspaceRepository } from "@/application/ports/chat-workspace-repository";
import type { ChatChannelSummary } from "@/entities/chat/chat-channel-summary";
import type { ChatDetail } from "@/entities/chat/chat-detail";
import type { ChatMessage } from "@/entities/chat/chat-message";

interface StoredChatDetail extends ChatDetail {
  readonly isDeleted: boolean;
}

const cloneChatDetail = (detail: StoredChatDetail): StoredChatDetail =>
  structuredClone(detail);

const cloneChatDetails = (details: ReadonlyArray<StoredChatDetail>) =>
  details.map(cloneChatDetail);

const CHAT_DETAILS: ReadonlyArray<StoredChatDetail> = [
  {
    channelId: "34d6763f-d7d2-46d1-89b8-5f8c17db61eb",
    channelName: "自己学習ルールの整理",
    lastMessagedAt: "2026-05-28T09:45:00.000Z",
    isDeleted: false,
    messages: [
      {
        id: "acfc27ea-c10b-47e2-92ec-d0a62bb9d373",
        senderType: "user",
        body: "訂正ルールの見直し観点を整理したいです。",
        status: "completed",
        aiFeedback: null,
        createdAt: "2026-05-28T09:43:00.000Z",
      },
      {
        id: "b8ad7ba0-a891-4997-80a1-93a8ff58f487",
        senderType: "ai",
        body: "過去の訂正履歴から再発しやすい指摘をまとめて確認しましょう。",
        status: "completed",
        aiFeedback: true,
        createdAt: "2026-05-28T09:45:00.000Z",
      },
    ],
  },
  {
    channelId: "3c804a40-93ca-45b4-a169-b49eea7ba544",
    channelName: "トップ画面 2 ペイン構成",
    lastMessagedAt: "2026-05-27T12:15:00.000Z",
    isDeleted: false,
    messages: [
      {
        id: "0cd6488f-6ad2-4e25-b18d-df06350636ef",
        senderType: "user",
        body: "モバイルのドロワー表示も今回の範囲に含めたいです。",
        status: "completed",
        aiFeedback: null,
        createdAt: "2026-05-27T12:10:00.000Z",
      },
      {
        id: "9fca65af-ebf3-4296-b20d-b19614f6ec31",
        senderType: "ai",
        body: "一覧操作を優先しつつ、モバイルではドロワー型サイドバーへ切り替えます。",
        status: "completed",
        aiFeedback: false,
        createdAt: "2026-05-27T12:15:00.000Z",
      },
    ],
  },
  {
    channelId: "87db15fd-b32e-4665-af91-d80cb7b13772",
    channelName: "AI 応答待ちの確認",
    lastMessagedAt: "2026-05-26T06:30:00.000Z",
    isDeleted: false,
    messages: [
      {
        id: "8c54f95a-6ed7-4cdc-89da-cd9e4883c7a2",
        senderType: "user",
        body: "ポーリング対象の見せ方も確認したいです。",
        status: "completed",
        aiFeedback: null,
        createdAt: "2026-05-26T06:25:00.000Z",
      },
      {
        id: "7ac241f5-d9f2-4221-ad04-7f0c1d6641c5",
        senderType: "ai",
        body: null,
        status: "pending",
        aiFeedback: null,
        createdAt: "2026-05-26T06:30:00.000Z",
      },
    ],
  },
];

const createStoredUserMessage = (
  body: string,
  createdAt: string
): ChatMessage => ({
  id: crypto.randomUUID(),
  senderType: "user",
  body,
  status: "completed",
  aiFeedback: null,
  createdAt,
});

const toSummary = (detail: StoredChatDetail): ChatChannelSummary => ({
  id: detail.channelId,
  name: detail.channelName,
  lastMessagedAt: detail.lastMessagedAt,
});

export class InMemoryChatWorkspaceRepository
  implements ChatWorkspaceRepository
{
  private chatDetails = cloneChatDetails(CHAT_DETAILS);

  public async listChats(): Promise<ReadonlyArray<ChatChannelSummary>> {
    return this.chatDetails
      .filter((detail) => !detail.isDeleted)
      .sort(
        (left, right) =>
          new Date(right.lastMessagedAt).getTime() -
          new Date(left.lastMessagedAt).getTime()
      )
      .map(toSummary);
  }

  public async getChatById(channelId: string): Promise<ChatDetail> {
    const chatDetail = this.chatDetails.find(
      (detail) => detail.channelId === channelId && !detail.isDeleted
    );

    if (chatDetail === undefined) {
      throw new Error("指定したチャットが見つかりません。");
    }

    const detailCopy = cloneChatDetail(chatDetail);

    return {
      channelId: detailCopy.channelId,
      channelName: detailCopy.channelName,
      lastMessagedAt: detailCopy.lastMessagedAt,
      messages: detailCopy.messages,
    };
  }

  public async createChatWithFirstMessage(messageText: string) {
    const createdAt = new Date().toISOString();
    const channelId = crypto.randomUUID();
    const message = createStoredUserMessage(messageText, createdAt);
    const nextDetail: StoredChatDetail = {
      channelId,
      channelName: messageText.trim() || "新規チャット",
      lastMessagedAt: createdAt,
      isDeleted: false,
      messages: [message],
    };

    this.chatDetails = [nextDetail, ...this.chatDetails];

    return {
      channelId,
      channelName: nextDetail.channelName,
      message,
    };
  }

  public async sendMessageToChat(channelId: string, messageText: string) {
    const createdAt = new Date().toISOString();
    const message = createStoredUserMessage(messageText, createdAt);
    let submittedChannelName: string | null = null;

    this.chatDetails = this.chatDetails.map((detail) => {
      if (detail.channelId !== channelId || detail.isDeleted) {
        return detail;
      }

      submittedChannelName = detail.channelName;

      return {
        ...detail,
        lastMessagedAt: createdAt,
        messages: [...detail.messages, message],
      };
    });

    if (submittedChannelName === null) {
      throw new Error("指定したチャットが見つかりません。");
    }

    return {
      channelId,
      channelName: submittedChannelName,
      message,
    };
  }

  public async deleteChatById(channelId: string): Promise<void> {
    this.chatDetails = this.chatDetails.map((detail) =>
      detail.channelId === channelId
        ? {
            ...detail,
            isDeleted: true,
          }
        : detail
    );
  }
}
