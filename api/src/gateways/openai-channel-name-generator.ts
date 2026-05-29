import OpenAI from "openai";

import type {
  ChannelNameGeneratorGateway,
  GenerateChannelNameInput,
} from "@/gateways/channel-name-generator-gateway";
import { normalizeGeneratedTitle } from "@/gateways/fallback-channel-name-generator";

const TITLE_GENERATION_INSTRUCTIONS = [
  "あなたはチャットルーム名の生成アシスタントです。",
  "最初のユーザーメッセージを要約し、自然な日本語のタイトルを1つだけ返してください。",
  "10文字から30文字程度を目安にしてください。",
  "説明文、改行、引用符、箇条書き、接頭辞は付けないでください。",
].join("\n");

interface OpenAiResponse {
  readonly output_text: string;
}

interface OpenAiResponsesClient {
  readonly responses: {
    create(input: {
      readonly model: string;
      readonly instructions: string;
      readonly input: string;
      readonly temperature: number;
      readonly max_output_tokens: number;
    }): Promise<OpenAiResponse>;
  };
}

interface OpenAiChannelNameGeneratorDependencies {
  readonly apiKey: string;
  readonly model: string;
  readonly client?: OpenAiResponsesClient;
}

export class OpenAiChannelNameGenerator
  implements ChannelNameGeneratorGateway
{
  private readonly client: OpenAiResponsesClient;

  public constructor(
    private readonly dependencies: OpenAiChannelNameGeneratorDependencies
  ) {
    this.client =
      dependencies.client ??
      new OpenAI({
        apiKey: dependencies.apiKey,
      });
  }

  public async generateChannelName(
    input: GenerateChannelNameInput
  ): Promise<string> {
    const response = await this.client.responses.create({
      model: this.dependencies.model,
      instructions: TITLE_GENERATION_INSTRUCTIONS,
      input: input.firstMessageText,
      temperature: 0.2,
      max_output_tokens: 64,
    });

    return normalizeGeneratedTitle(response.output_text);
  }
}
