import { getOpenAiChatModel, getOpenAiEmbeddingModel } from "@/db/env";
import { OpenAiChannelNameGenerator } from "@/gateways/openai-channel-name-generator";

describe("OpenAiChannelNameGenerator", () => {
  it("requests a Japanese title and normalizes the response text", async () => {
    const create = vi.fn(async () => ({
      output_text: "  「会議の相談メモ」  ",
    }));
    const gateway = new OpenAiChannelNameGenerator({
      apiKey: "test-api-key",
      model: "gpt-4o-mini",
      client: {
        responses: {
          create,
        },
      },
    });

    await expect(
      gateway.generateChannelName({
        firstMessageText: "来週の会議について相談したいです",
        userId: "11111111-1111-4111-8111-111111111111",
      })
    ).resolves.toBe("会議の相談メモ");

    expect(create).toHaveBeenCalledWith({
      model: "gpt-4o-mini",
      instructions: expect.stringContaining(
        "最初のユーザーメッセージを要約し"
      ),
      input: "来週の会議について相談したいです",
      temperature: 0.2,
      max_output_tokens: 64,
    });
  });

  it("truncates long generated titles", async () => {
    const gateway = new OpenAiChannelNameGenerator({
      apiKey: "test-api-key",
      model: "gpt-4o-mini",
      client: {
        responses: {
          create: async () => ({
            output_text: "長".repeat(80),
          }),
        },
      },
    });

    await expect(
      gateway.generateChannelName({
        firstMessageText: "本文です",
        userId: "11111111-1111-4111-8111-111111111111",
      })
    ).resolves.toHaveLength(60);
  });

  it("throws when the response text is blank", async () => {
    const gateway = new OpenAiChannelNameGenerator({
      apiKey: "test-api-key",
      model: "gpt-4o-mini",
      client: {
        responses: {
          create: async () => ({
            output_text: "   ",
          }),
        },
      },
    });

    await expect(
      gateway.generateChannelName({
        firstMessageText: "本文です",
        userId: "11111111-1111-4111-8111-111111111111",
      })
    ).rejects.toThrow("Generated channel name must not be empty.");
  });
});

describe("getOpenAiChatModel", () => {
  const originalModel = process.env.OPENAI_CHAT_MODEL;
  const originalEmbeddingModel = process.env.OPENAI_EMBEDDING_MODEL;

  afterEach(() => {
    if (originalModel === undefined) {
      delete process.env.OPENAI_CHAT_MODEL;
    } else {
      process.env.OPENAI_CHAT_MODEL = originalModel;
    }

    if (originalEmbeddingModel === undefined) {
      delete process.env.OPENAI_EMBEDDING_MODEL;
      return;
    }

    process.env.OPENAI_EMBEDDING_MODEL = originalEmbeddingModel;
  });

  it("uses gpt-4o when OPENAI_CHAT_MODEL is not set", () => {
    delete process.env.OPENAI_CHAT_MODEL;

    expect(getOpenAiChatModel()).toBe("gpt-4o");
  });

  it("uses text-embedding-3-small when OPENAI_EMBEDDING_MODEL is not set", () => {
    delete process.env.OPENAI_EMBEDDING_MODEL;

    expect(getOpenAiEmbeddingModel()).toBe("text-embedding-3-small");
  });
});
