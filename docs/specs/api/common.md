# 自己学習型AIチャットシステム API仕様（共通）

## 1. この文書の対象範囲

本書は、自己学習型AIチャットシステムにおけるAPI共通仕様を定義する。Hono API の責務、エンドポイント一覧、各リクエスト起点で実行される処理の範囲を扱う。

全体概要は [../../spec.md](../../spec.md)、データ永続化の正本は [../db/common.md](../db/common.md)、処理基盤の正本は [../infra/common.md](../infra/common.md) を参照する。

## 2. APIの責務

APIは、UIからのリクエストを受け取り、チャット履歴取得、回答生成、フィードバック受付、訂正受付の入口として振る舞う。

- UI向けのHTTPエンドポイントを公開する
- ログイン要求を受けて認証とセッション確立を行う
- チャット作成要求を受けて新規チャットを作成する
- 履歴取得要求を受けてチャットデータを返す
- 個別チャット取得要求を受けて対象チャットを返す
- チャット削除要求を受けて対象チャットを削除する
- チャット単位のメッセージ送信要求を受けて回答生成処理を起動する
- 対象メッセージへのフィードバック要求を受けて評価保存と学習データ更新を行う
- 対象メッセージへの訂正要求を受けてルール抽出と保存処理を起動する

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
| `POST` | `/api/chats/{channel_id}/messages/{messageId}/feedback` | 指定 AI メッセージへの Good / Bad フィードバック送信 | クライアントサイド |
| `POST` | `/api/chats/{channel_id}/messages/{messageId}/correct` | 指定 AI メッセージに対する訂正の送信（ルール抽出・保存処理の起動） | クライアントサイド |

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

### `GET /api/chats`

- ログイン済みユーザーのチャット一覧を返す
- トップ画面の初期表示で利用される
- 返却内容には各チャットの `channel_name` を含む前提とする
- 返却対象となる永続化データの詳細は [../db/common.md](../db/common.md) を参照する

### `POST /api/chats`

- ログイン済みユーザーの新規チャットを作成する
- 作成時点のチャンネル名は `新規チャット` とする
- 作成成功時は作成されたチャットを返す
- 新規チャット開始操作から利用される

### `GET /api/chats/{channel_id}`

- 指定されたチャット ID に対応する既存チャットを返す
- 既存チャットを開く操作から利用される
- 返却内容には対象チャットの `channel_name` とチャット履歴を含む前提とする
- ログイン済みユーザー自身のチャットのみ取得対象とする

### `DELETE /api/chats/{channel_id}`

- 指定されたチャット ID に対応する既存チャットを削除する
- チャット削除操作から利用される
- ログイン済みユーザー自身のチャットのみ削除対象とする

### `POST /api/chats/{channel_id}/messages`

- path parameter として `channel_id` を受け取る
- 指定チャットへの新規メッセージを受け取る
- 回答生成処理を起動する
- 追加されたユーザーメッセージと生成された AI メッセージは `messages` として扱う
- 対象チャットが最初のユーザーメッセージ送信前であり、チャンネル名が `新規チャット` の場合は、この処理の中で最初の会話内容からチャンネル名を自動生成して更新する
- チャンネル名を更新した場合、応答には更新後の `channel_name` を含める
- 回答生成では、基盤側で埋め込み生成、類似ルール検索、プロンプト構築、LLM実行を行う
- 回答生成では、`correction_rules` に加えて過去の `messages.ai_feedback` を学習データとして参照する
- ルール検索対象となるデータの詳細は [../db/common.md](../db/common.md) を参照する
- 実行基盤の詳細は [../infra/common.md](../infra/common.md) を参照する

### `POST /api/chats/{channel_id}/messages/{messageId}/feedback`

- path parameter として `channel_id` と `messageId` を受け取る
- 指定された AI メッセージに対する Good / Bad のフィードバックを受け取る
- リクエスト本文は `feedback` を含み、`true` を `good`、`false` を `bad` として扱う
- フィードバック対象メッセージは AI 出力である前提とする
- `messages.ai_feedback` と `feedback_updated_at` を更新する
- 保存したフィードバックは、以後の回答生成時に学習データとして参照する
- 成功時は更新後の `messageId` と `ai_feedback` を返す前提とする
- 保存対象となるデータの詳細は [../db/common.md](../db/common.md) を参照する

### `POST /api/chats/{channel_id}/messages/{messageId}/correct`

- path parameter として `channel_id` と `messageId` を受け取る
- 指定された AI メッセージに対する訂正内容を受け取る
- 訂正内容をもとにルール抽出とベクトル保存処理を起動する
- 訂正対象メッセージは AI 出力である前提とする
- 保存対象となるデータの詳細は [../db/common.md](../db/common.md) を参照する
- ルール抽出と埋め込み生成の基盤詳細は [../infra/common.md](../infra/common.md) を参照する

## 6. UIとのインターフェース前提

APIは以下の前提でUIから利用される。

- ログインは Client Components から `POST /api/auth/login` を呼び出して行う
- トップ画面のチャット一覧取得は `GET /api/chats` を利用する
- 新規チャット開始は `POST /api/chats` を利用する
- 既存チャットを開く操作は `GET /api/chats/{channel_id}` を利用する
- チャット削除は `DELETE /api/chats/{channel_id}` を利用する
- 新規チャット開始および既存チャットを開く操作では、トップ画面上のチャットモーダルを表示する
- 初期データ読み込みは RSC 経由で行う
- メッセージ送信は `POST /api/chats/{channel_id}/messages` を利用する
- 最初のメッセージ送信で `channel_name` が返却された場合、UI はチャット一覧データをリフレッシュする
- フィードバック送信は `POST /api/chats/{channel_id}/messages/{messageId}/feedback` を利用する
- 訂正送信は `POST /api/chats/{channel_id}/messages/{messageId}/correct` を利用する
- `hono/rpc` を通じてフロントエンドと型共有できる構成を前提とする
