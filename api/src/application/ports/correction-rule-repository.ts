export interface CorrectionRuleRepository {
  findRelevantRulesByChannelId(channelId: string): Promise<ReadonlyArray<string>>;
}
