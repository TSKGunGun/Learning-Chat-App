# 自己学習型AIチャットシステム 仕様書

## 1. 概要

本システムは、ユーザーの入力やフィードバック（訂正）を動的に学習し、同じ間違いを繰り返さない「自己学習型AIチャットボット」の概念実証（PoC）モデルである。
LLM自体のパラメータ更新は行わず、LangChain.js を用いた自己反省（Self-Reflection）によるルール抽出と、PostgreSQL（pgvector）を用いた検索拡張生成（RAG）を組み合わせることで、擬似的な継続的学習を実現する。
チャットは `chat_channels` をチャットチャンネル、`messages` をメッセージ履歴として扱う構成を前提とする。未保存の新規チャットは UI 上で `新規チャット` として扱い、最初のユーザーメッセージ送信時に `chat_channels` を生成してチャンネル名を自動決定する。

本ドキュメントは、全体概要と仕様書の入口を兼ねる。詳細仕様の正本は `docs/specs/` 配下の分割ドキュメントを参照する。

## 2. システム構成

システムはモノレポ構成を採用し、フロントエンドとバックエンドを明確に分離する。将来的な AWS へのデプロイを見据え、ローカルでは Docker を用いてデータベース環境を構築する。

```text
monorepo/
├── apps/
│   ├── front/ (Next.js)
│   └── back/  (Node.js + Hono)
└── docker-compose.yml (PostgreSQL)
```

## 3. 共通技術スタック

| コンポーネント | 技術・ツール | 選定理由・役割 |
| --- | --- | --- |
| フロントエンド | Next.js (App Router), TypeScript | ユーザー向けUI。RSCとClient Componentsのハイブリッド構成。 |
| バックエンドAPI | Node.js, Hono, TypeScript | 高速かつ型安全なAPIサーバー。`hono/rpc`でフロントと型を共有。 |
| LLMオーケストレーション | LangChain.js | プロンプト構築、複数LLMチェーンの制御（ルール抽出・RAG実行）。 |
| AIモデル | OpenAI API (`gpt-4o`, `text-embedding-3-small`) | テキスト生成（チャット回答、ルール要約）およびベクトル化。 |
| データベース | PostgreSQL + `pgvector` (Docker) | 生データの永続化および、ベクトル類似度検索を一つのDBで完結。 |
| ORM | Drizzle ORM | 高速・軽量でSQLライクな記述が可能。pgvector拡張にネイティブ対応。 |

## 4. 設計方針

UI およびバックエンドは、クリーンアーキテクチャを採用する。

- 依存方向は外側から内側への一方向とする
- UI では Next.js、バックエンドでは Hono をフレームワーク層として扱う
- フレームワーク、ORM、SDK の詳細を Use Case や Entity へ直接持ち込まない
- 画面や API の入口は Controller 相当の調停層を経由し、Use Case と外部依存を分離する
- 外部依存は Infrastructure 層で吸収し、Use Case は抽象に依存する

UI 側の詳細設計原則は [UI仕様（共通）](./specs/ui/common.md)、バックエンド側の詳細設計原則は [API仕様（共通）](./specs/api/common.md) を参照する。UI コンポーネントの Atomic Design とディレクトリ構成ルールの正本も [UI仕様（共通）](./specs/ui/common.md) とする。HTTP 契約の正本は [OpenAPI定義](./specs/api/openapi/openapi.yaml) を参照する。

## 5. 全体処理フロー

本システムでは、UI が初期表示とユーザー操作を担当し、API がリクエスト受付を担い、DB と基盤層がRAGと自己学習パイプラインを支える。

1. ユーザーがトップ画面 `/` にアクセスし、チャット一覧またはチャット開始操作を行う。
2. UI は RSC 経由で `GET /api/chats` を呼び出し、チャット一覧を取得する。
3. トップ画面は、左側サイドバーにチャット一覧、右側にチャット画面を表示する 2 ペイン構成とする。新規チャット開始または既存チャット選択時は、対象状態を右ペインへ表示する。既存チャット表示時に `status = pending` の AI メッセージが存在する場合、UI はその時点で履歴ポーリングを開始する。
4. 新規チャットでは、右ペインを未保存の新規チャット状態へ切り替え、最初のユーザーメッセージ送信時に `POST /api/chats` を通じて `chat_channels` と最初のメッセージ履歴を生成する。既存チャットでは `POST /api/chats/{channel_id}/messages` を利用する。
5. ユーザーの送信メッセージは送信直後に UI へ反映される。AI の応答生成が始まると、`sender_type = ai` かつ `status = pending` のメッセージが履歴に追加される。
6. API は回答生成処理を起動し、基盤側では過去の訂正ルールと Good / Bad フィードバックを参照して回答を生成する。AI 応答が完了すると対象メッセージの `status` が `completed` に更新され、UI は履歴再取得により回答を表示する。AI 応答が 60 秒以内に完了しない場合はタイムアウトとし、対象メッセージの `status` を `ai_timeout`、`message_text` を `AI応答がありません` に更新する。`status = pending` の AI メッセージが存在する間、追加メッセージ送信は UI と API の両方で受け付けない。
7. ユーザーは AI メッセージに対して `POST /api/chats/{channel_id}/messages/{message_id}/feedback` を通じて Good / Bad フィードバックを送信でき、その評価は以後の回答生成に利用される。
8. ユーザーの送信メッセージに「訂正してほしい」という意図が含まれる場合、対象チャットの全履歴をもとに AI が自己訂正を行い、必要に応じて次回以降に守るべきルールを抽出して保存する。

## 6. 仕様一覧

- [UI仕様（共通）](./specs/ui/common.md)
  - 画面初期表示、クライアント通信、UIの責務とAPI依存を扱う。
- [API仕様（共通）](./specs/api/common.md)
  - Hono API の責務、レイヤー責務、サーバー側の処理責務を扱う。
- [OpenAPI定義](./specs/api/openapi/openapi.yaml)
  - request / response / 認証 / HTTP ステータス契約の正本を扱う。
- [DB仕様（共通）](./specs/db/common.md)
  - データモデル、永続化責務、ベクトル検索対象を扱う。
- [基盤仕様（共通）](./specs/infra/common.md)
  - Docker 構成、PostgreSQL + `pgvector`、Hono API サーバーの実行、外部接続前提を扱う。

## 7. 参照方針

- UI仕様の正本は [UI仕様（共通）](./specs/ui/common.md) とする。
- API サーバー責務の正本は [API仕様（共通）](./specs/api/common.md) とする。
- HTTP 契約の正本は [OpenAPI定義](./specs/api/openapi/openapi.yaml) とする。
- データモデルの正本は [DB仕様（共通）](./specs/db/common.md) とする。
- 技術基盤と構成前提の正本は [基盤仕様（共通）](./specs/infra/common.md) とする。
