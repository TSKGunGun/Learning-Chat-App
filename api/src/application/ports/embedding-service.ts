export interface EmbeddingService {
  generateEmbedding(input: string): Promise<ReadonlyArray<number>>;
}
