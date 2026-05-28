import type {
  LoginPagePreview,
  UiWorkspaceContentRepository,
} from "@/application/ports/ui-workspace-content-repository";

export class StaticUiWorkspaceContentRepository
  implements UiWorkspaceContentRepository
{
  public async getLoginPagePreview(): Promise<LoginPagePreview> {
    return {
      title: "ログイン",
      description:
        "ユーザー名とパスワードを入力してログインしてください。",
      submitLabel: "ログインする",
      usernamePlaceholder: "ユーザー名",
      passwordPlaceholder: "パスワード",
      helperText: "登録済みのアカウント情報を入力してください。",
    };
  }
}
