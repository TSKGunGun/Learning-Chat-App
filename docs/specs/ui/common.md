# 自己学習型AIチャットシステム UI仕様（共通）

## 1. この文書の対象範囲

本書は、自己学習型AIチャットシステムにおけるUI共通仕様を定義する。画面初期表示、ユーザー操作、クライアント通信、および表示観点で必要なAPI依存を扱う。

全体概要は [../../spec.md](../../spec.md)、APIの正本は [../api/common.md](../api/common.md) を参照する。

## 2. UIの責務

UIは、ユーザー向け画面の提供と、初期表示およびユーザー操作に応じたバックエンドAPI呼び出しを担う。

- チャット画面または履歴画面の初期表示
- チャット送信操作の受付
- 訂正送信操作の受付
- バックエンドから返却された結果の表示

採用技術は Next.js (App Router) と TypeScript とし、React Server Components と Client Components を役割に応じて使い分ける。Next.js は UI のフレームワーク層として扱い、アプリケーションの中心に置かない。

- CSS は Tailwind CSS を利用する
- UI コンポーネントは `shadcn/ui` を利用する
- アイコンは `lucide-react` を利用する
- HTTP 通信では `axios` は使用せず、Next.js 標準の `fetch` を利用する

- Server Components と Client Components は、表示責務とエントリーポイント責務に集中する
- 画面層は業務ロジックを直接持たず、調停層と Use Case を経由して処理する
- 内部 DTO や永続化都合のデータは、そのまま表示層へ渡さない

## 3. 画面一覧

| 画面名 | URL | 仕様ファイル |
| --- | --- | --- |
| トップ画面 | `/` | [top.md](./pages/top.md) |
| ログイン画面 | `/login` | [login.md](./pages/login.md) |
| チャットモーダル | `/` 上のモーダル | [chat-modal.md](./pages/chat-modal.md) |

## 4. 初期データ読み込み

ユーザーがチャット画面または履歴画面にアクセスした際、Next.js の React Server Components (RSC) を使用してバックエンドAPIを呼び出す。

- 過去のチャットセッション履歴や初期設定データを取得する
- 取得結果はレンダリング済みのHTMLとしてブラウザに返す
- ローディング状態を極力排除する

この初期取得で利用するAPIの正本は、[../api/common.md](../api/common.md) に定義された `GET /api/chats` とする。

## 5. UIのレイヤー構成

UI は、クリーンアーキテクチャに基づき以下の責務分離を前提とする。

- フレームワーク層: `app` 相当。Next.js 固有のページ、レイアウト、Server Components、Client Components、Server Actions を置く
- `interface-adapters`: Controller、Presenter、入力変換、画面向け ViewModel 変換を担う
- `application`: Use Case、アプリケーション境界の型、Repository や Service の抽象を置く
- `entities`: Entity、Value Object、変わりにくい業務ルールを置く
- `infrastructure`: DB や外部 API など外部依存の実装を置く
- `di`: 依存解決とバインド設定を置く

依存方向は外側から内側への一方向とし、フレームワーク層から DB 実装や SDK 実装を直接参照しない。

## 6. メッセージ送信

ユーザーのメッセージ送信は、Client Components からバックエンドAPIへリクエストを行う。

- 通信はクライアントサイドで行う
- 実装例として SWR 等の利用を想定する
- バックエンドから返却されたAI回答をチャットUIへ反映する

この送信で利用するAPIの正本は、[../api/common.md](../api/common.md) に定義された `POST /api/chats/message` とする。

## 7. 訂正送信

ユーザーがAI回答に対して訂正内容を送信できるようにする。

- 訂正操作はクライアントサイドからバックエンドAPIへ送信する
- UIは入力受付と結果表示を担う
- ルール抽出や保存処理自体はバックエンド側で実行する

この送信で利用するAPIの正本は、[../api/common.md](../api/common.md) に定義された `POST /api/chats/correct` とする。

## 8. 認証画面の前提

ログイン画面では、バックエンドのログイン API を用いて認証を行う。

- 入力は `username` と `password` のみとする
- 認証方式は Cookie セッションとする
- ログイン成功後、UI は `/` へリダイレクトする

詳細は [login.md](./pages/login.md) を参照する。

## 9. 境界ルール

Next.js 固有 API はフレームワーク層の境界で止める。

- `redirect`、`revalidatePath`、`cookies()`、`headers()`、Server Action の `FormData` などは内側へ漏らさない
- Next.js 固有型は Use Case や Entity の公開面に持ち込まない
- UI に返す値は Presenter / ViewModel で整形し、Entity や永続化モデルをそのまま返さない

## 10. API・基盤への依存

UIは以下の前提に依存する。

- Hono ベースのAPIが利用可能であること
- `hono/rpc` を通じて型安全にインターフェース共有できること
- チャット回答生成はバックエンド側でRAGを実行した結果として返却されること
- 訂正送信後の自己学習処理はバックエンド側の責務であること

処理基盤の詳細は [../infra/common.md](../infra/common.md) を参照する。
