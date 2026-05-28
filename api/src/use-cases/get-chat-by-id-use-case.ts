import type { ChatChannelGateway } from "@/gateways/chat-channel-gateway";
import type { MessageGateway } from "@/gateways/message-gateway";
import {
  NoopChatChannelGateway,
  NoopMessageGateway,
} from "@/gateways/noop-gateways";
import { NotFoundApplicationError } from "@/shared/errors/application-error";

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

interface GetChatByIdUseCaseDependencies {
  readonly chatChannelGateway: ChatChannelGateway;
  readonly messageGateway: MessageGateway;
}

export class GetChatByIdUseCase {
  private readonly chatChannelGateway: ChatChannelGateway;
  private readonly messageGateway: MessageGateway;

  public constructor(
    dependencies: Partial<GetChatByIdUseCaseDependencies> = {}
  ) {
    this.chatChannelGateway =
      dependencies.chatChannelGateway ?? new NoopChatChannelGateway();
    this.messageGateway = dependencies.messageGateway ?? new NoopMessageGateway();
  }

  public async execute(query: GetChatByIdQuery): Promise<GetChatByIdResult> {
    const channel = await this.chatChannelGateway.findActiveOwnedById(
      query.authenticatedUserId,
      query.channelId
    );

    if (!channel) {
      throw new NotFoundApplicationError("Chat channel not found.");
    }

    const channelMessages = await this.messageGateway.listByActiveOwnedChannelId(
      query.authenticatedUserId,
      channel.id
    );

    return {
      channelId: channel.id,
      channelName: channel.name,
      lastMessagedAt: channel.lastMessagedAt,
      messages: channelMessages.map((message) => ({
        messageId: message.id,
        senderType: message.senderType,
        messageText: message.messageText,
        status: message.status,
        aiFeedback: message.aiFeedback,
        createdAt: message.createdAt,
      })),
    };
  }
}
