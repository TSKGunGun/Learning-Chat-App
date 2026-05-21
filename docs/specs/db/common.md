# 自己学習型AIチャットシステム DB仕様（共通）

## 1. この文書の対象範囲

本書は、自己学習型AIチャットシステムにおけるDB共通仕様を定義する。データモデル、永続化責務、ベクトル検索対象、および Drizzle ORM と PostgreSQL + `pgvector` の関係を扱う。

全体概要は [../../spec.md](../../spec.md)、APIの正本は [../api/common.md](../api/common.md) を参照する。

## 2. DBの責務

DBは、チャットチャンネル、チャット履歴、メッセージ評価、およびチャット全履歴の訂正から抽出されたルールデータを永続化し、回答生成時の類似ルール検索とフィードバック学習を支える。

- チャットチャンネルの保存
- チャット履歴の保存
- AI メッセージに対するフィードバック評価の保存
- 抽出済みルールの保存
- ルール埋め込みベクトルの保存
- ベクトル類似度検索の実行基盤提供

採用技術は PostgreSQL + `pgvector` と Drizzle ORM とする。DB 仕様は永続化の正本であり、アプリケーション層からは Repository 抽象経由で利用する前提とする。

## 3. データモデル

データモデルの正本は本章とする。

### `users` テーブル

ログイン対象となるユーザー情報を保持する。

- `id` (UUID, Primary Key)
- `username` (Text, Unique): ログイン時に使用するユーザー名
- `password_hash` (Text): ハッシュ化されたパスワード
- `created_at` (Timestamp)
- `updated_at` (Timestamp)

パスワード平文は保持せず、保存対象はハッシュ値のみとする。
ユーザー作成フローは今回の仕様範囲外とし、ユーザーは事前作成済みである前提とする。

### `chat_channels` テーブル

`ChatChannel` モデルを保持するマスターデータ。

- `id` (UUID, Primary Key)
- `user_id` (UUID, Foreign Key): チャット所有者のユーザー ID
- `channel_name` (Text): チャンネル名。未保存の新規チャットは UI 上で `新規チャット` として扱い、最初のユーザーメッセージ送信時に会話内容から自動生成した名称を保存する
- `is_deleted` (Boolean): 削除フラグ。初期値は `false` とし、削除済みチャンネルは一覧および通常取得対象から除外する
- `last_messaged_at` (Timestamp): 最後にメッセージが追加された日時。チャットチャンネル生成時に最初のメッセージ時刻を設定し、以後の新規メッセージ追加時に更新する
- `created_at` (Timestamp)
- `updated_at` (Timestamp)

`chat_channels` テーブル自体はチャットチャンネルの単位を表し、最初のユーザーメッセージ送信時に生成される。チャット履歴は `messages` テーブルで管理する。削除時は物理削除ではなく `is_deleted = true` のソフトデリートとし、履歴データおよび学習データは保持する。

### `messages` テーブル

チャットチャンネル内のメッセージ履歴を保持する。

- `id` (UUID, Primary Key)
- `channel_id` (UUID, Foreign Key): 所属するチャットチャンネルの ID
- `sender_type` (Text): `user` または `ai`
- `message_text` (Text, Nullable): メッセージ本文。AI メッセージが `pending` の間は `null` を許容する
- `status` (Text): 固定 enum。`pending`、`completed`、`ai_timeout` のみを許容する。`sender_type = user` の場合は常に `completed` を保持し、表示時に無視する。`sender_type = ai` の場合は応答生成状態として扱う
- `ai_feedback` (Text, Nullable): AI 出力に対する評価。`good` または `bad` を保持し、ユーザー出力および `status = pending` の AI メッセージの場合は `null` とする
- `feedback_updated_at` (Timestamp, Nullable): AI メッセージに対するフィードバックの最終更新日時。ユーザー出力の場合は `null` とする
- `created_at` (Timestamp)

`messages` テーブルにより、1 つのチャットチャンネルに対して複数のメッセージ履歴を保持する。
`ai_feedback` は AI メッセージに対する Good / Bad 評価を保持し、以後の回答生成時に学習シグナルとして参照する。nullを許容し、未評価時はnullとする。
`status` は固定 enum とし、`pending`、`completed`、`ai_timeout` の 3 値のみを許容する。`sender_type = ai` かつ `status = pending` の間は回答本文未確定の状態とし、`status = completed` になった時点で `message_text` に回答本文を保持する。AI 応答生成開始から 60 秒以内に完了しない場合は `status = ai_timeout`、`message_text = AI応答がありません` とする。
`sender_type = user` のメッセージは常に `status = completed` とする。
`sender_type = ai` かつ `status = pending` のメッセージは、`ai_feedback = null` とする。
`feedback_updated_at` は保持専用カラムとし、API の返却対象には含めない。

