import { CreateChatWithFirstMessageUseCase } from "@/application/use-cases/create-chat-with-first-message-use-case";
import { DeleteChatByIdUseCase } from "@/application/use-cases/delete-chat-by-id-use-case";
import { GetChatByIdUseCase } from "@/application/use-cases/get-chat-by-id-use-case";
import { ListChatsUseCase } from "@/application/use-cases/list-chats-use-case";
import { LoginUseCase } from "@/application/use-cases/login-use-case";
import { SendMessageFeedbackUseCase } from "@/application/use-cases/send-message-feedback-use-case";
import { SendMessageToChatUseCase } from "@/application/use-cases/send-message-to-chat-use-case";
import { InMemorySessionGateway } from "@/infrastructure/auth/in-memory-session-gateway";
import { ChatsController } from "@/interface-adapters/controllers/chats-controller";
import { LoginController } from "@/interface-adapters/controllers/login-controller";
import { MessagesController } from "@/interface-adapters/controllers/messages-controller";
import { ChatsPresenter } from "@/interface-adapters/presenters/chats-presenter";
import { LoginPresenter } from "@/interface-adapters/presenters/login-presenter";
import { MessagesPresenter } from "@/interface-adapters/presenters/messages-presenter";

const sessionGateway = new InMemorySessionGateway();

export const container = {
  sessionGateway,
  loginController: new LoginController(
    new LoginUseCase(),
    new LoginPresenter()
  ),
  chatsController: new ChatsController(
    new ListChatsUseCase(),
    new CreateChatWithFirstMessageUseCase(),
    new GetChatByIdUseCase(),
    new DeleteChatByIdUseCase(),
    new SendMessageToChatUseCase(),
    new ChatsPresenter()
  ),
  messagesController: new MessagesController(
    new SendMessageFeedbackUseCase(),
    new MessagesPresenter()
  ),
};
