import { NoopChatChannelGateway } from "@/gateways/noop-gateways";
import type { ChatChannelGateway } from "@/gateways/chat-channel-gateway";

export interface ListChatsQuery {
  readonly authenticatedUserId: string;
}

export interface ChatChannelSummaryResult {
  readonly channelId: string;
  readonly channelName: string;
  readonly lastMessagedAt: string;
}

interface ListChatsUseCaseDependencies {
  readonly chatChannelGateway: ChatChannelGateway;
}

export class ListChatsUseCase {
  private readonly chatChannelGateway: ChatChannelGateway;

  public constructor(
    dependencies: Partial<ListChatsUseCaseDependencies> = {}
  ) {
    this.chatChannelGateway =
      dependencies.chatChannelGateway ?? new NoopChatChannelGateway();
  }

  public async execute(
    query: ListChatsQuery
  ): Promise<ReadonlyArray<ChatChannelSummaryResult>> {
    const channels = await this.chatChannelGateway.listActiveByUserId(
      query.authenticatedUserId
    );

    return channels.map((channel) => ({
      channelId: channel.id,
      channelName: channel.name,
      lastMessagedAt: channel.lastMessagedAt,
    }));
  }
}
