import { NotImplementedApplicationError } from "@/shared/errors/application-error";

export interface DeleteChatByIdCommand {
  readonly authenticatedUserId: string;
  readonly channelId: string;
}

export class DeleteChatByIdUseCase {
  public async execute(command: DeleteChatByIdCommand): Promise<void> {
    void command;

    throw new NotImplementedApplicationError(
      "DELETE /api/chats/{channel_id} is not implemented yet."
    );
  }
}
