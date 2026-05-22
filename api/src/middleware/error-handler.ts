import type { Hono } from "hono";

import type { AppEnv } from "@/app-env";
import { ApplicationError } from "@/shared/errors/application-error";

export const registerErrorHandler = (app: Hono<AppEnv>): void => {
  app.onError((error, context) => {
    if (error instanceof ApplicationError) {
      return context.json(
        {
          message: error.message,
        },
        error.statusCode
      );
    }

    console.error(error);

    return context.json(
      {
        message: "Internal Server Error",
      },
      500
    );
  });
};
