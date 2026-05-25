import crypto from "node:crypto";

import bcrypt from "bcryptjs";
import { eq, sql } from "drizzle-orm";

import { createDatabaseConnection } from "./client";
import { getDevSeedConfig } from "./env";
import { sessions, users } from "./schema";

const seed = async (): Promise<void> => {
  const { pool, database } = createDatabaseConnection();
  const { password, saltRounds, username } = getDevSeedConfig();
  const passwordHash = await bcrypt.hash(password, saltRounds);

  try {
    const [seededUser] = await database
      .insert(users)
      .values({
        id: crypto.randomUUID(),
        username,
        passwordHash,
      })
      .onConflictDoUpdate({
        target: users.username,
        set: {
          passwordHash,
          updatedAt: sql`now()`,
        },
      })
      .returning({
        id: users.id,
        username: users.username,
      });

    await database.delete(sessions).where(eq(sessions.userId, seededUser.id));

    console.info(
      `Seeded development user "${seededUser.username}" and cleared existing sessions.`
    );
  } finally {
    await pool.end();
  }
};

seed().catch((error: unknown) => {
  console.error("Failed to seed the development user.", error);
  process.exitCode = 1;
});
