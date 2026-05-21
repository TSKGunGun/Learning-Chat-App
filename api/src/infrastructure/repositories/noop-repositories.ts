import type { ChatChannelRepository } from "@/application/ports/chat-channel-repository";
import type { ChatCompletionService } from "@/application/ports/chat-completion-service";
import type { CorrectionRuleRepository } from "@/application/ports/correction-rule-repository";
import type { EmbeddingService } from "@/application/ports/embedding-service";
import type { MessageRepository } from "@/application/ports/message-repository";
import type { PasswordHasher } from "@/application/ports/password-hasher";
import type { UserRepository } from "@/application/ports/user-repository";
import { NotImplementedApplicationError } from "@/shared/errors/application-error";

export class NoopUserRepository implements UserRepository {
  public async findByUsername(): Promise<null> {
    return null;
  }
}

export class NoopChatChannelRepository implements ChatChannelRepository {
  public async listByUserId(): Promise<ReadonlyArray<never>> {
    throw new NotImplementedApplicationError(
      "Chat channel persistence is not implemented yet."
    );
  }
}

export class NoopMessageRepository implements MessageRepository {
  public async listByChannelId(): Promise<ReadonlyArray<never>> {
    throw new NotImplementedApplicationError(
      "Message persistence is not implemented yet."
    );
  }
}

export class NoopCorrectionRuleRepository implements CorrectionRuleRepository {
  public async findRelevantRulesByChannelId(): Promise<ReadonlyArray<string>> {
    throw new NotImplementedApplicationError(
      "Correction rule persistence is not implemented yet."
    );
  }
}

export class NoopPasswordHasher implements PasswordHasher {
  public async verify(): Promise<boolean> {
    throw new NotImplementedApplicationError(
      "Password verification is not implemented yet."
    );
  }
}

export class NoopChatCompletionService implements ChatCompletionService {
  public async generateReply(): Promise<string> {
    throw new NotImplementedApplicationError(
      "Chat completion is not implemented yet."
    );
  }
}

export class NoopEmbeddingService implements EmbeddingService {
  public async generateEmbedding(): Promise<ReadonlyArray<number>> {
    throw new NotImplementedApplicationError(
      "Embedding generation is not implemented yet."
    );
  }
}
