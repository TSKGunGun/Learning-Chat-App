import { OpenAIEmbeddings } from "@langchain/openai";

import type { EmbeddingGateway } from "@/gateways/embedding-gateway";

interface EmbeddingClient {
  embedQuery(input: string): Promise<ReadonlyArray<number>>;
}

interface OpenAiEmbeddingGatewayDependencies {
  readonly apiKey: string;
  readonly model: string;
  readonly client?: EmbeddingClient;
}

export class OpenAiEmbeddingGateway implements EmbeddingGateway {
  private readonly client: EmbeddingClient;

  public constructor(dependencies: OpenAiEmbeddingGatewayDependencies) {
    this.client =
      dependencies.client ??
      new OpenAIEmbeddings({
        apiKey: dependencies.apiKey,
        model: dependencies.model,
      });
  }

  public async generateEmbedding(input: string): Promise<ReadonlyArray<number>> {
    return this.client.embedQuery(input);
  }
}
