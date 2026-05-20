# 自己学習型AIチャットシステム 仕様書

## 1. 概要

本システムは、ユーザーの入力やフィードバック（訂正）を動的に学習し、同じ間違いを繰り返さない「自己学習型AIチャットボット」の概念実証（PoC）モデルである。
LLM自体のパラメータ更新は行わず、LangChain.js を用いた自己反省（Self-Reflection）によるルール抽出と、PostgreSQL（pgvector）を用いた検索拡張生成（RAG）を組み合わせることで、擬似的な継続的学習を実現する。
チャットは `chat_channels` をチャットチャンネル、`messages` をメッセージ履歴として扱う構成を前提とする。チャンネル名は新規作成時に `新規チャット` とし、最初のユーザーメッセージ送信時に会話内容から自動生成する。

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

UI 側の詳細設計原則は [UI仕様（共通）](./specs/ui/common.md)、バックエンド側の詳細設計原則は [API仕様（共通）](./specs/api/common.md) を参照する。

## 5. 全体処理フロー

本システムでは、UI が初期表示とユーザー操作を担当し、API がリクエスト受付を担い、DB と基盤層がRAGと自己学習パイプラインを支える。

1. ユーザーがトップ画面 `/` にアクセスし、チャット一覧またはチャット開始操作を行う。
2. UI は RSC 経由で `GET /api/chats` を呼び出し、チャット一覧を取得する。
3. ユーザーが新規チャット開始または既存チャットを開く操作を行うと、対象チャットのチャットモーダルを表示する。
4. ユーザーがモーダル内でメッセージを送信すると、`POST /api/chats/{channel_id}/messages` を通じて対象チャットにメッセージ履歴が追加され、必要に応じてチャンネル名が自動生成される。
5. API は回答生成処理を起動し、基盤側では過去の訂正ルールと Good / Bad フィードバックを参照して回答を生成する。
6. ユーザーは AI メッセージに対して `POST /api/chats/{channel_id}/messages/{message_id}/feedback` を通じて Good / Bad フィードバックを送信でき、その評価は以後の回答生成に利用される。
7. ユーザーの送信メッセージに「訂正してほしい」という意図が含まれる場合、`POST /api/chats/{channel_id}/messages` の処理の中で AI が自己訂正を行い、必要に応じて次回以降に守るべきルールを抽出して保存する。

## 6. 仕様一覧

- [UI仕様（共通）](./specs/ui/common.md)
  - 画面初期表示、クライアント通信、UIの責務とAPI依存を扱う。
- [API仕様（共通）](./specs/api/common.md)
  - Hono API の責務、エンドポイント一覧、リクエスト起点の処理責務を扱う。
- [DB仕様（共通）](./specs/db/common.md)
  - データモデル、永続化責務、ベクトル検索対象を扱う。
- [基盤仕様（共通）](./specs/infra/common.md)
  - Docker 構成、PostgreSQL + `pgvector`、Hono API サーバーの実行、外部接続前提を扱う。

## 7. 参照方針

- UI仕様の正本は [UI仕様（共通）](./specs/ui/common.md) とする。
- API定義の正本は [API仕様（共通）](./specs/api/common.md) とする。
- データモデルの正本は [DB仕様（共通）](./specs/db/common.md) とする。
- 技術基盤と構成前提の正本は [基盤仕様（共通）](./specs/infra/common.md) とする。
