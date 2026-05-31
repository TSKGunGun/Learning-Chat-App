import { CreateChatWithFirstMessageUseCase } from "@/application/use-cases/create-chat-with-first-message-use-case";
import { DeleteChatUseCase } from "@/application/use-cases/delete-chat-use-case";
import { ListChatChannelsUseCase } from "@/application/use-cases/list-chat-channels-use-case";
import { LoadChatDetailUseCase } from "@/application/use-cases/load-chat-detail-use-case";
import { LoadLoginPagePreviewUseCase } from "@/application/use-cases/load-login-page-preview-use-case";
import { LoadTopPageWorkspaceUseCase } from "@/application/use-cases/load-top-page-workspace-use-case";
import { LoginWithCredentialsUseCase } from "@/application/use-cases/login-with-credentials-use-case";
import { RequireAuthenticatedSessionUseCase } from "@/application/use-cases/require-authenticated-session-use-case";
import { SendMessageFeedbackUseCase } from "@/application/use-cases/send-message-feedback-use-case";
import { SendMessageToChatUseCase } from "@/application/use-cases/send-message-to-chat-use-case";
import { HttpAuthenticationRepository } from "@/infrastructure/auth/http-authentication-repository";
import { HttpChatWorkspaceRepository } from "@/infrastructure/chat/http-chat-workspace-repository";
import { StaticUiWorkspaceContentRepository } from "@/infrastructure/content/static-ui-workspace-content-repository";
import { AuthenticationController } from "@/interface-adapters/controllers/authentication-controller";
import { LoginPageController } from "@/interface-adapters/controllers/login-page-controller";
import { TopPageController } from "@/interface-adapters/controllers/top-page-controller";
import { LoginPagePresenter } from "@/interface-adapters/presenters/login-page-presenter";
import { TopPagePresenter } from "@/interface-adapters/presenters/top-page-presenter";

const uiContentRepository = new StaticUiWorkspaceContentRepository();
const chatWorkspaceRepository = new HttpChatWorkspaceRepository();
const authenticationRepository = new HttpAuthenticationRepository();

export const container = {
  topPageController: new TopPageController(
    new LoadTopPageWorkspaceUseCase(chatWorkspaceRepository),
    new ListChatChannelsUseCase(chatWorkspaceRepository),
    new LoadChatDetailUseCase(chatWorkspaceRepository),
    new CreateChatWithFirstMessageUseCase(chatWorkspaceRepository),
    new SendMessageFeedbackUseCase(chatWorkspaceRepository),
    new SendMessageToChatUseCase(chatWorkspaceRepository),
    new DeleteChatUseCase(chatWorkspaceRepository),
    new TopPagePresenter()
  ),
  loginPageController: new LoginPageController(
    new LoadLoginPagePreviewUseCase(uiContentRepository),
    new LoginPagePresenter()
  ),
  authenticationController: new AuthenticationController(
    new LoginWithCredentialsUseCase(authenticationRepository),
    new RequireAuthenticatedSessionUseCase(authenticationRepository)
  ),
};
