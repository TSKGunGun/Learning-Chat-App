import type { ChannelNameGeneratorGateway } from "@/gateways/channel-name-generator-gateway";
import {
  buildDeterministicFallback,
  CHANNEL_NAME_MAX_LENGTH,
  SafeFallbackChannelNameGenerator,
} from "@/gateways/fallback-channel-name-generator";

class StubChannelNameGeneratorGateway implements ChannelNameGeneratorGateway {
  public constructor(
    private readonly implementation: (
      firstMessageText: string
    ) => Promise<string> | string
  ) {}

  public async generateChannelName(input: {
    readonly firstMessageText: string;
    readonly userId: string;
  }): Promise<string> {
    void input.userId;

    return this.implementation(input.firstMessageText);
  }
}

describe("SafeFallbackChannelNameGenerator", () => {
  it("returns the normalized primary generator result", async () => {
    const gateway = new SafeFallbackChannelNameGenerator({
      primaryGenerator: new StubChannelNameGeneratorGateway(
        async () => " 「AIが付けたタイトル」 "
      ),
    });

    await expect(
      gateway.generateChannelName({
        firstMessageText: "最初の相談内容です",
        userId: "11111111-1111-4111-8111-111111111111",
      })
    ).resolves.toBe("AIが付けたタイトル");
  });

  it("falls back deterministically when the primary generator fails", async () => {
    const gateway = new SafeFallbackChannelNameGenerator({
      primaryGenerator: new StubChannelNameGeneratorGateway(async () => {
        throw new Error("OpenAI failed");
      }),
    });

    await expect(
      gateway.generateChannelName({
        firstMessageText: "  改行ありのタイトル候補です\n補足テキストもあります  ",
        userId: "11111111-1111-4111-8111-111111111111",
      })
    ).resolves.toBe("改行ありのタイトル候補です");
  });

  it("falls back deterministically when the generated title is empty", async () => {
    const gateway = new SafeFallbackChannelNameGenerator({
      primaryGenerator: new StubChannelNameGeneratorGateway(async () => "   "),
    });

    await expect(
      gateway.generateChannelName({
        firstMessageText: "長い本文でも安全に fallback します",
        userId: "11111111-1111-4111-8111-111111111111",
      })
    ).resolves.toBe("長い本文でも安全に fallback します");
  });
});

describe("buildDeterministicFallback", () => {
  it("returns a default title when the first message is blank", () => {
    expect(buildDeterministicFallback("   \n   ")).toBe("新しいチャット");
  });

  it("truncates long text to the channel name limit", () => {
    const result = buildDeterministicFallback("あ".repeat(80));

    expect(result).toHaveLength(CHANNEL_NAME_MAX_LENGTH);
  });
});
