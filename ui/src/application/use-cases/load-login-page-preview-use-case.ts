import type {
  LoginPagePreview,
  UiWorkspaceContentRepository,
} from "@/application/ports/ui-workspace-content-repository";

export class LoadLoginPagePreviewUseCase {
  public constructor(
    private readonly repository: UiWorkspaceContentRepository
  ) {}

  public execute(): Promise<LoginPagePreview> {
    return this.repository.getLoginPagePreview();
  }
}
