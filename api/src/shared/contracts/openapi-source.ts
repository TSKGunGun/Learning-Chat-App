import { fileURLToPath } from "node:url";

export const OPENAPI_SOURCE_PATH = fileURLToPath(
  new URL("../../../../docs/specs/api/openapi/openapi.yaml", import.meta.url)
);
