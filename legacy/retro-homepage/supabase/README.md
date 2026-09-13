# Supabase セットアップ手順

## 1. テーブル作成

肉体副業で使うのは `0002_nikutai_fukugyou.sql` です。

1. Supabase プロジェクトにログインし、左メニューの **SQL Editor** を開く。
2. 「New query」を選び、`supabase/migrations/0002_nikutai_fukugyou.sql` の内容を貼り付けて実行する。

Supabase CLI がある場合は `supabase db push` でも適用できます。

> `0001_diary_entries.sql` は、このリポジトリに元々あった別プロダクト
> (Retro Homepage Builder) 用です。肉体副業のプロジェクトでは適用不要です
> （`legacy/README.md`）。

## 2. 環境変数

`.env.example` を `.env.local` にコピーし、以下を設定します。

| 変数 | 用途 |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | 公開側・管理側の両方 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 公開中 Listing の読み取りと計測の書き込み |
| `SUPABASE_SERVICE_ROLE_KEY` | `/admin` と運用スクリプト（RLS を bypass するのでサーバ側限定） |
| `ADMIN_TOKEN` | `/admin` に入るための共有トークン |

## 3. RLS ポリシーの確認

`0002` を適用すると、次の状態になります。

| テーブル | anon key でできること |
| --- | --- |
| `listings` | `status = 'active'` の行の **読み取りのみ** |
| `analytics_events` | **insert のみ**（読み取り不可） |
| `sources` | なし（policy を作っていないので全拒否） |
| `source_checks` | なし |

`/admin` と `scripts/` は service role key を使うため RLS の影響を受けません。
service role key をブラウザに渡さないこと。

## 4. 初期データ

```bash
cp sources/seed/sources.example.json sources/seed/sources.json
# Source Gate を確認しながら編集（docs/03_SOURCE_POLICY.md）
npm run ops:seed
npm run ops:check
npm run ops:extract
```

## 5. 無料枠について

初期規模は 50〜100 Source / Listing 程度を想定しています（`docs/01_VALIDATION.md`）。
行数が伸びるのは `analytics_events` と `source_checks` だけなので、
週次 metrics を記録したあとに古い行を間引けば無料枠で足ります。
