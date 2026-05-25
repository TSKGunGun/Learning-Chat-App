# Learning-Chat-App

自己学習型 AI チャットシステムのモノレポです。UI は `ui/`、API は `api/`、仕様の正本は `docs/` 配下で管理します。

## リポジトリ構成

```text
.
├── api/   # Hono + TypeScript API
├── docs/  # 仕様書と OpenAPI
└── ui/    # Vite + React UI
```

- 仕様の入口: [`docs/spec.md`](./docs/spec.md)
- OpenAPI の正本: [`docs/specs/api/openapi/openapi.yaml`](./docs/specs/api/openapi/openapi.yaml)

## セットアップ

LBO-45 で追加されるローカル DB 起動フローは、リポジトリルートを起点に使う想定です。

### 1. 環境変数を作成する

```bash
cp .env.example .env
```

`.env.example` には次の初期値が入っています。

```dotenv
POSTGRES_DB=learning_chat_app
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_PORT=5432
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/learning_chat_app
PORT=3000
OPENAI_API_KEY=
OPENAI_CHAT_MODEL=gpt-4o
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
```

必要に応じて `.env` を編集し、ローカル環境に合わせて更新してください。`DATABASE_URL` と OpenAI 関連の値は、次工程の API 接続実装に向けたプレースホルダです。

### 2. PostgreSQL + pgvector を起動する

```bash
docker compose config
docker compose up -d
docker compose ps
```

停止するときは次を使います。

```bash
docker compose down
```

### 3. pgvector を確認する

`docker compose up -d` 実行後、`docker compose ps` で `db` サービスが起動していることを確認してから、`pgvector` 拡張が有効かを確認します。

```bash
docker compose exec db sh -lc 'pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB"'
docker compose exec db sh -lc 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT extname FROM pg_extension WHERE extname = '\''vector'\'';"'
docker compose exec db sh -lc 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT '\''[1,2,3]'\''::vector <-> '\''[1,2,4]'\''::vector;"'
```

`vector` 拡張が表示され、距離計算の SQL が実行できれば `pgvector` の確認は完了です。

### 4. パッケージをセットアップする

このリポジトリはワークスペース一括管理ではないため、各パッケージごとに依存関係をインストールします。

```bash
cd ui
npm install
cd ../api
npm install
```

## 現在の API 実装状況

`api/` はまだ scaffold 段階です。DB を起動しても、現在の API エンドポイント実装は既存どおり `501 Not Implemented` を返す前提です。

- OpenAPI を正本として型とルーティングの土台を管理しています
- `401` や `400` の入力系検証は一部入っています
- 業務ロジックや DB 永続化はまだ実装途中です

そのため、LBO-45 の DB 起動はローカル基盤の準備であり、現時点では API の scaffold 挙動自体は変わりません。

`DATABASE_URL` は `.env.example` に追加されていますが、LBO-45 の段階では `api/` runtime からまだ参照していません。

## API バリデーションコマンド

既存の `api/` 検証コマンドは次のとおりです。

```bash
cd api
npm run generate:openapi-types
npm run tsc
npm run lint
npm run build
npm run test
```

`test` は `cross-env TMPDIR=.tmp vitest run` を実行します。

## 関連ドキュメント

- [`docs/spec.md`](./docs/spec.md)
- [`docs/specs/infra/common.md`](./docs/specs/infra/common.md)
- [`api/AGENTS.md`](./api/AGENTS.md)
