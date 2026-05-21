# API AGENTS.md

## 目的

`api` は自己学習型AIチャットシステムの API サーバー実装を担当する。
詳細仕様の正本は以下を参照する。

- `/home/sueda/Lbose/Learning-Chat-App/docs/spec.md`
- `/home/sueda/Lbose/Learning-Chat-App/docs/specs/api/common.md`
- `/home/sueda/Lbose/Learning-Chat-App/docs/specs/api/openapi/openapi.yaml`
- `/home/sueda/Lbose/Learning-Chat-App/docs/specs/db/common.md`
- `/home/sueda/Lbose/Learning-Chat-App/docs/specs/infra/common.md`

## 技術方針

- API サーバーは `TypeScript` を採用する
- クリーンアーキテクチャを採用する
- Hono をフレームワーク層として扱う
- HTTP 契約の正本は OpenAPI とする

## レイヤー責務

- Controller は入力検証と Use Case 呼び出しの調停に限定する
- Use Case は 1 操作 1 責務とし、他の Use Case を直接束ねない
- Use Case は Repository や外部 Service の抽象に依存する
- Infrastructure は DB、OpenAI API、LangChain.js など外部依存の具象実装を吸収する
- Presenter / 出力変換層で外部公開向けの出力形式へ整える
- Hono 固有の request / response を内側へ直接漏らさない

## 実装ルール

- ログイン、チャット一覧取得、個別チャット取得、初回送信、既存チャット送信、フィードバック送信を API サーバーの責務として扱う
- 初回メッセージ送信時に `chat_channels` を生成する
- `pending` の AI メッセージが存在する間は追加メッセージ送信を受け付けない
- AI 応答は `pending`、`completed`、`ai_timeout` の状態を持つ前提で処理する
- チャット削除は `chat_channels.is_deleted = true` のソフトデリートとする
- `correction_rules` は削除せず学習データとして保持する
- 回答生成では `correction_rules` と過去の `messages.ai_feedback` を学習データとして参照する

## 完了条件

エージェント実行の完了条件は、`api` で以下がすべて通ることとする。

- `npm run build`
- `npm run tsc`
- `npm run lint`
- `npm run test`
