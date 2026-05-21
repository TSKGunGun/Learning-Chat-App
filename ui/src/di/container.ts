import { LoadLoginPagePreviewUseCase } from "@/application/use-cases/load-login-page-preview-use-case";
import { LoadTopPagePreviewUseCase } from "@/application/use-cases/load-top-page-preview-use-case";
import { StaticUiWorkspaceContentRepository } from "@/infrastructure/content/static-ui-workspace-content-repository";
import { LoginPageController } from "@/interface-adapters/controllers/login-page-controller";
import { TopPageController } from "@/interface-adapters/controllers/top-page-controller";
import { LoginPagePresenter } from "@/interface-adapters/presenters/login-page-presenter";
import { TopPagePresenter } from "@/interface-adapters/presenters/top-page-presenter";

const repository = new StaticUiWorkspaceContentRepository();

export const container = {
  topPageController: new TopPageController(
    new LoadTopPagePreviewUseCase(repository),
    new TopPagePresenter()
  ),
  loginPageController: new LoginPageController(
    new LoadLoginPagePreviewUseCase(repository),
    new LoginPagePresenter()
  ),
};
