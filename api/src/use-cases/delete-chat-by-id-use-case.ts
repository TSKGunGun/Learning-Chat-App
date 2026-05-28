import type { ChatChannelGateway } from "@/gateways/chat-channel-gateway";
import { NoopChatChannelGateway } from "@/gateways/noop-gateways";
import { NotFoundApplicationError } from "@/shared/errors/application-error";

export interface DeleteChatByIdCommand {
  readonly authenticatedUserId: string;
  readonly channelId: string;
}

interface DeleteChatByIdUseCaseDependencies {
  readonly chatChannelGateway: ChatChannelGateway;
}

export class DeleteChatByIdUseCase {
  private readonly chatChannelGateway: ChatChannelGateway;

  public constructor(
    dependencies: Partial<DeleteChatByIdUseCaseDependencies> = {}
  ) {
    this.chatChannelGateway =
      dependencies.chatChannelGateway ?? new NoopChatChannelGateway();
  }

  public async execute(command: DeleteChatByIdCommand): Promise<void> {
    const isDeleted = await this.chatChannelGateway.softDeleteOwnedById(
      command.authenticatedUserId,
      command.channelId
    );

    if (!isDeleted) {
      throw new NotFoundApplicationError("Chat channel not found.");
    }
  }
}
