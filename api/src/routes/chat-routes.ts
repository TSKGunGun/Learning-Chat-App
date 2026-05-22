import type { SessionGateway } from "@/gateways/session-gateway";
import { honoFactory } from "@/hono-factory";
import { createRequireAuth } from "@/middleware/require-auth";
import {
  presentChatDetail,
  presentChatList,
  presentCreateChat,
  presentSendMessage,
} from "@/presenters/chat-presenter";
import {
  assertNonEmptyString,
  assertUuidLike,
  parseJsonBody,
} from "@/shared/validation/request-validation";
import type { CreateChatWithFirstMessageUseCase } from "@/use-cases/create-chat-with-first-message-use-case";
import type { DeleteChatByIdUseCase } from "@/use-cases/delete-chat-by-id-use-case";
import type { GetChatByIdUseCase } from "@/use-cases/get-chat-by-id-use-case";
import type { ListChatsUseCase } from "@/use-cases/list-chats-use-case";
import type { SendMessageToChatUseCase } from "@/use-cases/send-message-to-chat-use-case";

interface CreateChatRoutesDependencies {
  readonly sessionGateway: SessionGateway;
  readonly listChatsUseCase: ListChatsUseCase;
  readonly createChatUseCase: CreateChatWithFirstMessageUseCase;
  readonly getChatByIdUseCase: GetChatByIdUseCase;
  readonly deleteChatByIdUseCase: DeleteChatByIdUseCase;
  readonly sendMessageToChatUseCase: SendMessageToChatUseCase;
}

export const createChatRoutes = ({
  sessionGateway,
  listChatsUseCase,
  createChatUseCase,
  getChatByIdUseCase,
  deleteChatByIdUseCase,
  sendMessageToChatUseCase,
}: CreateChatRoutesDependencies) => {
  const requireAuth = createRequireAuth(sessionGateway);

  return honoFactory
    .createApp()
    .basePath("/api")
    .use("/chats/*", requireAuth)
    .use("/chats", requireAuth)
    .get("/chats", async (context) => {
      const result = await listChatsUseCase.execute({
        authenticatedUserId: context.var.authenticatedUser.id,
      });

      return context.json(presentChatList(result), 200);
    })
    .post("/chats", async (context) => {
      const body = await parseJsonBody<Record<string, unknown>>(context.req.raw);
      const result = await createChatUseCase.execute({
        authenticatedUserId: context.var.authenticatedUser.id,
        messageText: assertNonEmptyString(body.message_text, "message_text"),
      });

      return context.json(presentCreateChat(result), 200);
    })
    .get("/chats/:channelId", async (context) => {
      const result = await getChatByIdUseCase.execute({
        authenticatedUserId: context.var.authenticatedUser.id,
        channelId: assertUuidLike(context.req.param("channelId"), "channel_id"),
      });

      return context.json(presentChatDetail(result), 200);
    })
    .delete("/chats/:channelId", async (context) => {
      await deleteChatByIdUseCase.execute({
        authenticatedUserId: context.var.authenticatedUser.id,
        channelId: assertUuidLike(context.req.param("channelId"), "channel_id"),
      });

      return context.body(null, 204);
    })
    .post("/chats/:channelId/messages", async (context) => {
      const body = await parseJsonBody<Record<string, unknown>>(context.req.raw);
      const result = await sendMessageToChatUseCase.execute({
        authenticatedUserId: context.var.authenticatedUser.id,
        channelId: assertUuidLike(context.req.param("channelId"), "channel_id"),
        messageText: assertNonEmptyString(body.message_text, "message_text"),
      });

      return context.json(presentSendMessage(result), 200);
    });
};
