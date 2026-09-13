# データベース (Cloudflare D1)

肉体副業は Cloudflare D1（SQLite）を使います。無料枠の範囲で運用します。

## 初期セットアップ

```bash
# 1. D1 データベースを作る
npx wrangler d1 create nikutai-fukugyou

# 2. 出力された database_id を wrangler.jsonc の
#    d1_databases[0].database_id に貼る

# 3. スキーマを適用
npm run db:migrate:local    # 手元の開発用
npm run db:migrate:remote   # 本番
```

## マイグレーション

`db/migrations/` に連番で SQL を置きます。`wrangler d1 migrations apply` が
適用済みを記録するので、同じファイルが二重に適用されることはありません。

既存の列を壊す変更は避け、追加で対応してください
（`expired` / `closed` の行を残す方針のため。docs/02_DECISIONS.md D-004）。

## 中身を見る

```bash
npm run db:console -- "select status, count(*) from listings group by status"
```

## Postgres との違い（スキーマを読むときの注意）

SQLite なので、以下は Postgres 版と表現が違います。

| 概念 | この DB での持ち方 |
| --- | --- |
| enum | TEXT + CHECK 制約 |
| uuid | TEXT（アプリ側で `crypto.randomUUID()` を採番） |
| text[] | TEXT（JSON 配列の文字列） |
| timestamptz | TEXT（ISO 8601 / UTC） |
| boolean | INTEGER 0/1。**NULL は「記載を確認できず」という第3の状態**（D-011） |

変換は `lib/db/rows.ts` に閉じています。ここを通さずに行を直接使わないでください。

## アクセス経路

| 経路 | ドライバ | 用途 |
| --- | --- | --- |
| Worker 内 | `lib/db/binding.ts`（D1 binding） | 公開ページ / `/admin` / `/api/track` |
| Node スクリプト | `lib/db/http.ts`（D1 REST API） | `npm run ops:*` / GitHub Actions |

ブラウザから DB を直接触ることはありません。Supabase の RLS に相当する保護は
「DB アクセスはすべてサーバ側」という構造で担保しています
（docs/08_ARCHITECTURE.md §3 rule 11）。

## 無料枠

| 項目 | 無料枠 | 想定 |
| --- | --- | --- |
| ストレージ | 5 GB | 年単位でも 100MB 未満の見込み |
| 行読み取り | 500万/日 | 1日数千 PV でも桁違いに余裕 |
| 行書き込み | 10万/日 | 計測イベントが主。1日数千程度 |

2026年9月1日から無料枠の上限超過時にクエリが失敗するようになっています。
`analytics_events` と `source_checks` は `docs/05_OPERATIONS.md` の手順で
定期的に間引いてください。
