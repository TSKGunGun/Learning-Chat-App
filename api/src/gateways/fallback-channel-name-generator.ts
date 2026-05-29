import type {
  ChannelNameGeneratorGateway,
  GenerateChannelNameInput,
} from "@/gateways/channel-name-generator-gateway";

export const CHANNEL_NAME_MAX_LENGTH = 60;

export const buildDeterministicFallback = (messageText: string): string => {
  const firstLine = messageText.split("\n")[0] ?? messageText;
  const normalizedFirstLine = firstLine.trim().replace(/\s+/g, " ");
  const summary = normalizedFirstLine
    .slice(0, CHANNEL_NAME_MAX_LENGTH)
    .trim();

  return summary.length > 0 ? summary : "新しいチャット";
};

export const normalizeGeneratedTitle = (value: string): string => {
  const normalizedTitle = value.trim().replace(/^["'「『]|["'」』]$/g, "");

  if (normalizedTitle.length === 0) {
    throw new Error("Generated channel name must not be empty.");
  }

  return normalizedTitle.slice(0, CHANNEL_NAME_MAX_LENGTH);
};

interface SafeFallbackChannelNameGeneratorDependencies {
  readonly primaryGenerator: ChannelNameGeneratorGateway;
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
        await this.dependencies.primaryGenerator.generateChannelName(input);

      return normalizeGeneratedTitle(generatedName);
    } catch {
      return buildDeterministicFallback(input.firstMessageText);
    }
  }
}
