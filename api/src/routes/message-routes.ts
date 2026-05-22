import type { SessionGateway } from "@/gateways/session-gateway";
import { honoFactory } from "@/hono-factory";
import { createRequireAuth } from "@/middleware/require-auth";
import { presentFeedback } from "@/presenters/message-presenter";
import {
  assertBoolean,
  assertUuidLike,
  parseJsonBody,
} from "@/shared/validation/request-validation";
import type { SendMessageFeedbackUseCase } from "@/use-cases/send-message-feedback-use-case";

interface CreateMessageRoutesDependencies {
  readonly sessionGateway: SessionGateway;
  readonly sendMessageFeedbackUseCase: SendMessageFeedbackUseCase;
}

export const createMessageRoutes = ({
  sessionGateway,
  sendMessageFeedbackUseCase,
}: CreateMessageRoutesDependencies) =>
  honoFactory
    .createApp()
    .basePath("/api")
    .use("/chats/*", createRequireAuth(sessionGateway))
    .post("/chats/:channelId/messages/:messageId/feedback", async (context) => {
      const body = await parseJsonBody<Record<string, unknown>>(context.req.raw);
      const result = await sendMessageFeedbackUseCase.execute({
        authenticatedUserId: context.var.authenticatedUser.id,
        channelId: assertUuidLike(context.req.param("channelId"), "channel_id"),
        messageId: assertUuidLike(context.req.param("messageId"), "message_id"),
        aiFeedback: assertBoolean(body.ai_feedback, "ai_feedback"),
      });

      return context.json(presentFeedback(result), 200);
    });
