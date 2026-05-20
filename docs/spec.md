# 自己学習型AIチャットシステム 仕様書

## 1. 概要

本システムは、ユーザーの入力やフィードバック（訂正）を動的に学習し、同じ間違いを繰り返さない「自己学習型AIチャットボット」の概念実証（PoC）モデルである。
LLM自体のパラメータ更新は行わず、LangChain.js を用いた自己反省（Self-Reflection）によるルール抽出と、PostgreSQL（pgvector）を用いた検索拡張生成（RAG）を組み合わせることで、擬似的な継続的学習を実現する。

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

1. ユーザーがチャット画面または履歴画面にアクセスする。
2. UI は RSC 経由で API を呼び出し、初期データを取得する。
3. ユーザーがメッセージを送信すると、API が回答生成処理を起動する。
4. 基盤側では、過去の訂正ルールを参照し、ルールを踏まえた回答を生成する。
5. ユーザーが訂正を送信した場合、基盤側では次回以降に守るべきルールを抽出し、ベクトル化して保存する。

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
