import { eq } from "drizzle-orm";

import type { Database } from "@/db/client";
import { users } from "@/db/schema";
import type { AuthenticationUserRecord, UserGateway } from "@/gateways/user-gateway";

export class DrizzleUserGateway implements UserGateway {
  public constructor(private readonly database: Database) {}

  public async findByUsername(
    username: string
  ): Promise<AuthenticationUserRecord | null> {
    const [userRecord] = await this.database
      .select({
        id: users.id,
        username: users.username,
        passwordHash: users.passwordHash,
      })
      .from(users)
      .where(eq(users.username, username))
      .limit(1);

    return userRecord ?? null;
  }
}
