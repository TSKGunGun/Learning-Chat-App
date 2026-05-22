import { InMemorySessionGateway } from "@/gateways/in-memory-session-gateway";
import type { SessionGateway } from "@/gateways/session-gateway";
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

export const createAppComposition = (): AppComposition => ({
  sessionGateway: new InMemorySessionGateway(),
  loginUseCase: new LoginUseCase(),
  listChatsUseCase: new ListChatsUseCase(),
  createChatUseCase: new CreateChatWithFirstMessageUseCase(),
  getChatByIdUseCase: new GetChatByIdUseCase(),
  deleteChatByIdUseCase: new DeleteChatByIdUseCase(),
  sendMessageToChatUseCase: new SendMessageToChatUseCase(),
  sendMessageFeedbackUseCase: new SendMessageFeedbackUseCase(),
});
