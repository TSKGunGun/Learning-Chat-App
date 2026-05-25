import { config } from "dotenv";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const CURRENT_DIRECTORY = dirname(fileURLToPath(import.meta.url));
const ROOT_ENV_EXAMPLE_PATH = resolve(CURRENT_DIRECTORY, "../../../.env.example");
const ROOT_ENV_PATH = resolve(CURRENT_DIRECTORY, "../../../.env");

let hasLoadedEnvironment = false;

export const loadEnvironment = (): void => {
  if (hasLoadedEnvironment) {
    return;
  }

  config({
    path: ROOT_ENV_EXAMPLE_PATH,
    override: false,
  });
  config({
    path: ROOT_ENV_PATH,
    override: true,
  });

  hasLoadedEnvironment = true;
};

export const requireEnvironmentVariable = (name: string): string => {
  loadEnvironment();

  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Environment variable ${name} is required.`);
  }

  return value;
};

export interface DevSeedConfig {
  readonly username: string;
  readonly password: string;
  readonly saltRounds: number;
}

export const getBcryptSaltRounds = (): number => {
  loadEnvironment();

  const saltRoundsValue = process.env.BCRYPT_SALT_ROUNDS?.trim() ?? "10";
  const saltRounds = Number.parseInt(saltRoundsValue, 10);

  if (!Number.isInteger(saltRounds) || saltRounds < 4) {
    throw new Error(
      "BCRYPT_SALT_ROUNDS must be an integer greater than or equal to 4."
    );
  }

  return saltRounds;
};

export const getSessionTtlSeconds = (): number => {
  loadEnvironment();

  const ttlValue = process.env.SESSION_TTL_SECONDS?.trim() ?? "604800";
  const ttlSeconds = Number.parseInt(ttlValue, 10);

  if (!Number.isInteger(ttlSeconds) || ttlSeconds <= 0) {
    throw new Error("SESSION_TTL_SECONDS must be a positive integer.");
  }

  return ttlSeconds;
};

export const getDevSeedConfig = (): DevSeedConfig => {
  return {
    username: requireEnvironmentVariable("SEED_DEV_USERNAME"),
    password: requireEnvironmentVariable("SEED_DEV_PASSWORD"),
    saltRounds: getBcryptSaltRounds(),
  };
};
