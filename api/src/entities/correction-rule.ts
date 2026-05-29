export interface CorrectionRule {
  readonly id: string;
  readonly channelId: string;
  readonly triggerMessageId: string;
  readonly ruleText: string;
  readonly embedding: ReadonlyArray<number>;
  readonly createdAt: string;
}
