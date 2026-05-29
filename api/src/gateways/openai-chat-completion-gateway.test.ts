import { OpenAiChatCompletionGateway } from "@/gateways/openai-chat-completion-gateway";

describe("OpenAiChatCompletionGateway", () => {
  it("sends system prompt, conversation history, and model settings to OpenAI", async () => {
    const create = vi.fn(async () => ({
      output_text: "  もちろんです。いっしょに考えましょう。  ",
    }));
    const gateway = new OpenAiChatCompletionGateway({
      apiKey: "test-api-key",
      model: "gpt-4o",
      client: {
        responses: {
          create,
        },
      },
    });

    await expect(
      gateway.generateReply({
        systemPrompt: "親しみやすく答えてください。",
        conversationHistory: [
          {
            role: "user",
            content: "ずんだもちについて教えて",
          },
          {
            role: "assistant",
            content: "もちろんです！",
          },
        ],
        userId: "11111111-1111-4111-8111-111111111111",
        channelId: "22222222-2222-4222-8222-222222222222",
      })
    ).resolves.toBe("もちろんです。いっしょに考えましょう。");

    expect(create).toHaveBeenCalledWith({
      model: "gpt-4o",
      instructions: "親しみやすく答えてください。",
      input: [
        {
          role: "user",
          content: "ずんだもちについて教えて",
        },
        {
          role: "assistant",
          content: "もちろんです！",
        },
      ],
      temperature: 0.9,
      max_output_tokens: 800,
    });
  });

  it("ignores system-role history items and trims the generated text", async () => {
    const gateway = new OpenAiChatCompletionGateway({
      apiKey: "test-api-key",
      model: "gpt-4o",
      client: {
        responses: {
          create: async () => ({
            output_text: "  了解しました。  ",
          }),
        },
      },
    });

    await expect(
      gateway.generateReply({
        systemPrompt: "friendly",
        conversationHistory: [
          {
            role: "system",
            content: "ignore me",
          },
          {
            role: "user",
            content: "本文です",
          },
        ],
      })
    ).resolves.toBe("了解しました。");
  });

  it("throws when the response text is blank", async () => {
    const gateway = new OpenAiChatCompletionGateway({
      apiKey: "test-api-key",
      model: "gpt-4o",
      client: {
        responses: {
          create: async () => ({
            output_text: "   ",
          }),
        },
      },
    });

    await expect(
      gateway.generateReply({
        systemPrompt: "friendly",
        conversationHistory: [
          {
            role: "user",
            content: "本文です",
          },
        ],
      })
    ).rejects.toThrow("Generated AI reply must not be empty.");
  });

  it("propagates OpenAI client failures", async () => {
    const gateway = new OpenAiChatCompletionGateway({
      apiKey: "test-api-key",
      model: "gpt-4o",
      client: {
        responses: {
          create: async () => {
            throw new Error("OpenAI failed");
          },
        },
      },
    });

    await expect(
      gateway.generateReply({
        systemPrompt: "friendly",
        conversationHistory: [
          {
            role: "user",
            content: "本文です",
          },
        ],
      })
    ).rejects.toThrow("OpenAI failed");
  });
});
