import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";

import type {
  AnalyzeCorrectionConversationInput,
  CorrectionAnalysisGateway,
  CorrectionAnalysisResult,
} from "@/gateways/correction-analysis-gateway";

const CORRECTION_ANALYSIS_SCHEMA = z.object({
  isCorrectionIntent: z.boolean(),
  extractedRules: z.array(z.string()),
});

interface StructuredOutputClient {
  invoke(input: unknown): Promise<CorrectionAnalysisResult>;
}

interface LangChainCorrectionAnalysisGatewayDependencies {
  readonly apiKey: string;
  readonly model: string;
  readonly client?: StructuredOutputClient;
}

const CORRECTION_ANALYSIS_INSTRUCTIONS = [
  "あなたはAIチャットの自己改善ルール抽出アシスタントです。",
  "入力には最新のユーザーメッセージと、そのメッセージに至る会話履歴が含まれます。",
  "最新メッセージが、AIの過去回答への訂正・修正依頼・方針修正・禁止事項の指摘なら isCorrectionIntent を true にしてください。",
  "単なる新規質問、追加情報、雑談、感想だけなら false にしてください。",
  "true の場合は、今後の回答で守るべき再利用可能なルールだけを extractedRules に入れてください。",
  "ルールは一般化した日本語の短文で、1件ごとに独立して解釈できる形にしてください。",
  "会話固有の固有名詞や一度きりの指示だけはルールに含めないでください。",
  "再利用価値のない場合は true でも extractedRules を空にして構いません。",
].join("\n");

const normalizeRuleText = (value: string): string =>
  value
    .trim()
    .replace(/^[-\d.)\s]+/, "")
    .replace(/\s+/g, " ");

const createConversationTranscript = (
  input: AnalyzeCorrectionConversationInput
): string =>
  input.conversationHistory
    .filter((message) => message.messageText !== null)
    .map((message, index) => {
      const speaker = message.senderType === "user" ? "user" : "ai";
      return `${index + 1}. ${speaker}: ${message.messageText}`;
    })
    .join("\n");

export class LangChainCorrectionAnalysisGateway
  implements CorrectionAnalysisGateway
{
  private readonly client: StructuredOutputClient;

  public constructor(dependencies: LangChainCorrectionAnalysisGatewayDependencies) {
    this.client =
      dependencies.client ??
      new ChatOpenAI({
        apiKey: dependencies.apiKey,
        model: dependencies.model,
        temperature: 0,
      }).withStructuredOutput(CORRECTION_ANALYSIS_SCHEMA, {
        name: "CorrectionAnalysis",
        strict: true,
      });
  }

  public async analyzeConversation(
    input: AnalyzeCorrectionConversationInput
  ): Promise<CorrectionAnalysisResult> {
    const rawResult = await this.client.invoke([
      {
        role: "system",
        content: CORRECTION_ANALYSIS_INSTRUCTIONS,
      },
      {
        role: "user",
        content: [
          `最新のユーザーメッセージ: ${input.latestUserMessage.messageText ?? ""}`,
          "会話履歴:",
          createConversationTranscript(input),
        ].join("\n\n"),
      },
    ]);

    const normalizedRules = Array.from(
      new Set(
        rawResult.extractedRules
          .map(normalizeRuleText)
          .filter((rule) => rule.length > 0)
      )
    );

    return {
      isCorrectionIntent: rawResult.isCorrectionIntent,
      extractedRules: normalizedRules,
    };
  }
}
