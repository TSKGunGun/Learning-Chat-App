import { NotImplementedApplicationError } from "@/shared/errors/application-error";

export interface ListChatsQuery {
  readonly authenticatedUserId: string;
}

export interface ChatChannelSummaryResult {
  readonly channelId: string;
  readonly channelName: string;
  readonly lastMessagedAt: string;
}

export class ListChatsUseCase {
  public async execute(
    query: ListChatsQuery
  ): Promise<ReadonlyArray<ChatChannelSummaryResult>> {
    void query;

    throw new NotImplementedApplicationError(
      "GET /api/chats is not implemented yet."
    );
  }
}
