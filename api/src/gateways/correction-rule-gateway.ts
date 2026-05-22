export interface CorrectionRuleGateway {
  findRelevantRulesByChannelId(channelId: string): Promise<ReadonlyArray<string>>;
}
