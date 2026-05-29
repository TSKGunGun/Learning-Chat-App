import { asc, eq, sql } from "drizzle-orm";

import type { Database } from "@/db/client";
import { chatChannels, correctionRules } from "@/db/schema";
import type {
  CorrectionRuleGateway,
  RelevantCorrectionRule,
  SaveCorrectionRuleInput,
} from "@/gateways/correction-rule-gateway";
import { ApplicationError } from "@/shared/errors/application-error";

const toIsoString = (value: Date): string => value.toISOString();

const parseIsoDateTime = (value: string, fieldName: string): Date => {
  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    throw new ApplicationError(`${fieldName} must be a valid ISO 8601 datetime.`, 400);
  }

  return parsedDate;
};

const createVectorLiteral = (embedding: ReadonlyArray<number>): string => {
  if (embedding.length === 0) {
    throw new ApplicationError("Embedding must not be empty.", 400);
  }

  for (const value of embedding) {
    if (!Number.isFinite(value)) {
      throw new ApplicationError(
        "Embedding values must be finite numbers.",
        400
      );
    }
  }

  return `[${embedding.join(",")}]`;
};

export class DrizzleCorrectionRuleGateway implements CorrectionRuleGateway {
  public constructor(private readonly database: Database) {}

  public async saveRules(
    rules: ReadonlyArray<SaveCorrectionRuleInput>
  ): Promise<void> {
    if (rules.length === 0) {
      return;
    }

    await this.database.insert(correctionRules).values(
      rules.map((rule) => ({
        id: rule.id,
        channelId: rule.channelId,
        triggerMessageId: rule.triggerMessageId,
        ruleText: rule.ruleText,
        embedding: [...rule.embedding],
        createdAt: parseIsoDateTime(rule.createdAt, "createdAt"),
      }))
    );
  }

  public async findRelevantRulesByUserId(input: {
    readonly userId: string;
    readonly queryEmbedding: ReadonlyArray<number>;
    readonly limit: number;
  }): Promise<ReadonlyArray<RelevantCorrectionRule>> {
    if (input.limit <= 0) {
      return [];
    }

    const queryVector = createVectorLiteral(input.queryEmbedding);
    const distanceExpression =
      sql<number>`${correctionRules.embedding} <=> ${queryVector}::vector`;

    const rows = await this.database
      .select({
        ruleText: correctionRules.ruleText,
        similarity: sql<number>`1 - (${distanceExpression})`,
        channelId: correctionRules.channelId,
        triggerMessageId: correctionRules.triggerMessageId,
        createdAt: correctionRules.createdAt,
      })
      .from(correctionRules)
      .innerJoin(chatChannels, eq(correctionRules.channelId, chatChannels.id))
      .where(eq(chatChannels.userId, input.userId))
      .orderBy(distanceExpression, asc(correctionRules.createdAt))
      .limit(input.limit);

    return rows.map((row) => ({
      ruleText: row.ruleText,
      similarity: Number(row.similarity),
      channelId: row.channelId,
      triggerMessageId: row.triggerMessageId,
      createdAt: toIsoString(row.createdAt),
    }));
  }
}
