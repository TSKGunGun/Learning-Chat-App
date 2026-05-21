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
    _query: ListChatsQuery
  ): Promise<ReadonlyArray<ChatChannelSummaryResult>> {
    void _query;

    throw new NotImplementedApplicationError(
      "GET /api/chats is not implemented yet."
    );
  }
}
