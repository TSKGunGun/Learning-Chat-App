import OpenAI from "openai";

import type {
  ChatCompletionGateway,
  ChatCompletionRequest,
} from "@/gateways/chat-completion-gateway";

interface OpenAiResponse {
  readonly output_text: string;
}

interface OpenAiResponsesClient {
  readonly responses: {
    create(input: {
      readonly model: string;
      readonly instructions?: string;
      readonly input: Array<{
        readonly role: "user" | "assistant";
        readonly content: string;
      }>;
      readonly temperature: number;
      readonly max_output_tokens: number;
    }): Promise<OpenAiResponse>;
  };
}

interface OpenAiChatCompletionGatewayDependencies {
  readonly apiKey: string;
  readonly model: string;
  readonly client?: OpenAiResponsesClient;
}

const normalizeReply = (value: string): string => {
  const normalizedReply = value.trim();

  if (normalizedReply.length === 0) {
    throw new Error("Generated AI reply must not be empty.");
  }

  return normalizedReply;
};

const mapConversationHistory = (
  request: ChatCompletionRequest
): Array<{
  readonly role: "user" | "assistant";
  readonly content: string;
}> =>
  request.conversationHistory
    .filter(
      (
        message
      ): message is {
        readonly role: "user" | "assistant";
        readonly content: string;
      } => message.role === "user" || message.role === "assistant"
    )
    .map((message) => ({
      role: message.role,
      content: message.content,
    }));

export class OpenAiChatCompletionGateway implements ChatCompletionGateway {
  private readonly client: OpenAiResponsesClient;

  public constructor(
    private readonly dependencies: OpenAiChatCompletionGatewayDependencies
  ) {
    this.client =
      dependencies.client ??
      new OpenAI({
        apiKey: dependencies.apiKey,
      });
  }

  public async generateReply(
    request: ChatCompletionRequest
  ): Promise<string> {
    const response = await this.client.responses.create({
      model: this.dependencies.model,
      instructions: request.systemPrompt,
      input: mapConversationHistory(request),
      temperature: 0.9,
      max_output_tokens: 800,
    });

    return normalizeReply(response.output_text);
  }
}
