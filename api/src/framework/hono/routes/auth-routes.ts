import { Hono } from "hono";
import { setCookie } from "hono/cookie";

import type { LoginController } from "@/interface-adapters/controllers/login-controller";
import {
  assertNonEmptyString,
  parseJsonBody,
} from "@/shared/validation/request-validation";
import type { AppBindings } from "@/framework/hono/types";

interface CreateAuthRoutesDependencies {
  readonly loginController: LoginController;
}

export const createAuthRoutes = ({
  loginController,
}: CreateAuthRoutesDependencies): Hono<AppBindings> => {
  const authRoutes = new Hono<AppBindings>();

  authRoutes.post("/api/auth/login", async (context) => {
    const body = await parseJsonBody<Record<string, unknown>>(context.req.raw);
    const response = await loginController.handle({
      username: assertNonEmptyString(body.username, "username"),
      password: assertNonEmptyString(body.password, "password"),
    });

    setCookie(context, response.cookie.name, response.cookie.value, {
      httpOnly: true,
      path: "/",
      sameSite: "Lax",
      secure: process.env.NODE_ENV === "production",
    });

    return context.json(response.body, 200);
  });

  return authRoutes;
};
