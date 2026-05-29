import type { ChatMessage } from "@/entities/chat-message";
import type { ChatCompletionGateway } from "@/gateways/chat-completion-gateway";
import type { CorrectionAnalysisGateway } from "@/gateways/correction-analysis-gateway";
import type { CorrectionRuleGateway } from "@/gateways/correction-rule-gateway";
import type { EmbeddingGateway } from "@/gateways/embedding-gateway";
import type { MessageGateway } from "@/gateways/message-gateway";
import type { Clock } from "@/shared/clock";
import type { IdGenerator } from "@/shared/id-generator";

export interface StartAiReplyLifecycleCommand {
  readonly authenticatedUserId: string;
  readonly channelId: string;
  readonly pendingMessageId: string;
}

interface AiReplyLifecycleServiceDependencies {
  readonly messageGateway: MessageGateway;
  readonly chatCompletionGateway: ChatCompletionGateway;
  readonly correctionAnalysisGateway: CorrectionAnalysisGateway;
  readonly correctionRuleGateway: CorrectionRuleGateway;
  readonly embeddingGateway: EmbeddingGateway;
  readonly clock: Clock;
  readonly idGenerator: IdGenerator;
  readonly timeoutMilliseconds?: number;
}

const AI_TIMEOUT_MESSAGE = "AI応答がありません";
const DEFAULT_TIMEOUT_MILLISECONDS = 60_000;
const RELEVANT_RULE_LIMIT = 5;
const FEEDBACK_EXAMPLE_LIMIT = 10;
const AI_REPLY_SYSTEM_PROMPT = [
  "あなたは親しみやすく、会話しやすいAIアシスタントです。",
  "フレンドリーで自然な日本語で答えてください。",
  "ユーザーに寄り添いながら、創造性をやや高めにして考えてください。",
  "ただし過度に脱線せず、直近のユーザーの質問や依頼に正面から役立つ回答を返してください。",
  "必要に応じて具体例や提案を出して構いません。",
].join("\n");

const toConversationHistory = (
  messages: ReadonlyArray<ChatMessage>
): ReadonlyArray<{ readonly role: "user" | "assistant"; readonly content: string }> =>
  messages.flatMap((message) => {
    if (message.messageText === null) {
      return [];
    }

    return [
      {
        role: message.senderType === "user" ? "user" : "assistant",
        content: message.messageText,
      },
    ];
  });

const findLatestUserMessage = (
  messages: ReadonlyArray<ChatMessage>
): ChatMessage | null => {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    if (
      messages[index].senderType === "user" &&
      messages[index].messageText !== null
    ) {
      return messages[index];
    }
  }

  return null;
};

const removePendingMessages = (
  messages: ReadonlyArray<ChatMessage>
): ReadonlyArray<ChatMessage> =>
  messages.filter((message) => message.status !== "pending");

const buildLearningPrompt = (input: {
  readonly relevantRules: ReadonlyArray<{
    readonly ruleText: string;
  }>;
  readonly feedbackExamples: ReadonlyArray<{
    readonly messageText: string;
    readonly aiFeedback: boolean;
  }>;
}): string => {
  const sections = [AI_REPLY_SYSTEM_PROMPT];

  if (input.relevantRules.length > 0) {
    sections.push(
      [
        "以下は過去の訂正から抽出されたルールです。今回の回答でも優先して守ってください。",
        ...input.relevantRules.map((rule, index) => `${index + 1}. ${rule.ruleText}`),
      ].join("\n")
    );
  }

  if (input.feedbackExamples.length > 0) {
    sections.push(
      [
        "以下は過去のAI回答に対する評価例です。Good は参考にし、Bad は避けてください。",
        ...input.feedbackExamples.map((example, index) => {
          const label = example.aiFeedback ? "Good" : "Bad";
          return `${index + 1}. ${label}: ${example.messageText}`;
        }),
      ].join("\n")
    );
  }

  return sections.join("\n\n");
};

export class AiReplyLifecycleService {
  private readonly timeoutMilliseconds: number;

  public constructor(
    private readonly dependencies: AiReplyLifecycleServiceDependencies
  ) {
    this.timeoutMilliseconds =
      dependencies.timeoutMilliseconds ?? DEFAULT_TIMEOUT_MILLISECONDS;
  }

  public async start(
    command: StartAiReplyLifecycleCommand
  ): Promise<void> {
    const conversationHistory = await this.dependencies.messageGateway.listByChannelId(
      command.channelId
    );

    void this.completeReply({
      ...command,
      conversationHistory,
    }).catch((error: unknown) => {
      console.error(error);
    });
  }

