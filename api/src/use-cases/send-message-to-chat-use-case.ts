import type { ChatChannelGateway } from "@/gateways/chat-channel-gateway";
import type { MessageGateway } from "@/gateways/message-gateway";
import {
  NoopChatChannelGateway,
  NoopMessageGateway,
} from "@/gateways/noop-gateways";
import type { AiReplyLifecycleService } from "@/services/ai-reply-lifecycle-service";
import type { Clock } from "@/shared/clock";
import type { IdGenerator } from "@/shared/id-generator";
import {
  ApplicationError,
  NotFoundApplicationError,
} from "@/shared/errors/application-error";

export interface SendMessageToChatCommand {
  readonly authenticatedUserId: string;
  readonly channelId: string;
  readonly messageText: string;
}

export interface SendMessageToChatResult {
  readonly channelName: string;
  readonly messageId: string;
  readonly senderType: "user";
  readonly messageText: string;
  readonly status: "completed";
  readonly createdAt: string;
}

interface SendMessageToChatUseCaseDependencies {
  readonly chatChannelGateway: ChatChannelGateway;
  readonly messageGateway: MessageGateway;
  readonly aiReplyLifecycleService: AiReplyLifecycleService;
  readonly clock: Clock;
  readonly idGenerator: IdGenerator;
}

export class SendMessageToChatUseCase {
  private readonly chatChannelGateway: ChatChannelGateway;
  private readonly messageGateway: MessageGateway;
  private readonly aiReplyLifecycleService?: AiReplyLifecycleService;
  private readonly clock?: Clock;
  private readonly idGenerator?: IdGenerator;

  public constructor(
    dependencies: Partial<SendMessageToChatUseCaseDependencies> = {}
  ) {
    this.chatChannelGateway =
      dependencies.chatChannelGateway ?? new NoopChatChannelGateway();
    this.messageGateway = dependencies.messageGateway ?? new NoopMessageGateway();
    this.aiReplyLifecycleService = dependencies.aiReplyLifecycleService;
    this.clock = dependencies.clock;
    this.idGenerator = dependencies.idGenerator;
  }

  public async execute(
    command: SendMessageToChatCommand
  ): Promise<SendMessageToChatResult> {
    if (
      !this.aiReplyLifecycleService ||
      !this.clock ||
      !this.idGenerator
    ) {
      throw new ApplicationError(
        "POST /api/chats/{channel_id}/messages is not implemented yet.",
        501
      );
    }

    const channel = await this.chatChannelGateway.findActiveOwnedById(
      command.authenticatedUserId,
      command.channelId
    );

    if (!channel) {
      throw new NotFoundApplicationError("Chat channel not found.");
    }

    const createdAt = this.clock.now().toISOString();
    const pendingCreatedAt = this.clock.now().toISOString();
    const messageId = this.idGenerator.generate();
    const pendingMessageId = this.idGenerator.generate();

    await this.messageGateway.appendUserMessageWithPendingAiMessage({
      channelId: command.channelId,
      userMessage: {
        id: messageId,
        channelId: command.channelId,
        senderType: "user",
        messageText: command.messageText,
        status: "completed",
        aiFeedback: null,
        createdAt,
      },
      pendingAiMessage: {
        id: pendingMessageId,
        channelId: command.channelId,
        senderType: "ai",
        messageText: null,
        status: "pending",
        aiFeedback: null,
        createdAt: pendingCreatedAt,
      },
    });
    await this.aiReplyLifecycleService.start({
      authenticatedUserId: command.authenticatedUserId,
      channelId: command.channelId,
      pendingMessageId,
    });

    return {
      channelName: channel.name,
      messageId,
      senderType: "user",
      messageText: command.messageText,
      status: "completed",
      createdAt,
    };
  }
}
