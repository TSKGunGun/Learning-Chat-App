import type { ChatChannelGateway } from "@/gateways/chat-channel-gateway";
import type { ChannelNameGeneratorGateway } from "@/gateways/channel-name-generator-gateway";
import type { MessageGateway } from "@/gateways/message-gateway";
import {
  NoopChannelNameGeneratorGateway,
  NoopChatChannelGateway,
  NoopMessageGateway,
} from "@/gateways/noop-gateways";
import type { AiReplyLifecycleService } from "@/services/ai-reply-lifecycle-service";
import type { Clock } from "@/shared/clock";
import type { IdGenerator } from "@/shared/id-generator";
import { ApplicationError } from "@/shared/errors/application-error";

export interface CreateChatWithFirstMessageCommand {
  readonly authenticatedUserId: string;
  readonly messageText: string;
}

export interface CreateChatWithFirstMessageResult {
  readonly channelId: string;
  readonly channelName: string;
  readonly messageId: string;
  readonly senderType: "user";
  readonly messageText: string;
  readonly status: "completed";
  readonly createdAt: string;
}

interface CreateChatWithFirstMessageUseCaseDependencies {
  readonly chatChannelGateway: ChatChannelGateway;
  readonly messageGateway: MessageGateway;
  readonly aiReplyLifecycleService: AiReplyLifecycleService;
  readonly channelNameGeneratorGateway: ChannelNameGeneratorGateway;
  readonly clock: Clock;
  readonly idGenerator: IdGenerator;
}

export class CreateChatWithFirstMessageUseCase {
  private readonly chatChannelGateway: ChatChannelGateway;
  private readonly messageGateway: MessageGateway;
  private readonly aiReplyLifecycleService?: AiReplyLifecycleService;
  private readonly channelNameGeneratorGateway: ChannelNameGeneratorGateway;
  private readonly clock?: Clock;
  private readonly idGenerator?: IdGenerator;

  public constructor(
    dependencies: Partial<CreateChatWithFirstMessageUseCaseDependencies> = {}
  ) {
    this.chatChannelGateway =
      dependencies.chatChannelGateway ?? new NoopChatChannelGateway();
    this.messageGateway = dependencies.messageGateway ?? new NoopMessageGateway();
    this.aiReplyLifecycleService = dependencies.aiReplyLifecycleService;
    this.channelNameGeneratorGateway =
      dependencies.channelNameGeneratorGateway ??
      new NoopChannelNameGeneratorGateway();
    this.clock = dependencies.clock;
    this.idGenerator = dependencies.idGenerator;
  }

  public async execute(
    command: CreateChatWithFirstMessageCommand
  ): Promise<CreateChatWithFirstMessageResult> {
    if (
      !this.aiReplyLifecycleService ||
      !this.clock ||
      !this.idGenerator
    ) {
      throw new ApplicationError(
        "POST /api/chats is not implemented yet.",
        501
      );
    }

    const createdAt = this.clock.now().toISOString();
    const channelId = this.idGenerator.generate();
    const messageId = this.idGenerator.generate();
    const channelName =
      await this.channelNameGeneratorGateway.generateChannelName({
        firstMessageText: command.messageText,
        userId: command.authenticatedUserId,
      });

    await this.chatChannelGateway.create({
      id: channelId,
      userId: command.authenticatedUserId,
      name: channelName,
      lastMessagedAt: createdAt,
    });
    await this.messageGateway.createMessage({
      id: messageId,
      channelId,
      senderType: "user",
      messageText: command.messageText,
      status: "completed",
      aiFeedback: null,
      createdAt,
    });
    await this.aiReplyLifecycleService.start({
      authenticatedUserId: command.authenticatedUserId,
      channelId,
    });

    return {
      channelId,
      channelName,
      messageId,
      senderType: "user",
      messageText: command.messageText,
      status: "completed",
      createdAt,
    };
  }
}
