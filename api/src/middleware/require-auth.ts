import { getCookie } from "hono/cookie";

import type { SessionGateway } from "@/gateways/session-gateway";
import { honoFactory } from "@/hono-factory";
import { UnauthorizedError } from "@/shared/errors/application-error";

export const createRequireAuth = (sessionGateway: SessionGateway) =>
  honoFactory.createMiddleware(async (context, next) => {
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
  });
