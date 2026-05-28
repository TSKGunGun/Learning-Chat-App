import { and, asc, eq } from "drizzle-orm";

import type { Database } from "@/db/client";
import { chatChannels, messages } from "@/db/schema";
import type { ChatMessage } from "@/entities/chat-message";
import type {
  AppendedChatMessages,
  AppendUserMessageWithPendingAiMessageInput,
  MessageGateway,
  UpdateAiMessageInput,
} from "@/gateways/message-gateway";
import {
  ApplicationError,
  PendingAiMessageAlreadyExistsError,
} from "@/shared/errors/application-error";

const mapChatMessage = (record: {
  readonly id: string;
  readonly channelId: string;
  readonly senderType: "user" | "ai";
  readonly messageText: string | null;
  readonly status: "pending" | "completed" | "ai_timeout";
  readonly aiFeedback: boolean | null;
  readonly createdAt: Date;
}): ChatMessage => ({
  id: record.id,
  channelId: record.channelId,
  senderType: record.senderType,
  messageText: record.messageText,
  status: record.status,
  aiFeedback: record.aiFeedback,
  createdAt: record.createdAt.toISOString(),
});

const iso8601DateTimePattern =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/;

const parseIsoDateTime = (value: string, fieldName: string): Date => {
  if (!iso8601DateTimePattern.test(value)) {
    throw new ApplicationError(`${fieldName} must be a valid ISO 8601 datetime.`, 400);
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    throw new ApplicationError(`${fieldName} must be a valid ISO 8601 datetime.`, 400);
  }

  return parsedDate;
};

const isUniqueConstraintError = (
  error: unknown,
  constraintName?: string
): boolean => {
  if (typeof error !== "object" || error === null) {
    return false;
  }

  const candidate = error as {
    readonly code?: string;
    readonly constraint?: string;
    readonly cause?: unknown;
  };

  if (
    candidate.code === "23505" &&
    (constraintName === undefined || candidate.constraint === constraintName)
  ) {
    return true;
  }

  return isUniqueConstraintError(candidate.cause, constraintName);
};

const createMessageValues = (message: ChatMessage) => ({
  id: message.id,
  channelId: message.channelId,
  senderType: message.senderType,
  messageText: message.messageText,
  status: message.status,
  aiFeedback: message.aiFeedback,
  feedbackUpdatedAt:
    message.aiFeedback === null ? null : new Date(message.createdAt),
  createdAt: new Date(message.createdAt),
});

export class DrizzleMessageGateway implements MessageGateway {
  public constructor(private readonly database: Database) {}

  public async listByChannelId(
    channelId: string
  ): Promise<ReadonlyArray<ChatMessage>> {
    const rows = await this.database
      .select({
        id: messages.id,
        channelId: messages.channelId,
        senderType: messages.senderType,
        messageText: messages.messageText,
        status: messages.status,
        aiFeedback: messages.aiFeedback,
        createdAt: messages.createdAt,
      })
      .from(messages)
      .where(eq(messages.channelId, channelId))
      .orderBy(asc(messages.createdAt));

    return rows.map(mapChatMessage);
  }

  public async listByActiveOwnedChannelId(
    userId: string,
    channelId: string
  ): Promise<ReadonlyArray<ChatMessage>> {
    const rows = await this.database
      .select({
        id: messages.id,
        channelId: messages.channelId,
        senderType: messages.senderType,
        messageText: messages.messageText,
        status: messages.status,
        aiFeedback: messages.aiFeedback,
        createdAt: messages.createdAt,
      })
      .from(messages)
      .innerJoin(chatChannels, eq(messages.channelId, chatChannels.id))
      .where(
        and(
          eq(messages.channelId, channelId),
          eq(chatChannels.userId, userId),
          eq(chatChannels.isDeleted, false)
        )
      )
      .orderBy(asc(messages.createdAt));

    return rows.map(mapChatMessage);
  }

  public async createMessage(message: ChatMessage): Promise<ChatMessage> {
    const [createdMessage] = await this.database
      .insert(messages)
      .values(createMessageValues(message))
      .returning({
        id: messages.id,
        channelId: messages.channelId,
        senderType: messages.senderType,
        messageText: messages.messageText,
        status: messages.status,
        aiFeedback: messages.aiFeedback,
        createdAt: messages.createdAt,
      });

    return mapChatMessage(createdMessage);
  }

  public async appendUserMessageWithPendingAiMessage(
    input: AppendUserMessageWithPendingAiMessageInput
  ): Promise<AppendedChatMessages> {
    try {
      return await this.database.transaction(async (transaction) => {
        const [createdPendingAiMessage] = await transaction
          .insert(messages)
          .values(createMessageValues(input.pendingAiMessage))
          .returning({
            id: messages.id,
            channelId: messages.channelId,
            senderType: messages.senderType,
            messageText: messages.messageText,
            status: messages.status,
            aiFeedback: messages.aiFeedback,
            createdAt: messages.createdAt,
          });
        const [createdUserMessage] = await transaction
          .insert(messages)
          .values(createMessageValues(input.userMessage))
          .returning({
            id: messages.id,
            channelId: messages.channelId,
            senderType: messages.senderType,
            messageText: messages.messageText,
            status: messages.status,
            aiFeedback: messages.aiFeedback,
            createdAt: messages.createdAt,
          });

        await transaction
          .update(chatChannels)
          .set({
            lastMessagedAt: new Date(input.pendingAiMessage.createdAt),
            updatedAt: new Date(),
          })
          .where(eq(chatChannels.id, input.channelId));

        return {
          userMessage: mapChatMessage(createdUserMessage),
          pendingAiMessage: mapChatMessage(createdPendingAiMessage),
        };
      });
    } catch (error: unknown) {
      if (isUniqueConstraintError(error, "messages_pending_ai_per_channel_idx")) {
        throw new PendingAiMessageAlreadyExistsError();
      }

      if (isUniqueConstraintError(error)) {
        throw new PendingAiMessageAlreadyExistsError();
      }

      throw error;
    }
  }

  public async updateAiMessage(
    messageId: string,
    input: UpdateAiMessageInput
  ): Promise<void> {
    const lastMessagedAt = parseIsoDateTime(input.lastMessagedAt, "lastMessagedAt");

    await this.database.transaction(async (transaction) => {
      await transaction
        .update(messages)
        .set({
          status: input.status,
          messageText: input.messageText,
        })
        .where(and(eq(messages.id, messageId), eq(messages.senderType, "ai")));
      await transaction
        .update(chatChannels)
        .set({
          lastMessagedAt,
          updatedAt: new Date(),
        })
        .where(eq(chatChannels.id, input.channelId));
    });
  }

  public async updateMessageFeedback(
    messageId: string,
    feedback: boolean | null
  ): Promise<void> {
    await this.database
      .update(messages)
      .set({
        aiFeedback: feedback,
        feedbackUpdatedAt: new Date(),
      })
      .where(eq(messages.id, messageId));
  }
}
