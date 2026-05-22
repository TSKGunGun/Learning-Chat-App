import { NotImplementedApplicationError } from "@/shared/errors/application-error";

export interface GetChatByIdQuery {
  readonly authenticatedUserId: string;
  readonly channelId: string;
}

export interface ChatMessageResult {
  readonly messageId: string;
  readonly senderType: "user" | "ai";
  readonly messageText: string | null;
  readonly status: "pending" | "completed" | "ai_timeout";
  readonly aiFeedback: boolean | null;
  readonly createdAt: string;
}

export interface GetChatByIdResult {
  readonly channelId: string;
  readonly channelName: string;
  readonly lastMessagedAt: string;
  readonly messages: ReadonlyArray<ChatMessageResult>;
}

export class GetChatByIdUseCase {
  public async execute(query: GetChatByIdQuery): Promise<GetChatByIdResult> {
    void query;

    throw new NotImplementedApplicationError(
      "GET /api/chats/{channel_id} is not implemented yet."
    );
  }
}
