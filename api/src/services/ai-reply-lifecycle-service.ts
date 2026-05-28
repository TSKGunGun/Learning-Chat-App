import type { ChatMessage } from "@/entities/chat-message";
import type { ChatChannelGateway } from "@/gateways/chat-channel-gateway";
import type { ChatCompletionGateway } from "@/gateways/chat-completion-gateway";
import type { MessageGateway } from "@/gateways/message-gateway";
import type { Clock } from "@/shared/clock";
import type { IdGenerator } from "@/shared/id-generator";

export interface StartAiReplyLifecycleCommand {
  readonly authenticatedUserId: string;
  readonly channelId: string;
}

interface PendingAiMessageSnapshot {
  readonly id: string;
  readonly createdAt: string;
}

interface AiReplyLifecycleServiceDependencies {
  readonly chatChannelGateway: ChatChannelGateway;
  readonly messageGateway: MessageGateway;
  readonly chatCompletionGateway: ChatCompletionGateway;
  readonly clock: Clock;
  readonly idGenerator: IdGenerator;
  readonly timeoutMilliseconds?: number;
}

const AI_TIMEOUT_MESSAGE = "AI応答がありません";
const DEFAULT_TIMEOUT_MILLISECONDS = 60_000;

const toConversationHistory = (
  messages: ReadonlyArray<ChatMessage>
): ReadonlyArray<{ readonly role: "user" | "assistant"; readonly content: string }> =>
  messages.flatMap((message) => {
    if (message.messageText === null) {
      return [];
    }

    return [
      {
        role: message.senderType === "user" ? "user" : "assistant",
        content: message.messageText,
      },
    ];
  });

export class AiReplyLifecycleService {
  private readonly timeoutMilliseconds: number;

  public constructor(
    private readonly dependencies: AiReplyLifecycleServiceDependencies
  ) {
    this.timeoutMilliseconds =
      dependencies.timeoutMilliseconds ?? DEFAULT_TIMEOUT_MILLISECONDS;
  }

  public async start(
    command: StartAiReplyLifecycleCommand
  ): Promise<void> {
    const conversationHistory = await this.dependencies.messageGateway.listByChannelId(
      command.channelId
    );
    const pendingMessage = await this.createPendingMessage(command.channelId);

    await this.updateChannelLastMessagedAt(
      command.authenticatedUserId,
      command.channelId,
      pendingMessage.createdAt
    );

    void this.completeReply({
      ...command,
      pendingMessageId: pendingMessage.id,
      conversationHistory,
    }).catch((error: unknown) => {
      console.error(error);
    });
  }

  private async createPendingMessage(
    channelId: string
  ): Promise<PendingAiMessageSnapshot> {
    const createdAt = this.dependencies.clock.now().toISOString();
    const pendingMessageId = this.dependencies.idGenerator.generate();

    await this.dependencies.messageGateway.createMessage({
      id: pendingMessageId,
      channelId,
      senderType: "ai",
      messageText: null,
      status: "pending",
      aiFeedback: null,
      createdAt,
    });

    return {
      id: pendingMessageId,
      createdAt,
    };
  }

  private async completeReply(command: {
    readonly authenticatedUserId: string;
    readonly channelId: string;
    readonly pendingMessageId: string;
    readonly conversationHistory: ReadonlyArray<ChatMessage>;
  }): Promise<void> {
    const timeout = this.createTimeoutPromise();

    try {
      const completionPromise =
        this.dependencies.chatCompletionGateway.generateReply({
          conversationHistory: toConversationHistory(command.conversationHistory),
          userId: command.authenticatedUserId,
          channelId: command.channelId,
          metadata: {
            intent: "reply",
          },
        });
      const completedReply = await Promise.race([
        completionPromise,
        timeout.promise,
      ]);

      timeout.cancel();

      if (completedReply === null) {
        await this.markTimedOut(command);

        return;
      }

      const completedAt = this.dependencies.clock.now().toISOString();

      try {
        await this.dependencies.messageGateway.updateAiMessage(
          command.pendingMessageId,
          {
            status: "completed",
            messageText: completedReply,
          }
        );
      } catch {
        await this.markTimedOut(command);

        return;
      }

      try {
        await this.updateChannelLastMessagedAt(
          command.authenticatedUserId,
          command.channelId,
          completedAt
        );
      } catch (error: unknown) {
        console.error(
          "Failed to update channel lastMessagedAt after AI completion.",
          {
            error,
            authenticatedUserId: command.authenticatedUserId,
            channelId: command.channelId,
          }
        );
      }
    } catch {
      timeout.cancel();
      await this.markTimedOut(command);
    }
  }

  private createTimeoutPromise(): {
    readonly promise: Promise<null>;
    readonly cancel: () => void;
  } {
    let timeoutHandle: ReturnType<typeof setTimeout> | undefined;

    return {
      promise: new Promise<null>((resolve) => {
        timeoutHandle = setTimeout(() => {
          resolve(null);
        }, this.timeoutMilliseconds);
      }),
      cancel: () => {
        if (timeoutHandle !== undefined) {
          clearTimeout(timeoutHandle);
        }
      },
    };
  }

  private async markTimedOut(command: {
    readonly authenticatedUserId: string;
    readonly channelId: string;
    readonly pendingMessageId: string;
  }): Promise<void> {
    const timedOutAt = this.dependencies.clock.now().toISOString();

    await this.dependencies.messageGateway.updateAiMessage(command.pendingMessageId, {
      status: "ai_timeout",
      messageText: AI_TIMEOUT_MESSAGE,
    });

    try {
      await this.updateChannelLastMessagedAt(
        command.authenticatedUserId,
        command.channelId,
        timedOutAt
      );
    } catch (error: unknown) {
      console.error("Failed to update channel lastMessagedAt after timeout.", {
        error,
        authenticatedUserId: command.authenticatedUserId,
        channelId: command.channelId,
      });
    }
  }

  private async updateChannelLastMessagedAt(
    authenticatedUserId: string,
    channelId: string,
    lastMessagedAt: string
  ): Promise<void> {
    await this.dependencies.chatChannelGateway.updateLastMessagedAtOwnedById(
      authenticatedUserId,
      channelId,
      lastMessagedAt
    );
  }
}
