# 自己学習型AIチャットシステム API仕様（共通）

## 1. この文書の対象範囲

本書は、自己学習型AIチャットシステムにおける API サーバー共通仕様を定義する。Hono API の責務、Clean Architecture 上の位置づけ、各操作でサーバー側が担う処理責務を扱う。

HTTP 契約の正本は [openapi/openapi.yaml](./openapi/openapi.yaml) とする。全体概要は [../../spec.md](../../spec.md)、データ永続化の正本は [../db/common.md](../db/common.md)、処理基盤の正本は [../infra/common.md](../infra/common.md) を参照する。

## 2. APIサーバーの責務

API サーバーは、UI からのリクエストを受け取り、認証、チャット履歴取得、チャット開始、回答生成、フィードバック受付の入口として振る舞う。

- UI 向けの HTTP エンドポイントを公開する
- ログイン要求を受けて認証とセッション確立を行う
- 新規チャット開始時の初回メッセージ要求を受けてチャットチャンネルを生成する
- 履歴取得要求を受けてチャットデータを返す
- 個別チャット取得要求を受けて対象チャットを返す
- チャット削除要求を受けて対象チャットをソフトデリートする
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

## 4. HTTP契約との分担

HTTP の wire 契約は OpenAPI を正本とし、本書には記載しない。

- エンドポイント一覧
- request body / response body
- path parameter / security
- `401`、`404`、`422` などの HTTP ステータス契約
- `pending`、`completed`、`ai_timeout`、nullable 条件などの公開データ契約

上記の正本は [openapi/openapi.yaml](./openapi/openapi.yaml) とする。

## 5. 操作ごとの処理責務

### ログイン

- `users` テーブルを参照して資格情報を検証する
- 認証成功時は Cookie セッションを確立する
- 認証失敗時は認証状態を変更しない

### チャット一覧取得

- ログイン済みユーザー単位でチャットチャンネルを参照する
- 削除済みチャンネルを除外して返す
- 一覧順は `last_messaged_at` を基準に扱う

### 初回メッセージ送信

- 最初のユーザーメッセージ送信時に `chat_channels` を生成する
- `is_deleted = false`、`channel_name`、`last_messaged_at` を設定する
- 初回ユーザーメッセージを保存する
- 会話内容からチャンネル名を自動決定する
- AI 応答生成を開始し、`pending` の AI メッセージを作成する
- AI 応答完了時は `completed` へ更新し、タイムアウト時は `ai_timeout` へ更新する
- `last_messaged_at` はユーザーメッセージ保存時、`pending` 生成時、`completed` 更新時、`ai_timeout` 更新時に更新する

### 既存チャット取得

- ログイン済みユーザー自身の未削除チャットのみ参照対象とする
- チャット履歴を時系列で返せるよう整形する

### 既存チャット削除

- 物理削除は行わず、`chat_channels.is_deleted = true` のソフトデリートとする
- `messages` は保持する
- `correction_rules` は削除せず、学習データとして利用可能な状態を保つ

### 既存チャットへのメッセージ送信

- ログイン済みユーザー自身の未削除チャットのみ処理対象とする
- ユーザーメッセージを保存する
- 回答生成処理を起動する
- `pending` の AI メッセージを作成し、応答完了時に `completed`、タイムアウト時に `ai_timeout` へ更新する
- `last_messaged_at` はユーザーメッセージ保存時、`pending` 生成時、`completed` 更新時、`ai_timeout` 更新時に更新する
- 対象チャット内に `pending` の AI メッセージが存在する間は、追加メッセージ送信を受け付けない
- 回答生成では、埋め込み生成、類似ルール検索、プロンプト構築、LLM 実行を行う
- 回答生成では、`correction_rules` に加えて過去の `messages.ai_feedback` を学習データとして参照する

### フィードバック送信

- `sender_type = ai` かつ `status = completed` のメッセージのみを評価対象とする
- `messages.ai_feedback` と `feedback_updated_at` を更新する
- 同一評価の再送は取り消しとして扱い、反対評価は上書き更新する
- 保存したフィードバックは以後の回答生成時に学習データとして参照する

### 訂正意図を含むメッセージの処理

- ユーザーの `message_text` に AI への訂正意図が含まれる場合、対象チャットの全履歴を訂正対象として扱う
- 同一 API 処理内で自己訂正とルール抽出を行う
- 必要に応じて `correction_rules` に保存する

## 6. UI連携前提

UI は OpenAPI に定義された HTTP 契約を通じて API サーバーを利用する。

- ログインは Client Components から行う
- トップ画面の初期表示は RSC 経由で一覧取得を行う
- 新規チャット開始は空モーダルを開き、最初の送信時にチャット生成を行う
- 既存チャット表示は個別チャット取得を利用する
- メッセージ送信後は定期再取得で AI 応答状態を反映する
- `pending` がなくなるかモーダルを閉じた時点で定期再取得を停止する
- `pending` の AI メッセージが存在する間、追加送信を受け付けない
- フィードバック送信は対象 AI メッセージに対して行う

UI 側の振る舞い詳細は [../ui/common.md](../ui/common.md)、HTTP 契約の詳細は [openapi/openapi.yaml](./openapi/openapi.yaml) を参照する。
