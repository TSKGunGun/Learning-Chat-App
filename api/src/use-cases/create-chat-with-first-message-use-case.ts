import { NotImplementedApplicationError } from "@/shared/errors/application-error";

export interface CreateChatWithFirstMessageCommand {
  readonly authenticatedUserId: string;
  readonly messageText: string;
}

export interface CreateChatWithFirstMessageResult {
  readonly channelId: string;
  readonly channelName: string;
  readonly messageId: string;
  readonly senderType: "user";
  readonly messageText: string;
  readonly status: "completed";
  readonly createdAt: string;
}

export class CreateChatWithFirstMessageUseCase {
  public async execute(
    command: CreateChatWithFirstMessageCommand
  ): Promise<CreateChatWithFirstMessageResult> {
    void command;

    throw new NotImplementedApplicationError(
      "POST /api/chats is not implemented yet."
    );
  }
}
