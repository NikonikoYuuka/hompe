# 07. MVP V0.1 — SCOPE / ARCHITECTURE / GAP

---

## 0. REPOSITORY AUDIT（実装前調査の結果）

| 項目 | 現状 |
| --- | --- |
| リポジトリ | `NikonikoYuuka/hompe` |
| 既存プロダクト | **Retro Homepage Builder**（2000年代風・個人ホームページ作成 SaaS の scaffold） |
| framework | Next.js 14.1 App Router / React 18 / TypeScript (strict) |
| package manager | npm（`package-lock.json` あり） |
| styling | Tailwind CSS 3.4 + `styles/globals.css` |
| DB | Supabase (Postgres)。`supabase/migrations/0001_diary_entries.sql` に `diary_entries`（肉体副業では使わない） |
| auth | `@supabase/auth-helpers-nextjs`（`lib/supabase-client.ts`。server client の呼び出しは未完成） |
| hosting / CI/CD | 設定なし |
| tests | なし |
| env | `.env.example`（Supabase URL / anon / service role / storage bucket / 画像圧縮設定） |
| 既存ページ | `/`（retro TOP）, `/login`, `/signup`, `/dashboard`, `/diary`, `/api/diary`（いずれも placeholder） |
| 未完了作業 | diary の API / UI 実装、`lib/image.ts` は placeholder |

### GAP 分析

**既存リポジトリは肉体副業とは別プロダクトである。** 再利用できるのは
プロダクト機能ではなく **技術基盤**（Next.js App Router / TypeScript / Tailwind / npm）。
DB とホスティングは Cloudflare（Workers + D1）へ差し替えた（D-020）。

| 仕様要件 | 既存コード | 判断 |
| --- | --- | --- |
| Next.js + TS + Tailwind | あり | **そのまま再利用**。framework migration はしない |
| DB | Supabase (Postgres) | **採用しない**。Cloudflare D1（SQLite）へ差し替え（D-020）。`db/migrations/0001_nikutai_fukugyou.sql` |
| DB クライアント | `lib/supabase-client.ts`（auth-helpers、server client の引数が不正） | 使わない。`lib/db.ts` で D1 binding / REST API の2ドライバを抽象化 |
| Source crawl / 変更検知 | なし | 新規（`lib/source-check.ts` + `scripts/`） |
| Listing / Source / Check スキーマ | なし | 新規 migration `0002` |
| Admin | なし | 新規（`/admin`、`ADMIN_TOKEN` 共有トークン [D-015]） |
| Analytics | なし | 新規（`analytics_events` + `/api/track`） |
| 画像処理 (`sharp`) | 依存あり | **V0.1 では使わない**。依存は残す（既存 diary 用） |
| AdSense | なし | 新規（`lib/ads.ts` + `AdSlot`）。ID は環境変数のみ |
| hosting / CI・CD | 設定なし | 新規。Cloudflare Workers + GitHub Actions（`08_ARCHITECTURE.md` §4） |

### 既存コードの扱い

- `app/page.tsx` / `app/layout.tsx` は肉体副業のものに置き換える（この branch のプロダクトは肉体副業）。
- retro homepage の scaffold（`(auth)` / `(dashboard)` / `api/diary` / `lib/image.ts` / 旧 TOP）は
  削除せず `legacy/retro-homepage/` に退避し、`legacy/README.md` に経緯を残す。
  → 別リポジトリへ分離する際に復元できる。
- `supabase/` 一式（diary の migration 含む）は `legacy/retro-homepage/supabase/` へ退避。
  肉体副業のスキーマは `db/migrations/`（`db/README.md`）。

> **注意（未確定事項）**: ユーザーは「まだリポジトリを新しく作っていない」と述べている。
> 肉体副業を専用リポジトリへ分離する場合、`docs/` `lib/` `sources/` `scripts/` `db/`
> `app/` `wrangler.jsonc` `open-next.config.ts` `.github/` をそのまま移せる構成にしてある。

---

## 1. V0.1 SCOPE（実装するもの）

### DB

`db/migrations/0001_nikutai_fukugyou.sql`（Cloudflare D1 / SQLite）

| table | 役割 |
| --- | --- |
| `sources` | Fact 取得元。grade / terms / adapter / 巡回状態 |
| `listings` | 確定 Fact + lifecycle + editorial_note |
| `source_checks` | 巡回ログ（status / hash / changed / error / attempt） |
| `analytics_events` | `page_view` / `listing_view` / `official_source_click` |

`listing_tags` は作らない（`purpose_tags text[]` / `safety_flags text[]` で足りる。不要な正規化をしない）。

### Source 巡回（Code First / AI なし）

```
sources/registry.ts ──> sources/generic.ts (adapter)
lib/http.ts        fetch + retry + timeout
lib/normalize.ts   HTML normalize + sha256
lib/source-check.ts  1 source を1回チェックする純粋な手続き
```

### Rule extraction（AI なし）

