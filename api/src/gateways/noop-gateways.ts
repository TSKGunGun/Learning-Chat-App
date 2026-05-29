import type {
  ChatChannelGateway,
  CreateChatChannelInput,
} from "@/gateways/chat-channel-gateway";
import type {
  ChannelNameGeneratorGateway,
  GenerateChannelNameInput,
} from "@/gateways/channel-name-generator-gateway";
import type { ChatCompletionGateway } from "@/gateways/chat-completion-gateway";
import type { ChatCompletionRequest } from "@/gateways/chat-completion-gateway";
import type {
  AnalyzeCorrectionConversationInput,
  CorrectionAnalysisGateway,
  CorrectionAnalysisResult,
} from "@/gateways/correction-analysis-gateway";
import type { CorrectionRuleGateway } from "@/gateways/correction-rule-gateway";
import type { EmbeddingGateway } from "@/gateways/embedding-gateway";
import type {
  AiFeedbackExample,
  AppendedChatMessages,
  AppendUserMessageWithPendingAiMessageInput,
  MessageGateway,
  OwnedAiMessageForFeedback,
  UpdateAiMessageInput,
} from "@/gateways/message-gateway";
import type { PasswordHasher } from "@/gateways/password-hasher";
import type { SessionGateway } from "@/gateways/session-gateway";
import type { UserGateway } from "@/gateways/user-gateway";
import type { ChatChannel } from "@/entities/chat-channel";
import type { ChatMessage } from "@/entities/chat-message";
import { NotImplementedApplicationError } from "@/shared/errors/application-error";

export class NoopUserGateway implements UserGateway {
  public async findByUsername(_username: string): Promise<null> {
    void _username;

    return null;
  }
}

export class NoopSessionGateway implements SessionGateway {
  public async createSession(_userId: string): Promise<string> {
    void _userId;

    throw new NotImplementedApplicationError(
      "Session persistence is not implemented yet."
    );
  }

  public async getAuthenticatedUser(_sessionToken: string): Promise<null> {
    void _sessionToken;

    throw new NotImplementedApplicationError(
      "Session persistence is not implemented yet."
    );
  }
}

export class NoopChatChannelGateway implements ChatChannelGateway {
  public async listActiveByUserId(
    _userId: string
  ): Promise<ReadonlyArray<never>> {
    void _userId;

    throw new NotImplementedApplicationError(
      "Chat channel persistence is not implemented yet."
    );
  }

  public async findActiveOwnedById(
    _userId: string,
    _channelId: string
  ): Promise<ChatChannel | null> {
    void _userId;
    void _channelId;

    throw new NotImplementedApplicationError(
      "Chat channel persistence is not implemented yet."
    );
  }

  public async create(
    _channel: CreateChatChannelInput
  ): Promise<ChatChannel> {
    void _channel;

    throw new NotImplementedApplicationError(
      "Chat channel persistence is not implemented yet."
    );
  }

  public async softDeleteOwnedById(
    _userId: string,
    _channelId: string
  ): Promise<boolean> {
    void _userId;
    void _channelId;

    throw new NotImplementedApplicationError(
      "Chat channel persistence is not implemented yet."
    );
  }

  public async updateLastMessagedAtOwnedById(
    _userId: string,
    _channelId: string,
    _lastMessagedAt: string
  ): Promise<boolean> {
    void _userId;
    void _channelId;
    void _lastMessagedAt;

    throw new NotImplementedApplicationError(
      "Chat channel persistence is not implemented yet."
    );
  }
}

export class NoopMessageGateway implements MessageGateway {
  public async listByChannelId(
    _channelId: string
  ): Promise<ReadonlyArray<ChatMessage>> {
    void _channelId;

    throw new NotImplementedApplicationError(
      "Message persistence is not implemented yet."
    );
  }

  public async listByActiveOwnedChannelId(
    _userId: string,
    _channelId: string
  ): Promise<ReadonlyArray<ChatMessage>> {
    void _userId;
    void _channelId;

    throw new NotImplementedApplicationError(
      "Message persistence is not implemented yet."
    );
  }

