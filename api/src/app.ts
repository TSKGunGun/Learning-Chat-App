import { createAppComposition } from "@/composition";
import { honoFactory } from "@/hono-factory";
import { registerErrorHandler } from "@/middleware/error-handler";
import { createAuthRoutes } from "@/routes/auth-routes";
import { createChatRoutes } from "@/routes/chat-routes";
import { createMessageRoutes } from "@/routes/message-routes";

const composition = createAppComposition();

export const app = honoFactory.createApp();

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
    loginUseCase: composition.loginUseCase,
  })
);
app.route(
  "/",
  createChatRoutes({
    sessionGateway: composition.sessionGateway,
    listChatsUseCase: composition.listChatsUseCase,
    createChatUseCase: composition.createChatUseCase,
    getChatByIdUseCase: composition.getChatByIdUseCase,
    deleteChatByIdUseCase: composition.deleteChatByIdUseCase,
    sendMessageToChatUseCase: composition.sendMessageToChatUseCase,
  })
);
app.route(
  "/",
  createMessageRoutes({
    sessionGateway: composition.sessionGateway,
    sendMessageFeedbackUseCase: composition.sendMessageFeedbackUseCase,
  })
);

export type AppType = typeof app;
export default app;
