import type {
  ChatCompletionGateway,
  ChatCompletionMessage,
  ChatCompletionRequest,
} from "@/gateways/chat-completion-gateway";

const AI_REPLY_PREFIX = "AI応答（仮）:";

const normalizeWhitespace = (value: string): string =>
  value.replace(/\s+/g, " ").trim();

const findLatestUserMessage = (
  conversationHistory: ReadonlyArray<ChatCompletionMessage>
): string => {
  const latestUserMessage = [...conversationHistory]
    .reverse()
    .find((message) => message.role === "user");

  return latestUserMessage?.content.trim() ?? "";
};

export class SafeFallbackChatCompletionGateway
  implements ChatCompletionGateway
{
  public async generateReply(
    request: ChatCompletionRequest
  ): Promise<string> {
    const latestUserMessage = findLatestUserMessage(request.conversationHistory);
    const summary =
      latestUserMessage.length > 0
        ? normalizeWhitespace(latestUserMessage).slice(0, 80)
        : "メッセージを受け取りました。";

    return `${AI_REPLY_PREFIX} ${summary}`;
  }
}
