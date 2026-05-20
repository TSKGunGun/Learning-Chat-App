# 自己学習型AIチャットシステム DB仕様（共通）

## 1. この文書の対象範囲

本書は、自己学習型AIチャットシステムにおけるDB共通仕様を定義する。データモデル、永続化責務、ベクトル検索対象、および Drizzle ORM と PostgreSQL + `pgvector` の関係を扱う。

全体概要は [../../spec.md](../../spec.md)、APIの正本は [../api/common.md](../api/common.md) を参照する。

## 2. DBの責務

DBは、チャットチャンネル、チャット履歴、メッセージ評価、および訂正から抽出されたルールデータを永続化し、回答生成時の類似ルール検索とフィードバック学習を支える。

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

### `chats` テーブル

チャットチャンネルを保持するマスターデータ。

- `id` (UUID, Primary Key)
- `user_id` (UUID, Foreign Key): チャット所有者のユーザー ID
- `room_name` (Text): チャットルーム名。新規作成時は `新規チャット` を保持し、最初のユーザーメッセージ送信時に会話内容から自動生成した名称へ更新する
- `created_at` (Timestamp)
- `updated_at` (Timestamp)

`chats` テーブル自体はチャットチャンネルの単位を表し、チャット履歴は `messages` テーブルで管理する。

### `messages` テーブル

チャットチャンネル内のメッセージ履歴を保持する。

- `id` (UUID, Primary Key)
- `chat_id` (UUID, Foreign Key): 所属するチャットチャンネルの ID
- `sender_type` (Text): `user` または `ai`
- `message_text` (Text): メッセージ本文
- `ai_feedback` (Text, Nullable): AI 出力に対する評価。`good` または `bad` を保持し、ユーザー出力の場合は `null` とする
- `feedback_updated_at` (Timestamp, Nullable): AI メッセージに対するフィードバックの最終更新日時。ユーザー出力の場合は `null` とする
- `created_at` (Timestamp)

`messages` テーブルにより、1 つのチャットチャンネルに対して複数のメッセージ履歴を保持する。
`ai_feedback` は AI メッセージに対する Good / Bad 評価を保持し、以後の回答生成時に学習シグナルとして参照する。

### `correction_rules` テーブル

ベクトル検索用ルールデータを保持する。

- `id` (UUID, Primary Key)
- `message_id` (UUID, Foreign Key): 元となった AI メッセージの ID
- `rule_text` (Text): LLMが抽出した「次回以降守るべきルール」
- `embedding` (vector(1536)): OpenAI APIで生成されたベクトルデータ
- `created_at` (Timestamp)

## 4. 永続化責務

バックエンドは以下のデータを管理する。

- `users` テーブル: ログイン対象ユーザーの認証情報を保持する
- `chats` テーブル: チャットチャンネルを保持する
- `messages` テーブル: チャット履歴を保持する
- `correction_rules` テーブル: 抽出済みルールと埋め込みベクトルを保持する

`POST /api/auth/login` では `users` を認証対象として参照する。
`GET /api/chats`、`POST /api/chats`、`GET /api/chats/{chatId}`、`DELETE /api/chats/{chatId}` では `chats` をログイン済みユーザー単位で参照または更新する。
`POST /api/chats` では `room_name` が `新規チャット` のチャットチャンネルを作成する。
`GET /api/chats/{chatId}` および `POST /api/chats/{chatId}/messages` では `messages` をチャット履歴として参照または追加する。
`POST /api/chats/{chatId}/messages` では、対象チャットの最初のユーザーメッセージ送信時に `room_name` を会話内容から自動生成した名称へ更新する。
`POST /api/chats/{chatId}/messages` では `correction_rules` と `messages.ai_feedback` を学習データとして参照する。
`POST /api/chats/{chatId}/messages/{messageId}/feedback` では対象 AI メッセージの `ai_feedback` を更新する。
`POST /api/chats/{chatId}/messages/{messageId}/correct` では対象 AI メッセージに対する訂正をもとにルールと埋め込みを `correction_rules` に保存する。

## 5. ORM とベクトル検索

Drizzle ORM はスキーマ定義とデータアクセスを担う。
PostgreSQL + `pgvector` は、ルールデータの永続化とベクトル類似度検索を担う。

- Drizzle ORM を用いて `messages` テーブルへチャット履歴を保存する
- Drizzle ORM を用いて `messages.ai_feedback` を更新する
- Drizzle ORM を用いて `correction_rules` テーブルへ保存する
- Drizzle ORM を用いて `CorrectionRule` の類似度検索を実行する
- `embedding` は OpenAI API により生成された 1536 次元ベクトルを保持する

DB 仕様はレイヤー責務の説明に留め、業務ロジックの配置先とはしない。
