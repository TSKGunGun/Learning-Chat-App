# 自己学習型AIチャットシステム UI仕様（共通）

## 1. この文書の対象範囲

本書は、自己学習型AIチャットシステムにおけるUI共通仕様を定義する。画面初期表示、ユーザー操作、クライアント通信、および表示観点で必要なAPI依存を扱う。

全体概要は [../../spec.md](../../spec.md)、API サーバー責務は [../api/common.md](../api/common.md)、HTTP 契約の正本は [../api/openapi/openapi.yaml](../api/openapi/openapi.yaml) を参照する。

## 2. UIの責務

UIは、ユーザー向け画面の提供と、初期表示およびユーザー操作に応じたバックエンドAPI呼び出しを担う。

- トップ画面の初期表示
- チャット送信操作の受付
- AI メッセージへのフィードバック送信操作の受付
- 訂正送信操作の受付
- バックエンドから返却された結果の表示

採用技術は Vite、React、TypeScript とし、Vite は UI のフレームワーク層として扱い、アプリケーションの中心に置かない。

- CSS は Tailwind CSS を利用する
- UI コンポーネントは Atomic Design を用いて管理する
- `shadcn/ui` は `atoms` として扱い、Atomic Design の構成へ統合する
- アイコンは `lucide-react` を利用する
- HTTP 通信では `axios` は使用せず、標準の `fetch` を利用する

- React コンポーネントは、表示責務とエントリーポイント責務に集中する
- 画面層は業務ロジックを直接持たず、調停層と Use Case を経由して処理する
- 内部 DTO や永続化都合のデータは、そのまま表示層へ渡さない

## 3. 画面一覧

| 画面名 | URL | 仕様ファイル |
| --- | --- | --- |
| トップ画面 | `/` | [top.md](./pages/top.md) |
| ログイン画面 | `/login` | [login.md](./pages/login.md) |

## 4. 初期データ読み込み

ユーザーがトップ画面 `/` にアクセスした際、UI はバックエンド API を呼び出して必要なデータを取得する。

- ログイン済みユーザーのチャット一覧を取得する
- 一覧が 1 件以上ある場合は `last_messaged_at` 降順の先頭チャットを初期表示対象として扱う
- 一覧が 0 件の場合は、右ペインを未保存の新規チャット入力可能状態として表示する
- 初期表示では必要なローディング状態のみを最小限に扱う

この初期取得で利用する API 契約の正本は、[../api/openapi/openapi.yaml](../api/openapi/openapi.yaml) に定義された `GET /api/chats` とする。

## 5. UIのレイヤー構成

UI は、クリーンアーキテクチャに基づき以下の責務分離を前提とする。

- フレームワーク層: `framework` 相当。Vite 配下のルーティング、起動処理、画面エントリーポイントを置く
- `interface-adapters`: Controller、Presenter、入力変換、画面向け ViewModel 変換を担う
- `interface-adapters/view-models`: Presenter が整形した画面向け ViewModel を置く
- `application`: Use Case、アプリケーション境界の型、Repository や Service の抽象を置く
- `entities`: Entity、Value Object、変わりにくい業務ルールを置く
- `infrastructure`: DB や外部 API など外部依存の実装を置く
- `di`: 依存解決とバインド設定を置く
- `shared`: 純粋 util や framework 非依存の汎用物だけを置く

依存方向は外側から内側への一方向とし、フレームワーク層から DB 実装や SDK 実装を直接参照しない。

Atomic Design の適用対象は UI 層のみに限定し、`application`、`entities`、`infrastructure`、`di` は既存のクリーンアーキテクチャの責務分離を優先する。

UI / presentation 層のコンポーネントは `presentation` ディレクトリ配下で、役割ごとにディレクトリを分けて保存する。

- `presentation/atoms`: 最小単位の UI 部品を置く。`shadcn/ui` のベースコンポーネントもここへ統合する
- `presentation/molecules`: 複数の `presentation/atoms` を組み合わせた小さな UI を置く
- `presentation/organisms`: 機能的なまとまりを持つ UI ブロックを置く
- `presentation/templates`: 画面レイアウトの骨組みを置く
- `presentation/pages`: 画面仕様に対応するページ単位の UI 構成と state UI を置く

コンポーネント配置では次のルールを守る。

- 業務ロジックを `atoms`、`molecules`、`organisms` に直接持ち込まない
- 画面固有のデータ取得や API 呼び出しは UI コンポーネントに閉じず、既存のレイヤー境界を守る
- 再利用粒度に応じて適切な Atomic レイヤーへ配置する
- `presentation/pages` は router API を直接参照せず、必要な navigation 情報は `framework` から受け取る
- route 定数や route 専用 hook は `framework` に置き、`shared` に routing 関心を持ち込まない
- 画面向け ViewModel は `interface-adapters/view-models` に置き、`shared` に表示専用型を持ち込まない

## 6. メッセージ送信

ユーザーのメッセージ送信は、トップ画面右ペインのチャット画面から Client Components 経由でバックエンド API へリクエストを行う。

