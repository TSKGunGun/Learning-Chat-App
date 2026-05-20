# 自己学習型AIチャットシステム DB仕様（共通）

## 1. この文書の対象範囲

本書は、自己学習型AIチャットシステムにおけるDB共通仕様を定義する。データモデル、永続化責務、ベクトル検索対象、および Drizzle ORM と PostgreSQL + `pgvector` の関係を扱う。

全体概要は [../../spec.md](../../spec.md)、APIの正本は [../api/common.md](../api/common.md) を参照する。

## 2. DBの責務

DBは、チャット履歴と訂正から抽出されたルールデータを永続化し、回答生成時の類似ルール検索を支える。

- チャット履歴の保存
- 抽出済みルールの保存
- ルール埋め込みベクトルの保存
- ベクトル類似度検索の実行基盤提供

採用技術は PostgreSQL + `pgvector` と Drizzle ORM とする。DB 仕様は永続化の正本であり、アプリケーション層からは Repository 抽象経由で利用する前提とする。

## 3. データモデル

データモデルの正本は本章とする。

### `chats` テーブル

セッションややり取りの履歴を保持するマスターデータ。

- `id` (UUID, Primary Key)
- `user_query` (Text): ユーザーの質問
- `ai_response` (Text): AIの回答
- `created_at` (Timestamp)

### `correction_rules` テーブル

ベクトル検索用ルールデータを保持する。

- `id` (UUID, Primary Key)
- `chat_id` (UUID, Foreign Key): 元となったチャットのID
- `rule_text` (Text): LLMが抽出した「次回以降守るべきルール」
- `embedding` (vector(1536)): OpenAI APIで生成されたベクトルデータ
- `created_at` (Timestamp)

## 4. 永続化責務

バックエンドは以下のデータを管理する。

- `chats` テーブル: セッションややり取りの履歴を保持する
- `correction_rules` テーブル: 抽出済みルールと埋め込みベクトルを保持する

`POST /api/chats/message` では `correction_rules` を類似ルール検索対象として参照する。
`POST /api/chats/correct` では抽出されたルールと埋め込みを `correction_rules` に保存する。

## 5. ORM とベクトル検索

Drizzle ORM はスキーマ定義とデータアクセスを担う。
PostgreSQL + `pgvector` は、ルールデータの永続化とベクトル類似度検索を担う。

- Drizzle ORM を用いて `correction_rules` テーブルへ保存する
- Drizzle ORM を用いて `CorrectionRule` の類似度検索を実行する
- `embedding` は OpenAI API により生成された 1536 次元ベクトルを保持する

DB 仕様はレイヤー責務の説明に留め、業務ロジックの配置先とはしない。
