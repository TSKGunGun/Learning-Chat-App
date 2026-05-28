import type {
  ChatCompletionGateway,
  ChatCompletionMessage,
  ChatCompletionRequest,
} from "@/gateways/chat-completion-gateway";

const CHANNEL_NAME_MAX_LENGTH = 60;
const AI_REPLY_PREFIX = "AI応答（仮）:";

const normalizeWhitespace = (value: string): string =>
  value.replace(/\s+/g, " ").trim();

const summarizeAsChannelName = (messageText: string): string => {
  const firstLine = messageText.split("\n")[0] ?? messageText;
  const normalizedFirstLine = normalizeWhitespace(firstLine);
  const summary = normalizedFirstLine
    .slice(0, CHANNEL_NAME_MAX_LENGTH)
    .trim();

  return summary.length > 0 ? summary : "新しいチャット";
};

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
    if (request.metadata?.intent === "channel_name") {
      return summarizeAsChannelName(findLatestUserMessage(request.conversationHistory));
    }

    const latestUserMessage = findLatestUserMessage(request.conversationHistory);
    const summary =
      latestUserMessage.length > 0
        ? normalizeWhitespace(latestUserMessage).slice(0, 80)
        : "メッセージを受け取りました。";

    return `${AI_REPLY_PREFIX} ${summary}`;
  }
}