### `correction_rules` テーブル

ベクトル検索用ルールデータを保持する。

- `id` (UUID, Primary Key)
- `channel_id` (UUID, Foreign Key): ルール抽出元となったチャットチャンネルの ID
- `trigger_message_id` (UUID, Foreign Key): 自己訂正とルール抽出を起動したユーザーメッセージの ID
- `rule_text` (Text): LLMが抽出した「次回以降守るべきルール」
- `embedding` (vector(1536)): OpenAI APIで生成されたベクトルデータ
- `created_at` (Timestamp)

`correction_rules` は単一の AI メッセージではなく、対象チャットチャンネルの全履歴をもとに抽出されたルールを保持する。チャットチャンネルが削除済みになっても `correction_rules` は削除せず、以後の回答生成で学習データとして参照可能とする。

## 4. 永続化責務

バックエンドは以下のデータを管理する。

- `users` テーブル: ログイン対象ユーザーの認証情報を保持する
- `chat_channels` テーブル: チャットチャンネルを保持する
- `messages` テーブル: チャット履歴を保持する
- `correction_rules` テーブル: 抽出済みルールと埋め込みベクトルを保持する

`POST /api/auth/login` では `users` を認証対象として参照する。
`GET /api/chats`、`POST /api/chats`、`GET /api/chats/{channel_id}`、`DELETE /api/chats/{channel_id}` では `chat_channels` をログイン済みユーザー単位で参照または更新する。
`POST /api/chats` では、最初のユーザーメッセージ送信時に `chat_channels` を生成し、`is_deleted = false`、`channel_name`、`last_messaged_at` を設定する。
`GET /api/chats/{channel_id}`、`POST /api/chats`、`POST /api/chats/{channel_id}/messages` では `messages` をチャット履歴として参照または追加する。
`GET /api/chats` および `GET /api/chats/{channel_id}` の通常取得対象は `is_deleted = false` のチャンネルに限る。
`DELETE /api/chats/{channel_id}` では `chat_channels.is_deleted` を `true` に更新し、物理削除は行わない。
`POST /api/chats` および `POST /api/chats/{channel_id}/messages` では、ユーザーメッセージ追加時、`sender_type = ai` かつ `status = pending` の AI メッセージ生成時、AI メッセージの `status = completed` 更新時、AI メッセージの `status = ai_timeout` 更新時のすべてで `chat_channels.last_messaged_at` を更新する。
`POST /api/chats` および `POST /api/chats/{channel_id}/messages` では `correction_rules` と `messages.ai_feedback` を学習データとして参照する。
`POST /api/chats/{channel_id}/messages/{message_id}/feedback` では対象 AI メッセージの `ai_feedback` を更新する。
`POST /api/chats` および `POST /api/chats/{channel_id}/messages` では、ユーザーの `message_text` に訂正意図が含まれる場合、対象チャットの全履歴をもとに自己訂正とルール抽出を行い、必要に応じて `correction_rules` に保存する。
`POST /api/chats` および `POST /api/chats/{channel_id}/messages` では、ユーザーメッセージ保存後に `sender_type = ai` かつ `status = pending` のメッセージを作成し、回答生成完了後に `status = completed` と `message_text` を更新する。
`POST /api/chats` および `POST /api/chats/{channel_id}/messages` では、対象チャット内に `status = pending` の AI メッセージが存在する間、新規メッセージ送信を受け付けず、API は `422` を返す。
`POST /api/chats` および `POST /api/chats/{channel_id}/messages` で保存されるユーザーメッセージは、`sender_type = user` かつ `status = completed` とする。

## 5. ORM とベクトル検索

Drizzle ORM はスキーマ定義とデータアクセスを担う。
PostgreSQL + `pgvector` は、ルールデータの永続化とベクトル類似度検索を担う。

- Drizzle ORM を用いて `messages` テーブルへチャット履歴を保存する
- Drizzle ORM を用いて `messages.ai_feedback` を更新する
- Drizzle ORM を用いて `correction_rules` テーブルへ保存する
- Drizzle ORM を用いて `CorrectionRule` の類似度検索を実行する
- `embedding` は OpenAI API により生成された 1536 次元ベクトルを保持する

DB 仕様はレイヤー責務の説明に留め、業務ロジックの配置先とはしない。
