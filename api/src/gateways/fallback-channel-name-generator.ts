import type { ChatCompletionGateway } from "@/gateways/chat-completion-gateway";
import type {
  ChannelNameGeneratorGateway,
  GenerateChannelNameInput,
} from "@/gateways/channel-name-generator-gateway";

const CHANNEL_NAME_MAX_LENGTH = 60;

const buildDeterministicFallback = (messageText: string): string => {
  const firstLine = messageText.split("\n")[0] ?? messageText;
  const normalizedFirstLine = firstLine.trim().replace(/\s+/g, " ");
  const summary = normalizedFirstLine
    .slice(0, CHANNEL_NAME_MAX_LENGTH)
    .trim();

  return summary.length > 0 ? summary : "新しいチャット";
};

const normalizeGeneratedTitle = (value: string): string => {
  const normalizedTitle = value.trim().replace(/^["'「『]|["'」』]$/g, "");

  if (normalizedTitle.length === 0) {
    throw new Error("Generated channel name must not be empty.");
  }

  return normalizedTitle.slice(0, CHANNEL_NAME_MAX_LENGTH);
};

interface SafeFallbackChannelNameGeneratorDependencies {
  readonly chatCompletionGateway: ChatCompletionGateway;
}

export class SafeFallbackChannelNameGenerator
  implements ChannelNameGeneratorGateway
{
  public constructor(
    private readonly dependencies: SafeFallbackChannelNameGeneratorDependencies
  ) {}

  public async generateChannelName(
    input: GenerateChannelNameInput
  ): Promise<string> {
    try {
      const generatedName =
        await this.dependencies.chatCompletionGateway.generateReply({
          conversationHistory: [
            {
              role: "user",
              content: input.firstMessageText,
            },
          ],
          systemPrompt:
            "Generate a short Japanese chat channel title from the first user message.",
          userId: input.userId,
          metadata: {
            intent: "channel_name",
          },
        });

      return normalizeGeneratedTitle(generatedName);
    } catch {
      return buildDeterministicFallback(input.firstMessageText);
    }
  }
}
