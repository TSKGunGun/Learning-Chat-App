import type {
  LoginPagePreview,
  TopPagePreview,
  UiWorkspaceContentRepository,
} from "@/application/ports/ui-workspace-content-repository";

export class StaticUiWorkspaceContentRepository
  implements UiWorkspaceContentRepository
{
  public async getTopPagePreview(): Promise<TopPagePreview> {
    return {
      heading: "ChatApp",
      supportingText:
        "会話を選択するか、新しいチャットを開始して利用を続けてください。",
      primaryActionLabel: "新規チャットを開始",
      channels: [
        {
          id: "draft-channel",
          name: "新規チャット",
          lastMessagedAt: "ドラフト",
        },
        {
          id: "llm-retrospective",
          name: "学習フィードバックの整理",
          lastMessagedAt: "2026-05-21 14:00",
        },
      ],
      selectedChannelName: "新規チャット",
      messages: [
        {
          id: "message-user-1",
          senderType: "user",
          body: "UIワークスペースの初期構成を確認したいです。",
          status: "completed",
          aiFeedback: null,
        },
        {
          id: "message-ai-1",
          senderType: "ai",
          body: "現在は Vite ベースのプレースホルダー構成のみを表示しています。",
          status: "completed",
          aiFeedback: true,
        },
      ],
    };
  }

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