- 通信はクライアントサイドで行う
- 実装例として `fetch` ベースの API クライアントや状態管理ライブラリの利用を想定する
- 新規チャット開始時は右ペインを未保存の新規チャット状態へ切り替え、最初のメッセージ送信時に `POST /api/chats` を利用する
- 保存済みチャットでは `POST /api/chats/{channel_id}/messages` を利用する
- バックエンドから返却されたユーザーメッセージをチャット UI へ反映する
- `POST /api/chats` および `POST /api/chats/{channel_id}/messages` の成功レスポンスに `channel_name` が含まれる場合、UI はレスポンス受信時点で右ペイン見出しへ即時反映する
- メッセージ送信後は対象チャットの履歴を 1 秒間隔で定期的に再取得し、バックエンド内で生成・更新された AI 応答を反映する
- `sender_type = ai` かつ `status = pending` のメッセージは、本文の代わりに「AI回答生成中」と表示する
- `sender_type = ai` かつ `status = completed` のメッセージは、`message_text` を表示する
- `sender_type = ai` かつ `status = ai_timeout` のメッセージは、`message_text` に設定された `AI応答がありません` を表示する
- `sender_type = user` のメッセージは `status` を無視して表示する
- `status = pending` の AI メッセージが存在する間は、追加メッセージ送信を無効化する
- 既存チャットをサイドバーから選択した時点で `status = pending` の AI メッセージが存在する場合は、最初の履歴取得結果をもとにその時点で定期再取得を開始する
- `status = completed` または `status = ai_timeout` をポーリングで検知した場合も、`last_messaged_at` と `channel_name` の更新に追従するためチャット一覧データをリフレッシュする
- 定期再取得は、対象チャット内に `status = pending` の AI メッセージがなくなった時点、または右ペインが別チャットや未保存新規状態へ切り替わった時点で停止する
- メッセージ送信後は `last_messaged_at` と `channel_name` の更新に追従するため、チャット一覧データをリフレッシュする
- 追加メッセージ送信を行った場合、`status = pending` の AI メッセージが存在する間は UI で入力を無効化し、API 側でも `422` により拒否される前提とする

この送信で利用する API 契約の正本は、[../api/openapi/openapi.yaml](../api/openapi/openapi.yaml) に定義された `POST /api/chats` および `POST /api/chats/{channel_id}/messages` とする。

## 7. 訂正送信

ユーザーが AI 回答に対して訂正を求める場合も、通常のメッセージ送信として扱う。

- 訂正要求はクライアントサイドから通常のメッセージ送信 API へ送信する
- UI は入力受付と結果表示を担う
- バックエンドは `message_text` の意図を判定し、対象チャットの全履歴をもとに必要に応じて自己訂正とルール抽出を実行する

この送信で利用する API 契約の正本は、[../api/openapi/openapi.yaml](../api/openapi/openapi.yaml) に定義された `POST /api/chats` および `POST /api/chats/{channel_id}/messages` とする。

## 8. フィードバック送信

ユーザーが AI メッセージに対して Good / Bad のフィードバックを送信できるようにする。

- フィードバック操作はクライアントサイドからバックエンド API へ送信する
- UI は `sender_type = ai` かつ `status = completed` のメッセージに対してのみ Good ボタンと Bad ボタンを表示する
- `status = pending` または `status = ai_timeout` の AI メッセージにはフィードバックボタンを表示しない
- フィードバック送信時は `ai_feedback` を `true` または `false` で送る
- `true` は Good、`false` は Bad として扱う
- 既に Good 済みのメッセージへ再度 Good を送信した場合、および既に Bad 済みのメッセージへ再度 Bad を送信した場合も、UI は同じ `true` または `false` を送信する
- 既存の評価と反対側のフィードバックを送信した場合は、その値へ更新する
- 保存されたフィードバックは、以後の回答生成に利用される前提とする

この送信で利用する API 契約の正本は、[../api/openapi/openapi.yaml](../api/openapi/openapi.yaml) に定義された `POST /api/chats/{channel_id}/messages/{message_id}/feedback` とする。

## 9. 認証画面の前提

ログイン画面では、バックエンドのログイン API を用いて認証を行う。

- 入力は `username` と `password` のみとする
- 認証方式は Cookie セッションとする
- ログイン成功後、UI は `/` へリダイレクトする
- 未認証状態でトップ画面またはチャット関連 API にアクセスした場合、UI は `/login` へ遷移する

詳細は [login.md](./pages/login.md) を参照する。

## 10. 境界ルール

Vite やブラウザ固有 API はフレームワーク層の境界で止める。

- `window`、`document`、`localStorage`、`fetch` の直接利用はフレームワーク層または infrastructure 層で閉じる
- Vite や React Router 固有型は Use Case や Entity の公開面に持ち込まない
- UI に返す値は Presenter / ViewModel で整形し、Entity や永続化モデルをそのまま返さない

## 11. API・基盤への依存

UIは以下の前提に依存する。

- Hono ベースのAPIが利用可能であること
- `hono/rpc` を通じて型安全にインターフェース共有できること
- トップ画面はデスクトップ時に左サイドバーと右チャット画面の 2 ペインで表示されること
- モバイル時は右チャット画面を主表示とし、チャット一覧はドロワー型サイドバーで開閉すること
- チャット回答生成はバックエンド側でRAGを実行した結果として返却されること
- AI 応答生成中は `status = pending` の AI メッセージを「AI回答生成中」と表示し、履歴再取得で `status = completed` になった時点で実メッセージを表示すること
- AI メッセージへの Good / Bad フィードバックがバックエンド側で学習データとして保存・参照されること
- 訂正送信後の自己学習処理はバックエンド側の責務であること

処理基盤の詳細は [../infra/common.md](../infra/common.md) を参照する。
