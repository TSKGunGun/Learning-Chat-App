import { LangChainCorrectionAnalysisGateway } from "@/gateways/langchain-correction-analysis-gateway";

describe("LangChainCorrectionAnalysisGateway", () => {
  it("normalizes and deduplicates extracted rules", async () => {
    const invoke = vi.fn(async () => ({
      isCorrectionIntent: true,
      extractedRules: [
        " 1. 結論から答える ",
        "- 結論から答える",
        " 箇条書きは必要なときだけ使う ",
      ],
    }));
    const gateway = new LangChainCorrectionAnalysisGateway({
      apiKey: "test-api-key",
      model: "gpt-4o",
      client: {
        invoke,
      },
    });

    await expect(
      gateway.analyzeConversation({
        latestUserMessage: {
          id: "11111111-1111-4111-8111-111111111111",
          channelId: "22222222-2222-4222-8222-222222222222",
          senderType: "user",
          messageText: "前の回答を訂正してください。",
          status: "completed",
          aiFeedback: null,
          createdAt: "2026-05-29T00:00:00.000Z",
        },
        conversationHistory: [
          {
            id: "11111111-1111-4111-8111-111111111111",
            channelId: "22222222-2222-4222-8222-222222222222",
            senderType: "user",
            messageText: "前の回答を訂正してください。",
            status: "completed",
            aiFeedback: null,
            createdAt: "2026-05-29T00:00:00.000Z",
          },
        ],
      })
    ).resolves.toEqual({
      isCorrectionIntent: true,
      extractedRules: ["結論から答える", "箇条書きは必要なときだけ使う"],
    });

    expect(invoke).toHaveBeenCalledTimes(1);
  });
});
