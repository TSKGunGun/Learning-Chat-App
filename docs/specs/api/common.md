# 自己学習型AIチャットシステム API仕様（共通）

## 1. この文書の対象範囲

本書は、自己学習型AIチャットシステムにおけるAPI共通仕様を定義する。Hono API の責務、エンドポイント一覧、各リクエスト起点で実行される処理の範囲を扱う。

全体概要は [../../spec.md](../../spec.md)、データ永続化の正本は [../db/common.md](../db/common.md)、処理基盤の正本は [../infra/common.md](../infra/common.md) を参照する。

## 2. APIの責務

APIは、UIからのリクエストを受け取り、チャット履歴取得、チャット開始、回答生成、フィードバック受付の入口として振る舞う。

- UI向けのHTTPエンドポイントを公開する
- ログイン要求を受けて認証とセッション確立を行う
- 新規チャット開始時の初回メッセージ要求を受けてチャットチャンネルを生成する
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
| `POST` | `/api/chats` | 新規チャットの初回メッセージ送信とチャンネル生成 | クライアントサイド |
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
- 返却対象は、少なくとも 1 件以上のメッセージ履歴を持つ保存済みチャットチャンネルであり、かつ `is_deleted = false` のものに限る
- 返却対象となる永続化データの詳細は [../db/common.md](../db/common.md) を参照する

### `POST /api/chats`

- 新規チャットモーダルでの最初のユーザーメッセージ送信時に利用する
- リクエスト本文として `message_text` を受け取る
- `message_text` はユーザーが入力したメッセージ本文であり、文字列型とする
- `chat_channels` の生成、最初のユーザーメッセージ保存、`last_messaged_at` 設定を同一処理で行う
- 新規作成される `chat_channels.is_deleted` の初期値は `false` とする
- チャンネル名は最初の会話内容から自動生成する
- 応答には作成された `channel_id`、決定済みの `channel_name`、追加されたユーザーメッセージの `message_id`、`sender_type`、`message_text`、`status`、`created_at` を含める
- 追加されたユーザーメッセージの `status` は `completed` とする
- ユーザーメッセージ保存後に AI の応答生成を開始する
- AI の応答生成開始時に、`sender_type = ai` かつ `status = pending` のメッセージを履歴へ追加する
- AI による応答メッセージはバックエンド内の処理で完結するため、本 API のレスポンスでは返却対象としない
- AI 応答生成完了後は、対象 AI メッセージの `status` を `completed` に更新し、回答本文を `message_text` に反映する
- AI 応答生成開始から 60 秒以内に完了しない場合はタイムアウトとし、対象 AI メッセージの `status` を `ai_timeout`、`message_text` を `AI応答がありません` に更新する
- `last_messaged_at` は、最初のユーザーメッセージ保存時、`status = pending` の AI メッセージ生成時、`status = completed` 更新時、`status = ai_timeout` 更新時のすべてで更新する
- ユーザーの `message_text` に AI への訂正意図が含まれる場合、対象チャットの全履歴を訂正対象として、同一 API の処理内で自己訂正とルール抽出を行う
- 新規チャット開始ボタン押下時点では利用せず、実際の初回送信時に利用する

### `GET /api/chats/{channel_id}`

- 指定されたチャンネル ID に対応する既存チャットを返す
- 既存チャットを開く操作から利用される
- 返却内容には対象チャットの `channel_id`、`channel_name`、`last_messaged_at`、チャット履歴を含む前提とする
- チャット履歴の各メッセージは少なくとも `message_id`、`sender_type`、`message_text`、`status`、`ai_feedback`、`created_at` を含む前提とする
- `sender_type = ai` かつ `status = pending` のメッセージでは、`message_text` は `null` になりうる
- `sender_type = ai` かつ `status = pending` のメッセージでは、`ai_feedback` は `null` とする
- `status` の許容値は固定 enum とし、`pending`、`completed`、`ai_timeout` の 3 値のみとする
- `feedback_updated_at` は API の返却対象に含めない
- チャット履歴は `created_at` の昇順で返す前提とする
- ログイン済みユーザー自身のチャットのみ取得対象とし、`is_deleted = true` のチャンネルは取得対象外とする

### `DELETE /api/chats/{channel_id}`

- 指定されたチャンネル ID に対応する既存チャットを削除する
- チャット削除操作から利用される
- 物理削除は行わず、`chat_channels.is_deleted = true` のソフトデリートとして扱う
- 削除済みチャンネルは `GET /api/chats` の返却対象から除外する
- `messages` は保持し、`correction_rules` も削除せず学習データとして利用可能な状態を保つ
- ログイン済みユーザー自身の未削除チャットのみ削除対象とする
- 削除済みチャンネルを指定した場合は `404` を返す前提とする

### `POST /api/chats/{channel_id}/messages`

