import crypto from "node:crypto";

import { and, eq, gt, isNull } from "drizzle-orm";

import type { Database } from "@/db/client";
import { sessions, users } from "@/db/schema";
import type { User } from "@/entities/user";
import type { SessionGateway } from "@/gateways/session-gateway";

const hashSessionToken = (sessionToken: string): string =>
  crypto.createHash("sha256").update(sessionToken).digest("hex");

const createOpaqueSessionToken = (): string => crypto.randomBytes(32).toString("hex");

export class DrizzleSessionGateway implements SessionGateway {
  public constructor(
    private readonly database: Database,
    private readonly sessionTtlSeconds: number
  ) {}

  public async createSession(userId: string): Promise<string> {
    const sessionToken = createOpaqueSessionToken();
    const sessionTokenHash = hashSessionToken(sessionToken);
    const now = new Date();
    const expiresAt = new Date(
      now.getTime() + this.sessionTtlSeconds * 1_000
    );

    await this.database.insert(sessions).values({
      id: crypto.randomUUID(),
      userId,
      sessionTokenHash,
      expiresAt,
      createdAt: now,
      updatedAt: now,
    });

    return sessionToken;
  }

  public async getAuthenticatedUser(
    sessionToken: string
  ): Promise<User | null> {
    const sessionTokenHash = hashSessionToken(sessionToken);
    const [authenticatedUser] = await this.database
      .select({
        id: users.id,
        username: users.username,
      })
      .from(sessions)
      .innerJoin(users, eq(sessions.userId, users.id))
      .where(
        and(
          eq(sessions.sessionTokenHash, sessionTokenHash),
          gt(sessions.expiresAt, new Date()),
          isNull(sessions.revokedAt)
        )
      )
      .limit(1);

    return authenticatedUser ?? null;
  }
}
