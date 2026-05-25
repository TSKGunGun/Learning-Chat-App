import { defineConfig } from "drizzle-kit";

import { loadEnvironment, requireEnvironmentVariable } from "./src/db/env";

loadEnvironment();

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./src/db/migrations",
  dbCredentials: {
    url: requireEnvironmentVariable("DATABASE_URL"),
  },
  strict: true,
  verbose: true,
});
