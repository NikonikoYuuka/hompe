# Supabase セットアップ手順

## 1. テーブル作成（SQLエディタ）
1. Supabaseプロジェクトにログインし、左メニューの **SQL** を開く。
2. 「新しいクエリ」を選び、`supabase/migrations/0001_diary_entries.sql` の内容をコピー＆ペースト。
3. 「実行」を押してテーブル・ポリシーを作成する。

> Supabase CLI (`supabase db push`) が環境に無い場合は、この手順で同じ結果が得られます。

## 2. ストレージバケット
1. 左メニューの **Storage** → **Create bucket** を選択。
2. バケット名を `.env.local` に合わせて `diary-images` とし、公開設定は `public` を推奨。

## 3. RLSポリシーの確認
- `diary_entries` テーブルを開き、`Policies` タブで `diary_owner_rw` と `diary_public_read` が作成されていることを確認。

## 4. 確認後のNext.js側作業
- `npm run dev` で開発サーバーを起動し、APIやUIの実装に進みます。
