# UI AGENTS.md

## 目的

`ui` は自己学習型AIチャットシステムのフロントエンド実装を担当する。
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
- `framework`: ルーティング、アプリ起動、画面エントリーポイント、route 専用 hook
- UI / presentation 層では責務ごとにディレクトリを分ける
- `presentation`: 表示層のルートディレクトリ
- `presentation/atoms`: 最小単位の UI 部品
- `presentation/molecules`: 複数 atom を組み合わせた小さな UI
- `presentation/organisms`: 機能的なまとまりを持つ UI ブロック
- `presentation/templates`: 画面レイアウトの骨組み
- `presentation/pages`: ページ単位の UI 構成と page state UI
- `interface-adapters`: Controller、Presenter、ViewModel 変換
- `interface-adapters/view-models`: Presenter 出力としての画面向け ViewModel
- `application`: Use Case、アプリケーション境界の型、抽象
- `entities`: Entity、Value Object、業務ルール
- `infrastructure`: API クライアントなど外部依存の実装
- `di`: 依存解決
- `shared`: 純粋なユーティリティと framework 非依存の汎用物

## 実装ルール

- 依存方向は外側から内側への一方向を守る
- 業務ロジックを `atoms`、`molecules`、`organisms` に直接持ち込まない
- 画面固有のデータ取得や API 呼び出しは UI コンポーネントに閉じず、レイヤー境界を守る
- 内部 DTO や永続化都合のデータをそのまま表示層へ渡さない
- UI ルーティングは `react-router-dom` を利用し、`/` と `/login` を最小ルートとして維持する
- route 定数や route 専用 hook は `framework` に置き、`shared` に routing 関心を混ぜない
- ViewModel は `interface-adapters/view-models` に置き、`shared` に表示専用型を混ぜない
- `presentation/pages` は router API を直接参照せず、必要な navigation 情報は `framework` から props で受け取る
- `shadcn/ui` は必要なコンポーネントを `atoms` 配下へ取り込んで育てる
- トップ画面は左サイドバーのチャット一覧と右チャット画面の 2 ペイン構成を前提とする
- モバイル時はチャット一覧をドロワー表示とし、右チャット画面を主表示とする
- `status = pending` の AI メッセージが存在する間は追加送信を無効化する
- `sender_type = ai` かつ `status = completed` のメッセージにのみフィードバック UI を表示する

## 完了条件

エージェント実行の完了条件は、`ui` で以下がすべて通ることとする。

- `npm run build`
- `npm run tsc`
- `npm run lint`
- `npm run test`
