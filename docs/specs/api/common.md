# 自己学習型AIチャットシステム API仕様（共通）

## 1. この文書の対象範囲

本書は、自己学習型AIチャットシステムにおけるAPI共通仕様を定義する。Hono API の責務、エンドポイント一覧、各リクエスト起点で実行される処理の範囲を扱う。

全体概要は [../../spec.md](../../spec.md)、データ永続化の正本は [../db/common.md](../db/common.md)、処理基盤の正本は [../infra/common.md](../infra/common.md) を参照する。

## 2. APIの責務

APIは、UIからのリクエストを受け取り、チャット履歴取得、回答生成、フィードバック受付の入口として振る舞う。

- UI向けのHTTPエンドポイントを公開する
- ログイン要求を受けて認証とセッション確立を行う
- チャット作成要求を受けて新規チャットを作成する
- 履歴取得要求を受けてチャットデータを返す
- 個別チャット取得要求を受けて対象チャットを返す
- チャット削除要求を受けて対象チャットを削除する
- チャット単位のメッセージ送信要求を受けて回答生成処理を起動する
- 対象メッセージへのフィードバック要求を受けて評価保存と学習データ更新を行う

採用技術は Node.js、Hono、TypeScript とする。Hono はフレームワーク層として扱い、API はクリーンアーキテクチャにおける入口層とする。

## 3. レイヤー責務

API まわりは、以下の責務分離を前提とする。

- Controller は入力検証と Use Case 呼び出しの調停に限定し、業務ロジックを持たない
- Use Case は 1 操作 1 責務とし、他の Use Case を直接束ねない
- Use Case は Repository や外部 Service の抽象に依存する
- Infrastructure は DB、OpenAI API、LangChain.js など外部依存の具象実装を吸収する
- Presenter や出力変換層で、UI や外部公開向けの出力形式へ整える

Hono 固有の request / response は境界 DTO に変換して扱い、内側の層へ直接漏らさない。

## 4. エンドポイント定義

APIエンドポイントの正本は本章とする。

| メソッド | エンドポイント | 用途 | 実行元 |
| --- | --- | --- | --- |
| `POST` | `/api/auth/login` | ユーザー名・パスワードによるログイン、Cookie セッション確立 | クライアントサイド |
| `GET` | `/api/chats` | ログイン済みユーザーのチャット一覧の取得 | サーバーサイド (RSC) |
| `POST` | `/api/chats` | 新規チャットの作成 | クライアントサイド |
| `GET` | `/api/chats/{channel_id}` | 既存チャットの取得 | クライアントサイド |
| `DELETE` | `/api/chats/{channel_id}` | 既存チャットの削除 | クライアントサイド |
| `POST` | `/api/chats/{channel_id}/messages` | 指定チャットへの新規メッセージ送信（回答生成の起動） | クライアントサイド |
| `POST` | `/api/chats/{channel_id}/messages/{message_id}/feedback` | 指定 AI メッセージへの Good / Bad フィードバック送信 | クライアントサイド |

## 5. リクエストごとの処理責務

### `POST /api/auth/login`

- `username` と `password` を受け取る
- 入力不備を検証する
- `users` テーブルを参照して資格情報を検証する
- 認証成功時は Cookie セッションを設定する
- 成功時は最小限のユーザー要約を返す

リクエスト本文は `username`, `password` を含む前提とする。
成功時の応答本文は少なくとも `id`, `username` を含む前提とする。
失敗時は `400` を入力不備、`401` を認証失敗として扱う。

### 認証前提

- `GET /api/chats`
- `POST /api/chats`
- `GET /api/chats/{channel_id}`
- `DELETE /api/chats/{channel_id}`
- `POST /api/chats/{channel_id}/messages`
- `POST /api/chats/{channel_id}/messages/{message_id}/feedback`

上記のチャット関連 API はログイン済みユーザーのみ利用できる前提とし、未認証または認証切れの場合は `401` を返す。

### `GET /api/chats`

- ログイン済みユーザーのチャット一覧を返す
- トップ画面の初期表示で利用される
- 返却内容には各チャットの `channel_id`、`channel_name`、`last_messaged_at` を含む前提とする
- 一覧の並び順は `last_messaged_at` の降順を前提とする
- 返却対象となる永続化データの詳細は [../db/common.md](../db/common.md) を参照する

### `POST /api/chats`

