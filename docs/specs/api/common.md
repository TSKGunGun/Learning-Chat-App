# 自己学習型AIチャットシステム API仕様（共通）

## 1. この文書の対象範囲

本書は、自己学習型AIチャットシステムにおけるAPI共通仕様を定義する。Hono API の責務、エンドポイント一覧、各リクエスト起点で実行される処理の範囲を扱う。

全体概要は [../../spec.md](../../spec.md)、データ永続化の正本は [../db/common.md](../db/common.md)、処理基盤の正本は [../infra/common.md](../infra/common.md) を参照する。

## 2. APIの責務

APIは、UIからのリクエストを受け取り、チャット履歴取得、回答生成、訂正受付の入口として振る舞う。

- UI向けのHTTPエンドポイントを公開する
- 履歴取得要求を受けてチャットデータを返す
- メッセージ送信要求を受けて回答生成処理を起動する
- 訂正送信要求を受けてルール抽出と保存処理を起動する

採用技術は Node.js、Hono、TypeScript とする。Hono はフレームワーク層として扱い、API はクリーンアーキテクチャにおける入口層とする。

## 3. レイヤー責務

API まわりは、以下の責務分離を前提とする。

- Controller は入力検証と Use Case 呼び出しの調停に限定し、業務ロジックを持たない
- Use Case は 1 操作 1 責務とし、他の Use Case を直接束ねない
- Use Case は Repository や外部 Service の抽象に依存する
- Infrastructure は DB、OpenAI API、LangChain.js など外部依存の具象実装を吸収する
- Presenter や出力変換層で、UI や外部公開向けの出力形式へ整える

Hono 固有の request / response は境界 DTO に変換して扱い、内側の層へ直接漏らさない。

## 4. エンドポイント定義

APIエンドポイントの正本は本章とする。

| メソッド | エンドポイント | 用途 | 実行元 |
| --- | --- | --- | --- |
| `GET` | `/api/chats` | 過去のチャット履歴一覧の取得 | サーバーサイド (RSC) |
| `POST` | `/api/chats/message` | 新規メッセージの送信（回答生成の起動） | クライアントサイド |
| `POST` | `/api/chats/correct` | AI回答に対する訂正の送信（ルール抽出・保存処理の起動） | クライアントサイド |

## 5. リクエストごとの処理責務

### `GET /api/chats`

- 過去のチャット履歴一覧を返す
- UIの初期表示で利用される
- 返却対象となる永続化データの詳細は [../db/common.md](../db/common.md) を参照する

### `POST /api/chats/message`

- 新規メッセージを受け取る
- 回答生成処理を起動する
- 回答生成では、基盤側で埋め込み生成、類似ルール検索、プロンプト構築、LLM実行を行う
- ルール検索対象となるデータの詳細は [../db/common.md](../db/common.md) を参照する
- 実行基盤の詳細は [../infra/common.md](../infra/common.md) を参照する

### `POST /api/chats/correct`

- AI回答に対する訂正内容を受け取る
- 訂正内容をもとにルール抽出とベクトル保存処理を起動する
- 保存対象となるデータの詳細は [../db/common.md](../db/common.md) を参照する
- ルール抽出と埋め込み生成の基盤詳細は [../infra/common.md](../infra/common.md) を参照する

## 6. UIとのインターフェース前提

APIは以下の前提でUIから利用される。

- 初期データ読み込みは RSC 経由で行う
- メッセージ送信と訂正送信は Client Components から行う
- `hono/rpc` を通じてフロントエンドと型共有できる構成を前提とする
