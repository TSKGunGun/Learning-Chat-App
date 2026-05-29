import type { ChatMessage } from "@/entities/chat-message";

export interface AnalyzeCorrectionConversationInput {
  readonly conversationHistory: ReadonlyArray<ChatMessage>;
  readonly latestUserMessage: ChatMessage;
}

export interface CorrectionAnalysisResult {
  readonly isCorrectionIntent: boolean;
  readonly extractedRules: ReadonlyArray<string>;
}

export interface CorrectionAnalysisGateway {
  analyzeConversation(
    input: AnalyzeCorrectionConversationInput
  ): Promise<CorrectionAnalysisResult>;
}