- ログイン済みユーザーの新規チャットを作成する
- 作成時点のチャンネル名は `新規チャット` とする
- 作成成功時は少なくとも `channel_id` と `channel_name` を含む作成済みチャットを返す
- 新規チャット開始操作から利用される

### `GET /api/chats/{channel_id}`

- 指定されたチャンネル ID に対応する既存チャットを返す
- 既存チャットを開く操作から利用される
- 返却内容には対象チャットの `channel_id`、`channel_name`、`last_messaged_at`、チャット履歴を含む前提とする
- チャット履歴の各メッセージは少なくとも `message_id`、`sender_type`、`message_text`、`ai_feedback`、`created_at` を含む前提とする
- チャット履歴は `created_at` の昇順で返す前提とする
- ログイン済みユーザー自身のチャットのみ取得対象とする

### `DELETE /api/chats/{channel_id}`

- 指定されたチャンネル ID に対応する既存チャットを削除する
- チャット削除操作から利用される
- ログイン済みユーザー自身のチャットのみ削除対象とする

### `POST /api/chats/{channel_id}/messages`

- path parameter として `channel_id` を受け取る
- リクエスト本文として `message_text` を受け取る
- `message_text` はユーザーが入力したメッセージ本文であり、文字列型とする
- 指定チャットへの新規メッセージを受け取る
- 回答生成処理を起動する
- 追加されたユーザーメッセージと生成された AI メッセージは `messages` として扱う
- 新規メッセージ追加時に `last_messaged_at` を更新する
- 対象チャットが最初のユーザーメッセージ送信前であり、チャンネル名が `新規チャット` の場合は、この処理の中で最初の会話内容からチャンネル名を自動生成して更新する
- 応答には追加されたユーザーメッセージの `message_id`、`sender_type`、`message_text`、`created_at` のみを含める
- AI による応答メッセージはバックエンド内の処理で完結するため、本 API のレスポンスでは返却対象としない
- 回答生成では、基盤側で埋め込み生成、類似ルール検索、プロンプト構築、LLM実行を行う
- 回答生成では、`correction_rules` に加えて過去の `messages.ai_feedback` を学習データとして参照する
- ユーザーの `message_text` に AI への訂正意図が含まれる場合、対象チャットの全履歴を訂正対象として、同一 API の処理内で自己訂正とルール抽出を行う
- ルール検索対象となるデータの詳細は [../db/common.md](../db/common.md) を参照する
- 実行基盤の詳細は [../infra/common.md](../infra/common.md) を参照する

### `POST /api/chats/{channel_id}/messages/{message_id}/feedback`

- path parameter として `channel_id` と `message_id` を受け取る
- 指定された AI メッセージに対する Good / Bad のフィードバックを受け取る
- リクエスト本文は `feedback` を含み、`true` を `good`、`false` を `bad` として扱う
- フィードバック対象メッセージは AI 出力である前提とする
- `messages.ai_feedback` と `feedback_updated_at` を更新する
- 保存したフィードバックは、以後の回答生成時に学習データとして参照する
- 成功時は更新後の `message_id` と `ai_feedback` を返す前提とする
- 保存対象となるデータの詳細は [../db/common.md](../db/common.md) を参照する

## 6. UIとのインターフェース前提

APIは以下の前提でUIから利用される。

- ログインは Client Components から `POST /api/auth/login` を呼び出して行う
- トップ画面のチャット一覧取得は `GET /api/chats` を利用する
- 新規チャット開始は `POST /api/chats` を利用する
- 既存チャットを開く操作は `GET /api/chats/{channel_id}` を利用する
- チャット削除は `DELETE /api/chats/{channel_id}` を利用する
- 新規チャット開始および既存チャットを開く操作では、トップ画面上のチャットモーダルを表示する
- 初期データ読み込みは RSC 経由で行い、`401` の場合は `/login` へ遷移する
- メッセージ送信は `POST /api/chats/{channel_id}/messages` を利用する
- メッセージ送信後は `last_messaged_at` と `channel_name` の更新に追従するため、UI はチャット一覧データを再取得してリフレッシュする
- フィードバック送信は `POST /api/chats/{channel_id}/messages/{message_id}/feedback` を利用する
- 訂正を求める場合も通常のメッセージ送信 API を利用し、本文の意図判定はバックエンド側で行う
- クライアントサイド通信で `401` を受けた場合、UI は `/login` へ遷移する
- `hono/rpc` を通じてフロントエンドと型共有できる構成を前提とする
