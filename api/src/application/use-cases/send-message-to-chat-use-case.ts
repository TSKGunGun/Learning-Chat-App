import { NotImplementedApplicationError } from "@/shared/errors/application-error";

export interface SendMessageToChatCommand {
  readonly authenticatedUserId: string;
  readonly channelId: string;
  readonly messageText: string;
}

export interface SendMessageToChatResult {
  readonly channelName: string;
  readonly messageId: string;
  readonly senderType: "user";
  readonly messageText: string;
  readonly status: "completed";
  readonly createdAt: string;
}

export class SendMessageToChatUseCase {
  public async execute(
    _command: SendMessageToChatCommand
  ): Promise<SendMessageToChatResult> {
    void _command;

    throw new NotImplementedApplicationError(
      "POST /api/chats/{channel_id}/messages is not implemented yet."
    );
  }
}
