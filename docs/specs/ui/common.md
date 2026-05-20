# 自己学習型AIチャットシステム UI仕様（共通）

## 1. この文書の対象範囲

本書は、自己学習型AIチャットシステムにおけるUI共通仕様を定義する。画面初期表示、ユーザー操作、クライアント通信、および表示観点で必要なAPI依存を扱う。

全体概要は [../../spec.md](../../spec.md)、APIの正本は [../api/common.md](../api/common.md) を参照する。

## 2. UIの責務

UIは、ユーザー向け画面の提供と、初期表示およびユーザー操作に応じたバックエンドAPI呼び出しを担う。

- トップ画面の初期表示
- チャット送信操作の受付
- AI メッセージへのフィードバック送信操作の受付
- 訂正送信操作の受付
- バックエンドから返却された結果の表示

採用技術は Next.js (App Router) と TypeScript とし、React Server Components と Client Components を役割に応じて使い分ける。Next.js は UI のフレームワーク層として扱い、アプリケーションの中心に置かない。

- CSS は Tailwind CSS を利用する
- UI コンポーネントは `shadcn/ui` を利用する
- アイコンは `lucide-react` を利用する
- HTTP 通信では `axios` は使用せず、Next.js 標準の `fetch` を利用する

- Server Components と Client Components は、表示責務とエントリーポイント責務に集中する
- 画面層は業務ロジックを直接持たず、調停層と Use Case を経由して処理する
- 内部 DTO や永続化都合のデータは、そのまま表示層へ渡さない

## 3. 画面一覧

| 画面名 | URL | 仕様ファイル |
| --- | --- | --- |
| トップ画面 | `/` | [top.md](./pages/top.md) |
| ログイン画面 | `/login` | [login.md](./pages/login.md) |
| チャットモーダル | `/` 上のモーダル | [chat-modal.md](./pages/chat-modal.md) |

## 4. 初期データ読み込み

ユーザーがトップ画面 `/` にアクセスした際、Next.js の React Server Components (RSC) を使用してバックエンド API を呼び出す。

- ログイン済みユーザーのチャット一覧を取得する
- 取得結果はレンダリング済みのHTMLとしてブラウザに返す
- ローディング状態を極力排除する

この初期取得で利用するAPIの正本は、[../api/common.md](../api/common.md) に定義された `GET /api/chats` とする。

## 5. UIのレイヤー構成

UI は、クリーンアーキテクチャに基づき以下の責務分離を前提とする。

- フレームワーク層: `app` 相当。Next.js 固有のページ、レイアウト、Server Components、Client Components、Server Actions を置く
- `interface-adapters`: Controller、Presenter、入力変換、画面向け ViewModel 変換を担う
- `application`: Use Case、アプリケーション境界の型、Repository や Service の抽象を置く
- `entities`: Entity、Value Object、変わりにくい業務ルールを置く
- `infrastructure`: DB や外部 API など外部依存の実装を置く
- `di`: 依存解決とバインド設定を置く

依存方向は外側から内側への一方向とし、フレームワーク層から DB 実装や SDK 実装を直接参照しない。

## 6. メッセージ送信

ユーザーのメッセージ送信は、Client Components からバックエンドAPIへリクエストを行う。

- 通信はクライアントサイドで行う
- 実装例として SWR 等の利用を想定する
- 新規チャットでは最初のメッセージ送信時に `POST /api/chats` を利用し、保存済みチャットでは `POST /api/chats/{channel_id}/messages` を利用する
- バックエンドから返却されたユーザーメッセージをチャット UI へ反映する
- メッセージ送信直後は、ChatGPT の Web アプリに近い体験として、一時的な AI 応答中ダミーメッセージをチャット UI に表示する
- メッセージ送信後は対象チャットの履歴を再取得し、バックエンド内で生成・更新された AI 応答を反映する
- ダミーメッセージは、実際の AI メッセージが履歴取得で確認できた時点で置き換える
- メッセージ送信後は `last_messaged_at` と `channel_name` の更新に追従するため、チャット一覧データをリフレッシュする

この送信で利用するAPIの正本は、[../api/common.md](../api/common.md) に定義された `POST /api/chats` および `POST /api/chats/{channel_id}/messages` とする。

## 7. 訂正送信

ユーザーが AI 回答に対して訂正を求める場合も、通常のメッセージ送信として扱う。

- 訂正要求はクライアントサイドから通常のメッセージ送信 API へ送信する
- UI は入力受付と結果表示を担う
- バックエンドは `message_text` の意図を判定し、対象チャットの全履歴をもとに必要に応じて自己訂正とルール抽出を実行する

この送信で利用するAPIの正本は、[../api/common.md](../api/common.md) に定義された `POST /api/chats` および `POST /api/chats/{channel_id}/messages` とする。

## 8. フィードバック送信

ユーザーが AI メッセージに対して Good / Bad のフィードバックを送信できるようにする。

- フィードバック操作はクライアントサイドからバックエンド API へ送信する
- UI は AI メッセージごとに Good ボタンと Bad ボタンを表示できるようにする
- フィードバック送信時は `ai_feedback` を `true`、`false`、`null` のいずれかで送る
- `true` は Good、`false` は Bad、`null` は取り消しとして扱う
- 既に Good 済みのメッセージへ再度 Good を送信した場合、および既に Bad 済みのメッセージへ再度 Bad を送信した場合は、取り消し操作として `ai_feedback = null` を送信する
- 既存の評価と反対側のフィードバックを送信した場合は、その値へ更新する
- 保存されたフィードバックは、以後の回答生成に利用される前提とする

この送信で利用するAPIの正本は、[../api/common.md](../api/common.md) に定義された `POST /api/chats/{channel_id}/messages/{message_id}/feedback` とする。

## 9. 認証画面の前提

ログイン画面では、バックエンドのログイン API を用いて認証を行う。

- 入力は `username` と `password` のみとする
- 認証方式は Cookie セッションとする
- ログイン成功後、UI は `/` へリダイレクトする
- 未認証状態でトップ画面またはチャット関連 API にアクセスした場合、UI は `/login` へ遷移する

詳細は [login.md](./pages/login.md) を参照する。

## 10. 境界ルール

Next.js 固有 API はフレームワーク層の境界で止める。

- `redirect`、`revalidatePath`、`cookies()`、`headers()`、Server Action の `FormData` などは内側へ漏らさない
- Next.js 固有型は Use Case や Entity の公開面に持ち込まない
- UI に返す値は Presenter / ViewModel で整形し、Entity や永続化モデルをそのまま返さない

## 11. API・基盤への依存

UIは以下の前提に依存する。

- Hono ベースのAPIが利用可能であること
- `hono/rpc` を通じて型安全にインターフェース共有できること
- チャット回答生成はバックエンド側でRAGを実行した結果として返却されること
- AI 応答生成中は UI 側でダミーメッセージを表示し、履歴再取得で実メッセージへ置き換えること
- AI メッセージへの Good / Bad フィードバックがバックエンド側で学習データとして保存・参照されること
- 訂正送信後の自己学習処理はバックエンド側の責務であること

処理基盤の詳細は [../infra/common.md](../infra/common.md) を参照する。
