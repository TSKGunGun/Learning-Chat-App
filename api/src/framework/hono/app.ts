import { Hono } from "hono";

import { container } from "@/di/container";
import { registerErrorHandler } from "@/framework/hono/middlewares/error-handler";
import { createAuthRoutes } from "@/framework/hono/routes/auth-routes";
import { createChatsRoutes } from "@/framework/hono/routes/chats-routes";
import { createMessagesRoutes } from "@/framework/hono/routes/messages-routes";
import type { AppBindings } from "@/framework/hono/types";

export const app = new Hono<AppBindings>();

registerErrorHandler(app);

app.get("/", (context) => {
  return context.json(
    {
      message: "Learning Chat API scaffold is running.",
    },
    200
  );
});

app.route(
  "/",
  createAuthRoutes({
    loginController: container.loginController,
  })
);
app.route(
  "/",
  createChatsRoutes({
    chatsController: container.chatsController,
    sessionGateway: container.sessionGateway,
  })
);
app.route(
  "/",
  createMessagesRoutes({
    messagesController: container.messagesController,
    sessionGateway: container.sessionGateway,
  })
);

export default app;
