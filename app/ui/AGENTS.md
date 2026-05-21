# UI AGENTS.md

## 目的

`app/ui` は自己学習型AIチャットシステムのフロントエンド実装を担当する。
詳細仕様の正本は以下を参照する。

- `/home/sueda/Lbose/Learning-Chat-App/docs/spec.md`
- `/home/sueda/Lbose/Learning-Chat-App/docs/specs/ui/common.md`
- `/home/sueda/Lbose/Learning-Chat-App/docs/specs/ui/pages/top.md`
- `/home/sueda/Lbose/Learning-Chat-App/docs/specs/ui/pages/login.md`
- `/home/sueda/Lbose/Learning-Chat-App/docs/specs/api/openapi/openapi.yaml`

## 技術方針

- フロントエンドは `Vite` を利用する
- `TypeScript` を採用する
- クリーンアーキテクチャを採用する
- UI コンポーネントは `Atomic Design` を採用する
- CSS は `Tailwind CSS` を利用する
- UI コンポーネントは `shadcn/ui` を利用し、`atoms` として扱う
- アイコンは `lucide-react` を利用する
- HTTP 通信では `axios` を使用せず、標準の `fetch` を利用する

## ディレクトリと責務

- フレームワーク層は Vite ベースの UI エントリーポイントとして扱う
- `app`: ルーティング、アプリ起動、画面エントリーポイント
- UI / presentation 層では責務ごとにディレクトリを分ける
- `atoms`: 最小単位の UI 部品
- `molecules`: 複数 atom を組み合わせた小さな UI
- `organisms`: 機能的なまとまりを持つ UI ブロック
- `templates`: 画面レイアウトの骨組み
- `pages`: ページ単位の UI 構成
- `interface-adapters`: Controller、Presenter、ViewModel 変換
- `application`: Use Case、アプリケーション境界の型、抽象
- `entities`: Entity、Value Object、業務ルール
- `infrastructure`: API クライアントなど外部依存の実装
- `di`: 依存解決
- `shared`: ルート定数、ユーティリティ、共通型

## 実装ルール

- 依存方向は外側から内側への一方向を守る
- 業務ロジックを `atoms`、`molecules`、`organisms` に直接持ち込まない
- 画面固有のデータ取得や API 呼び出しは UI コンポーネントに閉じず、レイヤー境界を守る
- 内部 DTO や永続化都合のデータをそのまま表示層へ渡さない
- UI ルーティングは `react-router-dom` を利用し、`/` と `/login` を最小ルートとして維持する
- `shadcn/ui` は必要なコンポーネントを `atoms` 配下へ取り込んで育てる
- トップ画面は左サイドバーのチャット一覧と右チャット画面の 2 ペイン構成を前提とする
- モバイル時はチャット一覧をドロワー表示とし、右チャット画面を主表示とする
- `status = pending` の AI メッセージが存在する間は追加送信を無効化する
- `sender_type = ai` かつ `status = completed` のメッセージにのみフィードバック UI を表示する

## 完了条件

エージェント実行の完了条件は、`app/ui` で以下がすべて通ることとする。

- `npm run build`
- `npm run tsc`
- `npm run lint`
- `npm run test`
