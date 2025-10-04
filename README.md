# Retro Homepage Builder (Next.js)

Next.js + Supabase ベースのレトロ個人サイト作成サービス。日記投稿と公開ページをモダンなスタックで構築するためのスタートキットです。

## ✅ セットアップ手順

1. **依存ライブラリをインストール**
   ```bash
   npm install
   ```
2. **環境変数を設定**
   ```bash
   cp .env.example .env.local
   # Supabase プロジェクトの URL / キーを入力
   ```
3. **開発サーバーを起動**
   ```bash
   npm run dev
   ```
4. ブラウザで `http://localhost:3000` を開く

## 📁 主なディレクトリ

- `app/` : Next.js App Router。`(auth)`や`(dashboard)`などセグメントで整理。
- `lib/` : Supabase クライアントなど共有ロジック。
- `styles/` : Tailwind を読み込むグローバルスタイル。

## 🔌 Supabase 連携

- 認証: `@supabase/auth-helpers-nextjs`
- データストア: Postgres (`diary_entries` テーブルを準備予定)
- Storage: 画像アップロード（JPEG/PNG 自動圧縮 → 長辺1280px / 約300KB）

## 🗺️ 次のステップ

- フェーズ1: Supabase へ `diary_entries` テーブルを追加
  - `supabase/migrations/0001_diary_entries.sql` を Supabase CLI (`supabase db push`) で適用
  - Supabase CLI がない場合は `supabase/README.md` の手順でSQLエディタから実行
- フェーズ2: `/api/diary` など API Route の実装
- フェーズ3: ダッシュボード UI と公開ページの具体化

`retro-homepage-requirements/開発タスク一覧.md` に詳細タスクがまとまっています。順に進めれば手戻りを最小化できます。