- path parameter として `channel_id` を受け取る
- リクエスト本文として `message_text` を受け取る
- `message_text` はユーザーが入力したメッセージ本文であり、文字列型とする
- 保存済みの指定チャットへの新規メッセージを受け取る
- 削除済みチャンネルを指定した場合は `404` を返す前提とする
- 回答生成処理を起動する
- 追加されたユーザーメッセージと生成された AI メッセージは `messages` として扱う
- 新規メッセージ追加時に `last_messaged_at` を更新する
- 応答には現在の `channel_name`、追加されたユーザーメッセージの `message_id`、`sender_type`、`message_text`、`status`、`created_at` を含める
- 追加されたユーザーメッセージの `status` は `completed` とする
- AI による応答メッセージはバックエンド内の非同期処理で完結するため、本 API のレスポンスでは返却対象としない
- ユーザーメッセージ保存直後に応答生成を開始し、`sender_type = ai` かつ `status = pending` のメッセージを履歴へ追加する
- AI 応答が完了した時点で、対象 AI メッセージの `status` を `completed` に更新し、回答本文を `message_text` に反映する
- AI 応答生成開始から 60 秒以内に完了しない場合はタイムアウトとし、対象 AI メッセージの `status` を `ai_timeout`、`message_text` を `AI応答がありません` に更新する
- `last_messaged_at` は、ユーザーメッセージ保存時、`status = pending` の AI メッセージ生成時、`status = completed` 更新時、`status = ai_timeout` 更新時のすべてで更新する
- 対象チャット内に `status = pending` の AI メッセージが存在する間は、追加メッセージ送信リクエストを `422` で拒否する
- この `422` は UI 側の入力無効化に加えて、API 側でも明示的に制御する業務制約とする
- 回答生成では、基盤側で埋め込み生成、類似ルール検索、プロンプト構築、LLM実行を行う
- 回答生成では、`correction_rules` に加えて過去の `messages.ai_feedback` を学習データとして参照する
- ユーザーの `message_text` に AI への訂正意図が含まれる場合、対象チャットの全履歴を訂正対象として、同一 API の処理内で自己訂正とルール抽出を行う
- ルール検索対象となるデータの詳細は [../db/common.md](../db/common.md) を参照する
- 実行基盤の詳細は [../infra/common.md](../infra/common.md) を参照する

### `POST /api/chats/{channel_id}/messages/{message_id}/feedback`

- path parameter として `channel_id` と `message_id` を受け取る
- 指定された AI メッセージに対する Good / Bad のフィードバックを受け取る
- リクエスト本文は `ai_feedback` を含み、`true` を `good`、`false` を `bad` として扱う
- フィードバック対象メッセージは `sender_type = ai` かつ `status = completed` のメッセージに限る
- `status = pending` または `status = ai_timeout` の AI メッセージはフィードバック対象外とする
- `messages.ai_feedback` と `feedback_updated_at` を更新する
- `good` 済みの状態で再度 `true` を送信した場合、および `bad` 済みの状態で再度 `false` を送信した場合は、`ai_feedback` を `null` に更新して取り消しとして扱う
- `good` と `bad` の反対側の値が送信された場合は、その値で上書き更新する
- 保存したフィードバックは、以後の回答生成時に学習データとして参照する
- 成功時は更新後の `message_id` と `ai_feedback` を返す前提とする
- フィードバック対象が `status = pending` または `status = ai_timeout` である場合など、業務条件に違反するリクエストは `422` を返す前提とする
- 削除済みチャンネルを指定した場合、他ユーザー所有のチャンネルを指定した場合、存在しない `message_id` を指定した場合、または `sender_type = user` のメッセージを指定した場合は `404` を返す前提とする
- 保存対象となるデータの詳細は [../db/common.md](../db/common.md) を参照する

## 6. UIとのインターフェース前提

APIは以下の前提でUIから利用される。

- ログインは Client Components から `POST /api/auth/login` を呼び出して行う
- トップ画面のチャット一覧取得は `GET /api/chats` を利用する
- 新規チャット開始は API を呼ばずに空のチャットモーダルを開き、最初のメッセージ送信時に `POST /api/chats` を利用する
- 既存チャットを開く操作は `GET /api/chats/{channel_id}` を利用する
- チャット削除は `DELETE /api/chats/{channel_id}` を利用する
- 新規チャット開始および既存チャットを開く操作では、トップ画面上のチャットモーダルを表示する
- 初期データ読み込みは RSC 経由で行い、`401` の場合は `/login` へ遷移する
- 保存済みチャットへのメッセージ送信は `POST /api/chats/{channel_id}/messages` を利用する
- メッセージ送信直後、UI はユーザーメッセージを即時反映する
- `POST /api/chats` および `POST /api/chats/{channel_id}/messages` の成功レスポンスに `channel_name` が含まれる場合、UI はレスポンス受信時点でチャットモーダルの見出しへ即時反映する
- UI は `GET /api/chats/{channel_id}` を 1 秒間隔で定期的に再取得し、`status = pending` の AI メッセージを検知して、その間は「AI回答生成中」と表示する
- 既存チャットを開いた時点で `status = pending` の AI メッセージが存在する場合、UI は最初の `GET /api/chats/{channel_id}` の取得結果をもとに、その時点で定期再取得を開始する
- UI は `GET /api/chats/{channel_id}` の再取得結果で AI メッセージの `status = completed` を検知した時点で、実際の回答本文を表示する
- UI は `GET /api/chats/{channel_id}` の再取得結果で AI メッセージの `status = ai_timeout` を検知した時点で、`message_text` に設定された `AI応答がありません` を表示する
- UI は `GET /api/chats/{channel_id}` の再取得結果で AI メッセージの `status = completed` または `status = ai_timeout` を検知した時点でも、`last_messaged_at` と `channel_name` の更新に追従するためチャット一覧データを再取得してリフレッシュする
- UI は対象チャット内に `status = pending` の AI メッセージが存在しなくなった時点で定期再取得を停止する
- UI はチャットモーダルを閉じた時点で定期再取得を停止する
- UI は `status = pending` の AI メッセージが存在する間、追加メッセージ送信を受け付けない
- メッセージ送信後は `last_messaged_at` と `channel_name` の更新に追従するため、UI はチャット一覧データを再取得してリフレッシュする
- フィードバック送信は `POST /api/chats/{channel_id}/messages/{message_id}/feedback` を利用する
- 訂正を求める場合も通常のメッセージ送信 API を利用し、本文の意図判定はバックエンド側で行う
- クライアントサイド通信で `401` を受けた場合、UI は `/login` へ遷移する
- `hono/rpc` を通じてフロントエンドと型共有できる構成を前提とする
