import { createFactory } from "hono/factory";

import type { AppEnv } from "@/app-env";

export const honoFactory = createFactory<AppEnv>();
