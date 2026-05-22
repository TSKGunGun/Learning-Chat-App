export interface ChatCompletionMessage {
  readonly role: "system" | "user" | "assistant";
  readonly content: string;
}

export interface ChatCompletionRequest {
  readonly conversationHistory: ReadonlyArray<ChatCompletionMessage>;
  readonly systemPrompt?: string;
  readonly userId?: string;
  readonly channelId?: string;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export interface ChatCompletionGateway {
  generateReply(request: ChatCompletionRequest): Promise<string>;
}
