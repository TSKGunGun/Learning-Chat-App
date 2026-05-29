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
PGADMIN_PORT=5050
PGADMIN_DEFAULT_EMAIL=admin@example.com
PGADMIN_DEFAULT_PASSWORD=admin
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/learning_chat_app
SESSION_TTL_SECONDS=604800
BCRYPT_SALT_ROUNDS=10
SEED_DEV_USERNAME=dev-user
SEED_DEV_PASSWORD=dev-password
PORT=3000
OPENAI_API_KEY=
OPENAI_CHAT_MODEL=gpt-4o
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
```

必要に応じて `.env` を編集し、ローカル環境に合わせて更新してください。`DATABASE_URL` は Drizzle migration / seed に加えて `api/` runtime でも参照します。`SESSION_TTL_SECONDS` はセッション Cookie の有効期限と DB 保存セッションの TTL に使います。`SEED_DEV_USERNAME` / `SEED_DEV_PASSWORD` は開発用初期ユーザー投入に使い、保存時は `BCRYPT_SALT_ROUNDS` を使って bcrypt hash に変換します。

### 2. PostgreSQL + pgvector + PGAdmin を起動する

```bash
docker compose config
docker compose up -d
docker compose ps
```

停止するときは次を使います。

```bash
docker compose down
```

起動後は次の URL から PGAdmin にアクセスできます。

- PGAdmin: `http://localhost:5050`

ログインには `.env` の `PGADMIN_DEFAULT_EMAIL` / `PGADMIN_DEFAULT_PASSWORD` を使います。ログイン後は `Learning Chat App Local` があらかじめ表示されるので、接続時に `.env` の `POSTGRES_PASSWORD` を入力してください。

### 3. pgvector を確認する

`docker compose up -d` 実行後、`docker compose ps` で `db` と `pgadmin` サービスが起動していることを確認してから、`pgvector` 拡張が有効かを確認します。

```bash
docker compose exec db sh -lc 'pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB"'
docker compose exec db sh -lc 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT extname FROM pg_extension WHERE extname = '\''vector'\'';"'
docker compose exec db sh -lc 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT '\''[1,2,3]'\''::vector <-> '\''[1,2,4]'\''::vector;"'
```

`vector` 拡張が表示され、距離計算の SQL が実行できれば `pgvector` の確認は完了です。GUI から確認する場合は PGAdmin の Query Tool で `SELECT extname FROM pg_extension WHERE extname = 'vector';` を実行してください。

### 4. パッケージをセットアップする

このリポジトリはワークスペース一括管理ではないため、各パッケージごとに依存関係をインストールします。

```bash
cd ui
npm install
cd ../api
npm install
```

### 5. 認証用テーブルを作成し、開発用ユーザーを投入する

`api/` では Drizzle schema と SQL migration を併用して `users` / `sessions` テーブルを管理します。

```bash
cd api
npm run db:migrate
npm run db:seed
```

`db:seed` は `.env` の `SEED_DEV_USERNAME` / `SEED_DEV_PASSWORD` を読み取り、平文ではなく `bcrypt` hash を `users.password_hash` に保存します。あわせて、そのユーザーに紐づく既存 `sessions` を削除して、開発環境の認証状態をリセットできるようにしています。

### 6. UI と API を起動する

未認証リダイレクトとログイン導線を確認するには、UI だけでなく API も同時に起動する必要があります。

リポジトリルートで次を実行してください。

```bash
npm run dev
```

- UI: `http://localhost:5173`
- API: `http://localhost:3000`

個別に起動する場合は次を使います。

```bash
npm run dev:api
npm run dev:ui
```

## 現在の API 実装状況

`api/` はまだ一部 scaffold 段階です。今回の段階では Drizzle + PostgreSQL の永続化基盤、`users` / `sessions` テーブル、`POST /api/auth/login` の認証処理、認証必須 route の session 解決を実装しています。一方で chat / message の業務ロジックは既存どおり `501 Not Implemented` を返します。

- OpenAPI を正本として型とルーティングの土台を管理しています
- `401` や `400` の入力系検証に加えて、`POST /api/auth/login` は `users.password_hash` と `sessions` を使って動作します
- chat / message の業務ロジックや対応テーブルの runtime 永続化はまだ実装途中です

そのため、DB 起動後は `db:migrate` / `db:seed` で認証基盤を準備したうえで login 導線を確認できますが、chat / message 系 API は引き続き別工程です。

## API バリデーションコマンド

既存の `api/` 検証コマンドは次のとおりです。

```bash
cd api
npm run generate:openapi-types
npm run db:migrate
npm run db:seed
npm run tsc
npm run lint
npm run build
npm run test
```

`test` は `cross-env TMPDIR=.tmp vitest run` を実行します。

`npm run db:generate` は `api/src/db/schema.ts` を更新したあとに migration を再生成するためのメンテナ用コマンドです。

## 関連ドキュメント

- [`docs/spec.md`](./docs/spec.md)
- [`docs/specs/infra/common.md`](./docs/specs/infra/common.md)
- [`api/AGENTS.md`](./api/AGENTS.md)
