import { OpenAiEmbeddingGateway } from "@/gateways/openai-embedding-gateway";

describe("OpenAiEmbeddingGateway", () => {
  it("delegates embedding generation to the configured client", async () => {
    const embedQuery = vi.fn(async () => [0.1, 0.2, 0.3]);
    const gateway = new OpenAiEmbeddingGateway({
      apiKey: "test-api-key",
      model: "text-embedding-3-small",
      client: {
        embedQuery,
      },
    });

    await expect(gateway.generateEmbedding("訂正ルール")).resolves.toEqual([
      0.1, 0.2, 0.3,
    ]);
    expect(embedQuery).toHaveBeenCalledWith("訂正ルール");
  });
});
