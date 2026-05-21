import type {
  TopPagePreview,
  UiWorkspaceContentRepository,
} from "@/application/ports/ui-workspace-content-repository";

export class LoadTopPagePreviewUseCase {
  public constructor(
    private readonly repository: UiWorkspaceContentRepository
  ) {}

  public execute(): Promise<TopPagePreview> {
    return this.repository.getTopPagePreview();
  }
}
