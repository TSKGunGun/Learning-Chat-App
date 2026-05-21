import { Hono } from "hono";

import type { SessionGateway } from "@/application/ports/session-gateway";
import type { ChatsController } from "@/interface-adapters/controllers/chats-controller";
import { requireAuth } from "@/framework/hono/middlewares/require-auth";
import type { AppBindings } from "@/framework/hono/types";
import {
  assertNonEmptyString,
  assertUuidLike,
  parseJsonBody,
} from "@/shared/validation/request-validation";

interface CreateChatsRoutesDependencies {
  readonly chatsController: ChatsController;
  readonly sessionGateway: SessionGateway;
}

export const createChatsRoutes = ({
  chatsController,
  sessionGateway,
}: CreateChatsRoutesDependencies): Hono<AppBindings> => {
  const chatsRoutes = new Hono<AppBindings>();

  chatsRoutes.use("/api/chats/*", requireAuth(sessionGateway));
  chatsRoutes.use("/api/chats", requireAuth(sessionGateway));

  chatsRoutes.get("/api/chats", async (context) => {
    const authenticatedUser = context.get("authenticatedUser");
    const response = await chatsController.handleList({
      authenticatedUserId: authenticatedUser.id,
    });

    return context.json(response, 200);
  });

  chatsRoutes.post("/api/chats", async (context) => {
    const authenticatedUser = context.get("authenticatedUser");
    const body = await parseJsonBody<Record<string, unknown>>(context.req.raw);
    const response = await chatsController.handleCreate({
      authenticatedUserId: authenticatedUser.id,
      messageText: assertNonEmptyString(body.message_text, "message_text"),
    });

    return context.json(response, 200);
  });

  chatsRoutes.get("/api/chats/:channelId", async (context) => {
    const authenticatedUser = context.get("authenticatedUser");
    const response = await chatsController.handleGetById({
      authenticatedUserId: authenticatedUser.id,
      channelId: assertUuidLike(context.req.param("channelId"), "channel_id"),
    });

    return context.json(response, 200);
  });

  chatsRoutes.delete("/api/chats/:channelId", async (context) => {
    const authenticatedUser = context.get("authenticatedUser");

    await chatsController.handleDelete({
      authenticatedUserId: authenticatedUser.id,
      channelId: assertUuidLike(context.req.param("channelId"), "channel_id"),
    });

    return context.body(null, 204);
  });

  chatsRoutes.post("/api/chats/:channelId/messages", async (context) => {
    const authenticatedUser = context.get("authenticatedUser");
    const body = await parseJsonBody<Record<string, unknown>>(context.req.raw);
    const response = await chatsController.handleSendMessage({
      authenticatedUserId: authenticatedUser.id,
      channelId: assertUuidLike(context.req.param("channelId"), "channel_id"),
      messageText: assertNonEmptyString(body.message_text, "message_text"),
    });

    return context.json(response, 200);
  });

  return chatsRoutes;
};
