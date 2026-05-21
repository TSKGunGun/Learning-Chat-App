import type { LoadTopPagePreviewUseCase } from "@/application/use-cases/load-top-page-preview-use-case";
import type { TopPagePresenter } from "@/interface-adapters/presenters/top-page-presenter";
import type { TopPageViewModel } from "@/interface-adapters/view-models/view-models";

export class TopPageController {
  public constructor(
    private readonly useCase: LoadTopPagePreviewUseCase,
    private readonly presenter: TopPagePresenter
  ) {}

  public async handle(): Promise<TopPageViewModel> {
    const preview = await this.useCase.execute();
    return this.presenter.present(preview);
  }
}
