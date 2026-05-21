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
      heading: "自己学習型AIチャットのUIワークスペース",
      supportingText:
        "Atomic Design とクリーンアーキテクチャを両立する最小構成を、このプレースホルダーから育てていきます。",
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
        "認証処理は未接続ですが、入力導線と画面責務の置き場はこの雛形で固定しています。",
      submitLabel: "ログインする",
      usernamePlaceholder: "ユーザー名",
      passwordPlaceholder: "パスワード",
      helperText: "API 接続時は interface-adapters 経由で認証ユースケースへ接続します。",
    };
  }
}
