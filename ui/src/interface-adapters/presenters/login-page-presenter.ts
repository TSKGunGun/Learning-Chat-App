import type { LoginPagePreview } from "@/application/ports/ui-workspace-content-repository";
import type { LoginPageViewModel } from "@/interface-adapters/view-models/view-models";

export class LoginPagePresenter {
  public present(preview: LoginPagePreview): LoginPageViewModel {
    return {
      title: preview.title,
      description: preview.description,
      submitLabel: preview.submitLabel,
      usernamePlaceholder: preview.usernamePlaceholder,
      passwordPlaceholder: preview.passwordPlaceholder,
      helperText: preview.helperText,
    };
  }
}