```
lib/extract/jsonld.ts    JobPosting / Event の構造化データ
lib/extract/patterns.ts  pay / dates / hours / deadline / address / qualification
lib/extract/index.ts     Extracted<T> = { value, confidence, evidence } | null
lib/eligibility.ts       work content ベースの physical_work 判定 + category
lib/side-job.ts          働き方の軸。正規雇用を除外する (D-026)
lib/safety.ts            safety_flags
lib/lifecycle.ts         expired / closed 判定
```

確信できない場合は **推論しない → `review_required`**。

### Scripts（週次運用）

| command | 対応する曜日 |
| --- | --- |
| `npm run ops:check` | 月〜水 |
| `npm run ops:lifecycle` | 月〜水（日次可） |
| `npm run ops:extract` | 木 |
| `npm run ops:weekend` | 金 |
| `npm run ops:metrics` | 週次 |
| `npm run ops:seed` | 初期 Source 投入 |

### Public UI

| route | 内容 |
| --- | --- |
| `/` | Brand concept / 4カテゴリ入口 / 今週末の Listing 導線 |
| `/listings` | 公開中 Listing 一覧 + 最小フィルタ |
| `/listings/[id]` | Fact Layer 中心の詳細 + CTA「公式サイトで詳細を見る」 |
| `/about` | サービス説明 / Source ポリシー / Disclaimer |
| `/privacy` | プライバシーポリシー / Cookie / 外部送信の公表 |

フィルタ（最小）: `category` / `area`(都道府県) / `availability` / `reward`(paid/volunteer) / `qualification`。
複雑な search engine もユーザー適性スコアリングも作らない。

### Admin

| route | 内容 |
| --- | --- |
| `/admin/login` | `ADMIN_TOKEN` 入力 |
| `/admin` | 件数サマリ + 週次 metrics |
| `/admin/review` | `review_required` 一覧 |
| `/admin/listings` | Listing 一覧 / フィルタ |
| `/admin/listings/[id]` | Fact 修正 / status 変更 / publish・unpublish / 肉体副業メモ入力 |
| `/admin/sources` | Source 一覧 + 直近 check 結果 |

高機能 CMS は作らない。

### AdSense (spec §47)

| ファイル | 役割 |
| --- | --- |
| `lib/ads.ts` | 設定と環境ガード。listings を import しない |
| `app/_components/ad-script.tsx` | script を root layout で1回だけ読み込む |
| `app/_components/ad-slot.tsx` | 再利用可能な広告枠（TOP / 一覧 / 詳細 / 将来の記事） |
| `app/ads.txt/route.ts` | ads.txt を環境変数から生成 |
| `app/privacy/page.tsx` | Cookie / 外部送信の公表・オプトアウト導線 |

1ページ1枠まで。未設定なら何も描画しない。詳細は `09_MONETIZATION.md`。

### Analytics

- `POST /api/track`：`page_view` / `listing_view` / `official_source_click`
- 匿名 session id は first-party cookie（ランダム UUID、個人情報なし、有効期限30日）
- Official Source Click は `navigator.sendBeacon` で送信し、リンクは実 URL のまま（リダイレクト迂回をしない）

---

## 2. 実装しないもの

`06_FUTURE_DESIGN.md` の DEFERRED 一覧に従う。特に:
OpenAI API / AI 抽出 / X API 自動投稿 / 記事 CMS / user account / 応募フロー / 汎用 crawler。

---

## 3. RISKS

| risk | 対応 |
| --- | --- |
| Workers の無料枠は1リクエスト CPU 10ms | SSR は主に I/O 待ちで CPU をほぼ使わない。実測で足りなければ公開ページに Cache API を入れる |
| 広告配置が `official_source_click` を下げる | 1ページ1枠、CTA から離す、一覧の中に入れない。数値を metrics で監視する |
| 公式採用ページの HTML 構造が Source ごとにバラバラで rule 抽出が通らない | 目標を「全対応」に置かない。抽出不能は `review_required`。率を実測して AI 導入判断の材料にする |
| ページ全体 hash だと軽微な変更でも `changed` になる | normalize で noise を落とす。それでも多い場合は本文領域の絞り込みを adapter 側で行う（Source 単位で `content_selector` を保持） |
| grade C の Source が多く、自動公開できる件数が伸びない | 想定内。grade A/B の獲得（許可取得・提携）が次の打ち手 |
| 50〜100件で無料枠に収まるか | Cloudflare D1 無料枠内（5GB / 読み 500万行・書き 10万行 per day）。`analytics_events` と `source_checks` のみ行数が伸びるため、週次集計後の間引き手順を `05_OPERATIONS.md` に記載 |
| Demand が出ない | それが V0.1 の検証目的。Official Source Click で判断する |

---

## 4. DEFINITION OF SUCCESS

1. 公式 Source 中心で 50〜100 件規模を管理できる
2. 変更なし Source を AI / 人間が再確認しなくてよい
3. 期限切れ Listing が自動的に公開対象から外れる
4. 曖昧ケースだけ `review_required` になる
5. ユーザーが Listing から公式 Source へ移動できる
6. Official Source Click を計測できる
7. 一週間の運用負荷を測定できる
8. 追加 OpenAI API 費用を発生させない
9. 将来機能のために V0.1 を過剰設計しない
10. Phase 0 で得た検証結果・設計判断を失わない
