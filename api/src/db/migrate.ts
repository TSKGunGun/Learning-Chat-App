import fs from "node:fs/promises";
import path from "node:path";

import { createDatabaseConnection } from "@/db/client";

const MIGRATIONS_DIRECTORY = path.resolve(
  process.cwd(),
  "./src/db/migrations"
);
const INITIAL_AUTH_MIGRATION = "0000_users_and_sessions.sql";
const MIGRATIONS_TABLE_NAME = "schema_migrations";

interface QueryableClient {
  query: (
    sqlText: string,
    values?: ReadonlyArray<unknown>
  ) => Promise<{ rows: ReadonlyArray<{ readonly filename: string }> } | unknown>;
}

const readMigrationFiles = async (): Promise<ReadonlyArray<string>> => {
  const entries = await fs.readdir(MIGRATIONS_DIRECTORY, {
    withFileTypes: true,
  });

  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".sql"))
    .map((entry) => entry.name)
    .sort();
};

const ensureMigrationsTable = async (client: QueryableClient): Promise<void> => {
  await client.query(`
    CREATE TABLE IF NOT EXISTS "${MIGRATIONS_TABLE_NAME}" (
      "filename" text PRIMARY KEY,
      "applied_at" timestamp with time zone DEFAULT now() NOT NULL
    );
  `);
};

const readAppliedMigrations = async (
  client: QueryableClient
): Promise<ReadonlySet<string>> => {
  const result = (await client.query(
    `SELECT "filename" FROM "${MIGRATIONS_TABLE_NAME}" ORDER BY "filename" ASC;`
  )) as { rows: ReadonlyArray<{ readonly filename: string }> };

  return new Set(result.rows.map((row) => row.filename));
};

const tableExists = async (
  client: QueryableClient,
  tableName: string
): Promise<boolean> => {
  const result = (await client.query(
    `SELECT to_regclass($1) AS "tableName";`,
    [`public.${tableName}`]
  )) as { rows: ReadonlyArray<{ readonly tableName: string | null }> };

  return result.rows[0]?.tableName !== null;
};

const shouldBaselineInitialAuthMigration = async (
  client: QueryableClient,
  migrationFile: string
): Promise<boolean> => {
  if (migrationFile !== INITIAL_AUTH_MIGRATION) {
    return false;
  }

  const [usersTableExists, sessionsTableExists] = await Promise.all([
    tableExists(client, "users"),
    tableExists(client, "sessions"),
  ]);

  return usersTableExists && sessionsTableExists;
};

const main = async (): Promise<void> => {
  const { pool } = createDatabaseConnection();
  const client = await pool.connect();

  try {
    const migrationFiles = await readMigrationFiles();
    await ensureMigrationsTable(client);
    const appliedMigrations = new Set(await readAppliedMigrations(client));

    for (const migrationFile of migrationFiles) {
      if (appliedMigrations.has(migrationFile)) {
        continue;
      }

      if (await shouldBaselineInitialAuthMigration(client, migrationFile)) {
        await client.query(
          `INSERT INTO "${MIGRATIONS_TABLE_NAME}" ("filename") VALUES ($1) ON CONFLICT ("filename") DO NOTHING;`,
          [migrationFile]
        );
        appliedMigrations.add(migrationFile);
        continue;
      }

      const migrationPath = path.join(MIGRATIONS_DIRECTORY, migrationFile);
      const sql = await fs.readFile(migrationPath, "utf8");

      await client.query("BEGIN");

      try {
        await client.query(sql);
        await client.query(
          `INSERT INTO "${MIGRATIONS_TABLE_NAME}" ("filename") VALUES ($1);`,
          [migrationFile]
        );
        await client.query("COMMIT");
        appliedMigrations.add(migrationFile);
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      }
    }
  } finally {
    client.release();
    await pool.end();
  }
};

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
