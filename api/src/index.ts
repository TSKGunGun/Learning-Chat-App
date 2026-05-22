import { serve } from "@hono/node-server";

import { app } from "@/app";

const DEFAULT_PORT = 3000;

const resolvePort = (value: string | undefined): number => {
  const parsedPort = Number.parseInt(value ?? "", 10);

  if (!Number.isInteger(parsedPort) || parsedPort < 1 || parsedPort > 65_535) {
    return DEFAULT_PORT;
  }

  return parsedPort;
};

const port = resolvePort(process.env.PORT);

serve(
  {
    fetch: app.fetch,
    port,
  },
  (info) => {
    console.log(`API scaffold server is running on http://localhost:${info.port}`);
  }
);
