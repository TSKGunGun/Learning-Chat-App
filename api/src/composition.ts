import { getRuntimeDatabase } from "@/db/client";
import { getSessionTtlSeconds } from "@/db/env";
import { BcryptPasswordHasher } from "@/gateways/bcrypt-password-hasher";
import { DrizzleChatChannelGateway } from "@/gateways/drizzle-chat-channel-gateway";
import { DrizzleMessageGateway } from "@/gateways/drizzle-message-gateway";
import { DrizzleSessionGateway } from "@/gateways/drizzle-session-gateway";
import { DrizzleUserGateway } from "@/gateways/drizzle-user-gateway";
import { SafeFallbackChannelNameGenerator } from "@/gateways/fallback-channel-name-generator";
import { SafeFallbackChatCompletionGateway } from "@/gateways/fallback-chat-completion-gateway";
import type { SessionGateway } from "@/gateways/session-gateway";
import { AiReplyLifecycleService } from "@/services/ai-reply-lifecycle-service";
import { SystemClock } from "@/shared/clock";
import { CryptoIdGenerator } from "@/shared/id-generator";
import { CreateChatWithFirstMessageUseCase } from "@/use-cases/create-chat-with-first-message-use-case";
import { DeleteChatByIdUseCase } from "@/use-cases/delete-chat-by-id-use-case";
import { GetChatByIdUseCase } from "@/use-cases/get-chat-by-id-use-case";
import { ListChatsUseCase } from "@/use-cases/list-chats-use-case";
import { LoginUseCase } from "@/use-cases/login-use-case";
import { SendMessageFeedbackUseCase } from "@/use-cases/send-message-feedback-use-case";
import { SendMessageToChatUseCase } from "@/use-cases/send-message-to-chat-use-case";

export interface AppComposition {
  readonly sessionGateway: SessionGateway;
  readonly loginUseCase: LoginUseCase;
  readonly listChatsUseCase: ListChatsUseCase;
  readonly createChatUseCase: CreateChatWithFirstMessageUseCase;
  readonly getChatByIdUseCase: GetChatByIdUseCase;
  readonly deleteChatByIdUseCase: DeleteChatByIdUseCase;
  readonly sendMessageToChatUseCase: SendMessageToChatUseCase;
  readonly sendMessageFeedbackUseCase: SendMessageFeedbackUseCase;
}

export const createAppComposition = (): AppComposition => {
  const database = getRuntimeDatabase();
  const sessionGateway = new DrizzleSessionGateway(
    database,
    getSessionTtlSeconds()
  );
  const userGateway = new DrizzleUserGateway(database);
  const passwordHasher = new BcryptPasswordHasher();
  const chatChannelGateway = new DrizzleChatChannelGateway(database);
  const messageGateway = new DrizzleMessageGateway(database);
  const clock = new SystemClock();
  const idGenerator = new CryptoIdGenerator();
  const chatCompletionGateway = new SafeFallbackChatCompletionGateway();
  const channelNameGeneratorGateway = new SafeFallbackChannelNameGenerator({
    chatCompletionGateway,
  });
  const aiReplyLifecycleService = new AiReplyLifecycleService({
    messageGateway,
    chatCompletionGateway,
    clock,
  });

  return {
    sessionGateway,
    loginUseCase: new LoginUseCase({
      userGateway,
      sessionGateway,
      passwordHasher,
    }),
    listChatsUseCase: new ListChatsUseCase({
      chatChannelGateway,
    }),
    createChatUseCase: new CreateChatWithFirstMessageUseCase({
      chatChannelGateway,
      messageGateway,
      aiReplyLifecycleService,
      channelNameGeneratorGateway,
      clock,
      idGenerator,
    }),
    getChatByIdUseCase: new GetChatByIdUseCase({
      chatChannelGateway,
      messageGateway,
    }),
    deleteChatByIdUseCase: new DeleteChatByIdUseCase({
      chatChannelGateway,
    }),
    sendMessageToChatUseCase: new SendMessageToChatUseCase({
      chatChannelGateway,
      messageGateway,
      aiReplyLifecycleService,
      clock,
      idGenerator,
    }),
    sendMessageFeedbackUseCase: new SendMessageFeedbackUseCase(),
  };
};