  public async appendUserMessageWithPendingAiMessage(
    _input: AppendUserMessageWithPendingAiMessageInput
  ): Promise<AppendedChatMessages> {
    void _input;

    throw new NotImplementedApplicationError(
      "Message persistence is not implemented yet."
    );
  }

  public async createMessage(_message: ChatMessage): Promise<ChatMessage> {
    void _message;

    throw new NotImplementedApplicationError(
      "Message persistence is not implemented yet."
    );
  }

  public async updateAiMessage(
    _messageId: string,
    _input: UpdateAiMessageInput
  ): Promise<void> {
    void _messageId;
    void _input;

    throw new NotImplementedApplicationError(
      "Message persistence is not implemented yet."
    );
  }

  public async updateMessageFeedback(
    _messageId: string,
    _feedback: boolean | null
  ): Promise<void> {
    void _messageId;
    void _feedback;

    throw new NotImplementedApplicationError(
      "Message persistence is not implemented yet."
    );
  }

  public async findOwnedAiMessageForFeedback(
    _userId: string,
    _channelId: string,
    _messageId: string
  ): Promise<OwnedAiMessageForFeedback | null> {
    void _userId;
    void _channelId;
    void _messageId;

    throw new NotImplementedApplicationError(
      "Message persistence is not implemented yet."
    );
  }

  public async listFeedbackExamplesByUserId(
    _userId: string,
    _limit: number
  ): Promise<ReadonlyArray<AiFeedbackExample>> {
    void _userId;
    void _limit;

    throw new NotImplementedApplicationError(
      "Message persistence is not implemented yet."
    );
  }
}

export class NoopChannelNameGeneratorGateway
  implements ChannelNameGeneratorGateway
{
  public async generateChannelName(
    _input: GenerateChannelNameInput
  ): Promise<string> {
    void _input;

    throw new NotImplementedApplicationError(
      "Channel name generation is not implemented yet."
    );
  }
}

export class NoopCorrectionRuleGateway implements CorrectionRuleGateway {
  public async saveRules(
    _rules: ReadonlyArray<{
      readonly id: string;
      readonly channelId: string;
      readonly triggerMessageId: string;
      readonly ruleText: string;
      readonly embedding: ReadonlyArray<number>;
      readonly createdAt: string;
    }>
  ): Promise<void> {
    void _rules;

    throw new NotImplementedApplicationError(
      "Correction rule persistence is not implemented yet."
    );
  }

  public async findRelevantRulesByUserId(_input: {
    readonly userId: string;
    readonly queryEmbedding: ReadonlyArray<number>;
    readonly limit: number;
  }): Promise<ReadonlyArray<never>> {
    void _input;

    throw new NotImplementedApplicationError(
      "Correction rule persistence is not implemented yet."
    );
  }
}

export class NoopPasswordHasher implements PasswordHasher {
  public async hash(_plainText: string): Promise<string> {
    void _plainText;

    throw new NotImplementedApplicationError(
      "Password hashing is not implemented yet."
    );
  }

  public async verify(
    _plainText: string,
    _hashedValue: string
  ): Promise<boolean> {
    void _plainText;
    void _hashedValue;

    throw new NotImplementedApplicationError(
      "Password verification is not implemented yet."
    );
  }
}

export class NoopChatCompletionGateway implements ChatCompletionGateway {
  public async generateReply(
    _request: ChatCompletionRequest
  ): Promise<string> {
    void _request;

    throw new NotImplementedApplicationError(
      "Chat completion is not implemented yet."
    );
  }
}

export class NoopEmbeddingGateway implements EmbeddingGateway {
  public async generateEmbedding(
    _input: string
  ): Promise<ReadonlyArray<number>> {
    void _input;

    throw new NotImplementedApplicationError(
      "Embedding generation is not implemented yet."
    );
  }
}

export class NoopCorrectionAnalysisGateway implements CorrectionAnalysisGateway {
  public async analyzeConversation(
    _input: AnalyzeCorrectionConversationInput
  ): Promise<CorrectionAnalysisResult> {
    void _input;

    throw new NotImplementedApplicationError(
      "Correction analysis is not implemented yet."
    );
  }
}
