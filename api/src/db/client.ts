import { drizzle } from "drizzle-orm/node-postgres";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import { loadEnvironment, requireEnvironmentVariable } from "./env";
import { chatChannels, correctionRules, messages, sessions, users } from "./schema";

loadEnvironment();

const schema = {
  chatChannels,
  correctionRules,
  messages,
  users,
  sessions,
};

export type Database = Pick<
  NodePgDatabase<typeof schema>,
  "delete" | "execute" | "insert" | "select" | "transaction" | "update"
>;

export interface DatabaseConnection {
  readonly pool: Pool;
  readonly database: Database;
}

export const createDatabasePool = (
  connectionString = requireEnvironmentVariable("DATABASE_URL")
): Pool =>
  new Pool({
    connectionString,
  });

export const createDatabaseClient = (pool = createDatabasePool()): Database =>
  drizzle(pool, { schema }) as Database;

export const createDatabaseConnection = (
  connectionString = requireEnvironmentVariable("DATABASE_URL")
): DatabaseConnection => {
  const pool = createDatabasePool(connectionString);

  return {
    pool,
    database: createDatabaseClient(pool),
  };
};

export const databasePool = createDatabasePool();
export const db = createDatabaseClient(databasePool);

let runtimeDatabaseConnection: DatabaseConnection | null = {
  pool: databasePool,
  database: db,
};

export const getRuntimeDatabaseConnection = (): DatabaseConnection => {
  runtimeDatabaseConnection ??= createDatabaseConnection();
  return runtimeDatabaseConnection;
};

export const getRuntimeDatabase = (): Database =>
  getRuntimeDatabaseConnection().database;

export { schema };
