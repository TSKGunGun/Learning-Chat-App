import type { Hono } from "hono";

import { ApplicationError } from "@/shared/errors/application-error";
import type { AppBindings } from "@/framework/hono/types";

export const registerErrorHandler = (app: Hono<AppBindings>): void => {
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
