import { Hono } from "hono";

import type { SessionGateway } from "@/application/ports/session-gateway";
import type { MessagesController } from "@/interface-adapters/controllers/messages-controller";
import { requireAuth } from "@/framework/hono/middlewares/require-auth";
import type { AppBindings } from "@/framework/hono/types";
import {
  assertBoolean,
  assertUuidLike,
  parseJsonBody,
} from "@/shared/validation/request-validation";

interface CreateMessagesRoutesDependencies {
  readonly messagesController: MessagesController;
  readonly sessionGateway: SessionGateway;
}

export const createMessagesRoutes = ({
  messagesController,
  sessionGateway,
}: CreateMessagesRoutesDependencies): Hono<AppBindings> => {
  const messagesRoutes = new Hono<AppBindings>();

  messagesRoutes.use("/api/chats/*", requireAuth(sessionGateway));

  messagesRoutes.post(
    "/api/chats/:channelId/messages/:messageId/feedback",
    async (context) => {
      const authenticatedUser = context.get("authenticatedUser");
      const body = await parseJsonBody<Record<string, unknown>>(context.req.raw);
      const response = await messagesController.handleFeedback({
        authenticatedUserId: authenticatedUser.id,
        channelId: assertUuidLike(context.req.param("channelId"), "channel_id"),
        messageId: assertUuidLike(context.req.param("messageId"), "message_id"),
        aiFeedback: assertBoolean(body.ai_feedback, "ai_feedback"),
      });

      return context.json(response, 200);
    }
  );

  return messagesRoutes;
};
