# 自己学習型AIチャットシステム 基盤仕様（共通）

## 1. この文書の対象範囲

本書は、自己学習型AIチャットシステムにおける基盤共通仕様を定義する。Docker を用いたローカル実行構成、PostgreSQL + `pgvector` の実行基盤、Hono で構築した API サーバーの実行前提、および外部接続の前提を扱う。

アプリケーション概要、ディレクトリ構成、全体フローは [../../spec.md](../../spec.md) を参照する。

## 2. ローカル基盤の方針

ローカル開発環境では、アプリケーション実行に必要な基盤を分離して構成する。

- データベースは Docker で起動する
- API サーバーは Hono を用いた Node.js アプリケーションとして実行する
- UI から API サーバーへ接続し、API サーバーからデータベースおよび外部 AI サービスへ接続する

## 3. Docker 構成

ローカルでは `docker-compose.yml` を用いて PostgreSQL + `pgvector` を起動する前提とする。

- PostgreSQL はチャット履歴と訂正ルールの永続化を担う
- `pgvector` は訂正ルール埋め込みの類似度検索を担う
- API サーバーは Docker 上のデータベースへ接続して動作する

永続化データの詳細は [../db/common.md](../db/common.md) を参照する。

## 4. API サーバー実行基盤

バックエンドは Hono を用いた API サーバーとして実行する。

- API サーバーは Node.js 実行環境上で動作する
- UI からの `POST /api/auth/login`、`GET /api/chats`、`POST /api/chats`、`GET /api/chats/{channel_id}`、`DELETE /api/chats/{channel_id}`、`POST /api/chats/{channel_id}/messages`、`POST /api/chats/{channel_id}/messages/{message_id}/feedback` を受け付ける
- API サーバーはデータベースと外部 AI サービスへ接続して動作する
- API エンドポイントの正本は [../api/common.md](../api/common.md) を参照する

## 5. 外部接続前提

API サーバーは以下の外部接続を前提とする。

- PostgreSQL + `pgvector`: チャット履歴と訂正ルールの保存、類似度検索
- OpenAI API: チャット回答生成、ルール要約、埋め込み生成
