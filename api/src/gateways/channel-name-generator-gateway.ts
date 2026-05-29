export interface GenerateChannelNameInput {
  readonly firstMessageText: string;
  readonly userId: string;
}

export interface ChannelNameGeneratorGateway {
  generateChannelName(input: GenerateChannelNameInput): Promise<string>;
}