  private async completeReply(command: {
    readonly authenticatedUserId: string;
    readonly channelId: string;
    readonly pendingMessageId: string;
    readonly conversationHistory: ReadonlyArray<ChatMessage>;
  }): Promise<void> {
    const conversationWithoutPending = removePendingMessages(
      command.conversationHistory
    );
    const latestUserMessage = findLatestUserMessage(conversationWithoutPending);
    const learningContext = latestUserMessage
      ? await this.loadLearningContext({
          authenticatedUserId: command.authenticatedUserId,
          channelId: command.channelId,
          conversationHistory: conversationWithoutPending,
          latestUserMessage,
        })
      : {
          relevantRules: [],
          feedbackExamples: [],
        };
    const timeout = this.createTimeoutPromise();

    try {
      const completionPromise =
        this.dependencies.chatCompletionGateway.generateReply({
          conversationHistory: toConversationHistory(conversationWithoutPending),
          systemPrompt: buildLearningPrompt(learningContext),
          userId: command.authenticatedUserId,
          channelId: command.channelId,
          metadata: {
            intent: "reply",
          },
        });
      const completedReply = await Promise.race([
        completionPromise,
        timeout.promise,
      ]);

      timeout.cancel();

      if (completedReply === null) {
        await this.markTimedOut(command);

        return;
      }

      const completedAt = this.dependencies.clock.now().toISOString();

      try {
        await this.dependencies.messageGateway.updateAiMessage(
          command.pendingMessageId,
          {
            channelId: command.channelId,
            status: "completed",
            messageText: completedReply,
            lastMessagedAt: completedAt,
          }
        );
      } catch {
        await this.markTimedOut(command);

        return;
      }
    } catch {
      timeout.cancel();
      await this.markTimedOut(command);
    }
  }

  private async loadLearningContext(input: {
    readonly authenticatedUserId: string;
    readonly channelId: string;
    readonly conversationHistory: ReadonlyArray<ChatMessage>;
    readonly latestUserMessage: ChatMessage;
  }): Promise<{
    readonly relevantRules: ReadonlyArray<{
      readonly ruleText: string;
    }>;
    readonly feedbackExamples: ReadonlyArray<{
      readonly messageText: string;
      readonly aiFeedback: boolean;
    }>;
  }> {
    await this.tryPersistExtractedRules(input);

    const feedbackExamplesPromise =
      this.dependencies.messageGateway.listFeedbackExamplesByUserId(
        input.authenticatedUserId,
        FEEDBACK_EXAMPLE_LIMIT
      );

    const relevantRulesPromise = this.findRelevantRules(input);
    const [feedbackExamples, relevantRules] = await Promise.all([
      feedbackExamplesPromise.catch((error: unknown) => {
        console.error(error);
        return [];
      }),
      relevantRulesPromise,
    ]);

    return {
      relevantRules,
      feedbackExamples,
    };
  }

  private async tryPersistExtractedRules(input: {
    readonly authenticatedUserId: string;
    readonly channelId: string;
    readonly conversationHistory: ReadonlyArray<ChatMessage>;
    readonly latestUserMessage: ChatMessage;
  }): Promise<void> {
    try {
      const correctionAnalysis =
        await this.dependencies.correctionAnalysisGateway.analyzeConversation({
          conversationHistory: input.conversationHistory,
          latestUserMessage: input.latestUserMessage,
        });

      if (
        !correctionAnalysis.isCorrectionIntent ||
        correctionAnalysis.extractedRules.length === 0
      ) {
        return;
      }

      const createdAt = this.dependencies.clock.now().toISOString();
      const embeddings = await Promise.all(
        correctionAnalysis.extractedRules.map((rule) =>
          this.dependencies.embeddingGateway.generateEmbedding(rule)
        )
      );

      await this.dependencies.correctionRuleGateway.saveRules(
        correctionAnalysis.extractedRules.map((rule, index) => ({
          id: this.dependencies.idGenerator.generate(),
          channelId: input.channelId,
          triggerMessageId: input.latestUserMessage.id,
          ruleText: rule,
          embedding: embeddings[index],
          createdAt,
        }))
      );
    } catch (error: unknown) {
      console.error(error);
    }
  }

  private async findRelevantRules(input: {
    readonly authenticatedUserId: string;
    readonly latestUserMessage: ChatMessage;
  }): Promise<ReadonlyArray<{
    readonly ruleText: string;
  }>> {
    try {
      const messageText = input.latestUserMessage.messageText;

      if (!messageText) {
        return [];
      }

      const queryEmbedding =
        await this.dependencies.embeddingGateway.generateEmbedding(messageText);
      const relevantRules =
        await this.dependencies.correctionRuleGateway.findRelevantRulesByUserId({
          userId: input.authenticatedUserId,
          queryEmbedding,
          limit: RELEVANT_RULE_LIMIT,
        });

      return relevantRules;
    } catch (error: unknown) {
      console.error(error);
      return [];
    }
  }

  private createTimeoutPromise(): {
    readonly promise: Promise<null>;
    readonly cancel: () => void;
  } {
    let timeoutHandle: ReturnType<typeof setTimeout> | undefined;

    return {
      promise: new Promise<null>((resolve) => {
        timeoutHandle = setTimeout(() => {
          resolve(null);
        }, this.timeoutMilliseconds);
      }),
      cancel: () => {
        if (timeoutHandle !== undefined) {
          clearTimeout(timeoutHandle);
        }
      },
    };
  }

  private async markTimedOut(command: {
    readonly authenticatedUserId: string;
    readonly channelId: string;
    readonly pendingMessageId: string;
  }): Promise<void> {
    const timedOutAt = this.dependencies.clock.now().toISOString();

    await this.dependencies.messageGateway.updateAiMessage(command.pendingMessageId, {
      channelId: command.channelId,
      status: "ai_timeout",
      messageText: AI_TIMEOUT_MESSAGE,
      lastMessagedAt: timedOutAt,
    });
  }
}
