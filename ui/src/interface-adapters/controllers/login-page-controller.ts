import type { LoadLoginPagePreviewUseCase } from "@/application/use-cases/load-login-page-preview-use-case";
import type { LoginPagePresenter } from "@/interface-adapters/presenters/login-page-presenter";
import type { LoginPageViewModel } from "@/interface-adapters/view-models/view-models";

export class LoginPageController {
  public constructor(
    private readonly useCase: LoadLoginPagePreviewUseCase,
    private readonly presenter: LoginPagePresenter
  ) {}

  public async handle(): Promise<LoginPageViewModel> {
    const preview = await this.useCase.execute();
    return this.presenter.present(preview);
  }
}
