import { setCookie } from "hono/cookie";

import type { LoginUseCase } from "@/use-cases/login-use-case";
import { honoFactory } from "@/hono-factory";
import { presentLogin } from "@/presenters/auth-presenter";
import {
  assertNonEmptyString,
  parseJsonBody,
} from "@/shared/validation/request-validation";

interface CreateAuthRoutesDependencies {
  readonly loginUseCase: LoginUseCase;
}

export const createAuthRoutes = ({
  loginUseCase,
}: CreateAuthRoutesDependencies) =>
  honoFactory.createApp().basePath("/api").post("/auth/login", async (context) => {
    const body = await parseJsonBody<Record<string, unknown>>(context.req.raw);
    const result = await loginUseCase.execute({
      username: assertNonEmptyString(body.username, "username"),
      password: assertNonEmptyString(body.password, "password"),
    });
    const response = presentLogin(result);

    setCookie(context, response.cookie.name, response.cookie.value, {
      httpOnly: true,
      path: "/",
      sameSite: "Lax",
      secure: process.env.NODE_ENV === "production",
    });

    return context.json(response.body, 200);
  });
