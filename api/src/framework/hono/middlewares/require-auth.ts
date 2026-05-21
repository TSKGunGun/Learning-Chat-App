import type { MiddlewareHandler } from "hono";
import { getCookie } from "hono/cookie";

import type { SessionGateway } from "@/application/ports/session-gateway";
import type { AppBindings } from "@/framework/hono/types";
import { UnauthorizedError } from "@/shared/errors/application-error";

export const requireAuth = (
  sessionGateway: SessionGateway
): MiddlewareHandler<AppBindings> => {
  return async (context, next) => {
    const sessionToken = getCookie(context, "session");

    if (!sessionToken) {
      throw new UnauthorizedError();
    }

    const authenticatedUser = await sessionGateway.getAuthenticatedUser(
      sessionToken
    );

    if (authenticatedUser === null) {
      throw new UnauthorizedError();
    }

    context.set("authenticatedUser", authenticatedUser);

    await next();
  };
};
