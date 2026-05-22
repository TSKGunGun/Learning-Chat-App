export interface EmbeddingGateway {
  generateEmbedding(input: string): Promise<ReadonlyArray<number>>;
}
