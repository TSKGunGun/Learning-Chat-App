import type { CreateChatWithFirstMessageCommand, CreateChatWithFirstMessageUseCase } from "@/application/use-cases/create-chat-with-first-message-use-case";
import type { DeleteChatByIdCommand, DeleteChatByIdUseCase } from "@/application/use-cases/delete-chat-by-id-use-case";
import type { GetChatByIdQuery, GetChatByIdUseCase } from "@/application/use-cases/get-chat-by-id-use-case";
import type { ListChatsQuery, ListChatsUseCase } from "@/application/use-cases/list-chats-use-case";
import type { SendMessageToChatCommand, SendMessageToChatUseCase } from "@/application/use-cases/send-message-to-chat-use-case";
import type {
  ChatDetailResponseBody,
  ChatChannelSummaryBody,
  ChatsPresenter,
  CreateChatResponseBody,
  SendMessageResponseBody,
} from "@/interface-adapters/presenters/chats-presenter";

export class ChatsController {
  public constructor(
    private readonly listChatsUseCase: ListChatsUseCase,
    private readonly createChatUseCase: CreateChatWithFirstMessageUseCase,
    private readonly getChatByIdUseCase: GetChatByIdUseCase,
    private readonly deleteChatByIdUseCase: DeleteChatByIdUseCase,
    private readonly sendMessageToChatUseCase: SendMessageToChatUseCase,
    private readonly presenter: ChatsPresenter
  ) {}

  public async handleList(
    query: ListChatsQuery
  ): Promise<ReadonlyArray<ChatChannelSummaryBody>> {
    const result = await this.listChatsUseCase.execute(query);
    return this.presenter.presentChatList(result);
  }

  public async handleCreate(
    command: CreateChatWithFirstMessageCommand
  ): Promise<CreateChatResponseBody> {
    const result = await this.createChatUseCase.execute(command);
    return this.presenter.presentCreateChat(result);
  }

  public async handleGetById(
    query: GetChatByIdQuery
  ): Promise<ChatDetailResponseBody> {
    const result = await this.getChatByIdUseCase.execute(query);
    return this.presenter.presentChatDetail(result);
  }

  public async handleDelete(command: DeleteChatByIdCommand): Promise<void> {
    await this.deleteChatByIdUseCase.execute(command);
  }

  public async handleSendMessage(
    command: SendMessageToChatCommand
  ): Promise<SendMessageResponseBody> {
    const result = await this.sendMessageToChatUseCase.execute(command);
    return this.presenter.presentSendMessage(result);
  }
}
