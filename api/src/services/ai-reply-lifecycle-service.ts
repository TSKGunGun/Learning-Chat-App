import type { ChatMessage } from "@/entities/chat-message";
import type { ChatCompletionGateway } from "@/gateways/chat-completion-gateway";
import type { MessageGateway } from "@/gateways/message-gateway";
import type { Clock } from "@/shared/clock";

export interface StartAiReplyLifecycleCommand {
  readonly authenticatedUserId: string;
  readonly channelId: string;
  readonly pendingMessageId: string;
}

interface AiReplyLifecycleServiceDependencies {
  readonly messageGateway: MessageGateway;
  readonly chatCompletionGateway: ChatCompletionGateway;
  readonly clock: Clock;
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

    void this.completeReply({
      ...command,
      conversationHistory,
    }).catch((error: unknown) => {
      console.error(error);
    });
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
            channelId: command.channelId,
            status: "completed",
            messageText: completedReply,
            lastMessagedAt: completedAt,
          }
        );
      } catch {
        await this.markTimedOut(command);

        return;
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
      channelId: command.channelId,
      status: "ai_timeout",
      messageText: AI_TIMEOUT_MESSAGE,
      lastMessagedAt: timedOutAt,
    });
  }
}
