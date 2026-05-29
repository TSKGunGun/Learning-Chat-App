export interface SaveCorrectionRuleInput {
  readonly id: string;
  readonly channelId: string;
  readonly triggerMessageId: string;
  readonly ruleText: string;
  readonly embedding: ReadonlyArray<number>;
  readonly createdAt: string;
}

export interface RelevantCorrectionRule {
  readonly ruleText: string;
  readonly similarity: number;
  readonly channelId: string;
  readonly triggerMessageId: string;
  readonly createdAt: string;
}

export interface CorrectionRuleGateway {
  saveRules(rules: ReadonlyArray<SaveCorrectionRuleInput>): Promise<void>;
  findRelevantRulesByUserId(input: {
    readonly userId: string;
    readonly queryEmbedding: ReadonlyArray<number>;
    readonly limit: number;
  }): Promise<ReadonlyArray<RelevantCorrectionRule>>;
}
