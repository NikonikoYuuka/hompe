# 08. SYSTEM ARCHITECTURE

> 原典: `docs/10_SPEC.md` §48 / §49。
> §49 は「Repository Audit まで HYPOTHESIS」とされていた。Audit を実施したので、
> **このファイルが確定版**であり、以下は仮説ではなく実際の構成である。
> hosting / DB は Cloudflare（Workers + D1）に**確定**した（§4）。

---

## 1. COMPONENT DIAGRAM

```
                    ┌─────────────────────────────────────────┐
   Users ──────────▶│  Public Web Application (Next.js)        │
                    │   / (TOP)                               │
                    │   /listings                             │──▶ Official Source
                    │   /listings/[id]                        │    (別タブ / 外部)
                    │   /about  /privacy                      │
                    └──────────────┬──────────────────────────┘
                                   │ D1 binding / status = 'active' のみ
                    ┌──────────────▼──────────────────────────┐
   Admin ──────────▶│  Admin / Review Interface  /admin       │
   (ADMIN_TOKEN)    │   review / listing 編集 / publish        │
                    └──────────────┬──────────────────────────┘
                                   │ D1 binding
                    ┌──────────────▼──────────────────────────┐
                    │  Application / Domain Logic  (lib/)     │
                    │   extract / eligibility / safety /      │
                    │   lifecycle / metrics / labels          │
                    └──────────────┬──────────────────────────┘
                                   │
                    ┌──────────────▼──────────────────────────┐
                    │  Database (Cloudflare D1 / SQLite)      │
                    │   sources / listings / source_checks /  │
                    │   analytics_events                      │
                    └──────────────▲──────────────────────────┘
                                   │ D1 REST API
                    ┌──────────────┴──────────────────────────┐
   Scheduled Job ──▶│  Source Checker (scripts/ + sources/)   │──▶ Official Sources
   (cron)           │   fetch → normalize → hash → compare    │    (HTTP GET)
                    └─────────────────────────────────────────┘

   AdSense ────▶ lib/ads.ts ─▶ AdSlot component ─▶ 選択した公開ページのみ
                 (Listing の domain logic とは無関係)
```

`listing_tags` テーブルは作っていない。`purpose_tags` / `safety_flags` を
`text[]` で持てば足りるため（spec §30 の optional に該当）。

---

## 2. DATA FLOW

### 2.1 Source check（月〜水 / `npm run ops:check`）

```
sources (status=active, grade≠D)
   │
   ▼
HTTP GET (retry: 5xx/429 のみ、2s→4s backoff)
   │
   ├─ 失敗 ───────▶ source_checks(error) / sources.consecutive_failures++
   │
   ▼
HTML normalize（script/style/nav/header/footer/動的ノイズを除去）
   │
   ▼
sha256 → 前回 hash と比較
   │
   ├─ unchanged ──▶ source_checks のみ更新。**それ以上何もしない**
   │
   └─ changed ────▶ source_checks 更新 + .cache/sources/<id>.html に保存
                    （DB に HTML を保存しない）

HTTP 404 / 410 の場合のみ、その Source の Listing を review_required にする
（即 closed にしない）
```

### 2.2 Fact extraction（木 / `npm run ops:extract`）

```
.cache/sources/*.html（= 変更のあった Source だけ）
   │
   ▼
JSON-LD (JobPosting / Event) → 正規表現 → 見出し
   │
   ▼
eligibility 判定（仕事内容ベース）
   ├─ 対象外と確定 ──▶ Listing を作らない
   └─ 判定不能 ──────▶ reviewReasons に追加
   │
   ▼
fact_hash を計算
   │
   ├─ 既存 Listing と同一 ──▶ last_verified_at だけ更新（再判定しない）
   │
   ▼
reviewReasons が空か？
   ├─ Yes ──▶ status = draft（公開は人が押す）
   └─ No ───▶ status = review_required + 理由を保存

既存 Listing が extraction_method='human' の場合は上書きせず review_required に戻す
```

### 2.3 Public serving

```
Request ──▶ Cloudflare Worker (Next.js / OpenNext) ──▶ D1 binding
                                                         │
                                                         ▼
                                                 status='active' の行だけ
```

公開ページは `dynamic = "force-dynamic"`。D1 binding はリクエスト時にしか存在しないため、
ビルド時のプリレンダリングを行わない。`/about` `/privacy` `/robots.txt` `/ads.txt` は静的。

Public request の中で Source website への HTTP も AI 呼び出しも発生しない。

### 2.4 Confirmed Facts の再利用

```
listings（確定 Fact）
   ├─▶ Public Website
   ├─▶ Weekly Article Dataset   … npm run ops:weekend の出力を材料にする
   └─▶ X Post Dataset           … npm run ops:weekend（テンプレート結合のみ）
```

いずれも元 Web ページを読み直さない。

---

## 3. ARCHITECTURE RULES 準拠状況 (§48)

| # | ルール | 実装 |
| --- | --- | --- |
| 1 | Public page request から Source を直接取得しない | `lib/http.ts` を import しているのは `scripts/` と `lib/source-check.ts` のみ。`app/` からの参照なし |
| 2 | Public page request で AI を呼ばない | AI SDK を依存に持っていない。`package.json` に該当依存なし |
| 3 | Public page は DB の確定 Fact を表示する | `lib/listings.ts` の select のみ。抽出処理を呼ばない |
| 4 | Source crawling と Public serving を分離 | crawl は `scripts/*.ts`（Next の外、CLI）。web プロセスから起動しない |
| 5 | Source failure で Public site を落とさない | crawl は別プロセス（GitHub Actions）。`safeQuery()` が DB 障害時も `[]` を返す |
| 6 | Source checker は retry 可能 | `fetchSourcePage` が 5xx/429 のみ最大3回、exponential backoff |
| 7 | 結果を logging する | 全試行を `source_checks` に insert（status / hash / changed / attempt / duration / error） |
| 8 | changed / unchanged を DB で追跡 | `source_checks.changed` と `sources.last_content_hash` / `changed_at` |
| 9 | review_required を自動公開しない | 公開クエリが `status='active'` 固定。`active` への遷移は `/admin` の手動操作のみ |
| 10 | expired / closed を検索結果に出さない | 同上。行は残す（D-004）。sitemap にも出さない |
| 11 | secrets を client bundle に含めない | `ADMIN_TOKEN` は Worker secret。`CLOUDFLARE_API_TOKEN` は GitHub Actions secret で Worker に置かない。ブラウザは DB に接続しない（接続情報を配らない） |
| 12 | Admin を Public から分離・保護 | `/admin/(protected)/layout.tsx` で全ページを gate。`robots.txt` で Disallow。全 admin ページに `robots: { index: false }` |
| 13 | AdSense と Listing domain logic を密結合させない | `lib/ads.ts` は listings / DB を import しない（テストで検証）。`AdSlot` は Listing データを受け取らない |
| 14 | AI / Codex を runtime dependency にしない | production runtime に AI 呼び出しなし。記事・X 生成は人が別途行う |

---

## 4. DEPLOYMENT ARCHITECTURE

### 4.1 構成（確定）

| 層 | 採用 | 備考 |
| --- | --- | --- |
| Frontend / Web | Next.js 15 App Router + `@opennextjs/cloudflare` | Cloudflare Workers 上で動く |
| Hosting | **Cloudflare Workers（無料枠）** | Vercel Hobby は AdSense 掲載が規約違反になるため不可（D-020） |
| Database | **Cloudflare D1（無料枠）** | SQLite。`db/migrations/` |
| Source checking | Node スクリプト（`scripts/`） | Worker の外。AI を使わない |
| Scheduled job | GitHub Actions（`.github/workflows/ops.yml`） | D1 へは REST API で接続 |
| Analytics | 自前（`analytics_events`） | 外部サービスを増やさない。個人情報を持たない |
| AI | production runtime では不使用 | D-001 |

原典の要件は一貫して「無料枠に収める」ことであり（§21 コスト原則 / §29 初期規模 /
§49 Hosting「新たな有料 infrastructure を勝手に導入しない」）、Cloudflare の
Workers + D1 はこれを満たす。§49 が挙げていた個別のサービス名は候補の例示であって、
無料枠という制約そのものが要件である。

Next.js 14 → 15 へ上げたのは `@opennextjs/cloudflare` の peer 要件
（`next >=15.5.24`）のため。Next 14 のサポートは終了している。

### 4.2 デプロイ手順

```bash
npx wrangler d1 create nikutai-fukugyou     # 1. D1 を作り database_id を wrangler.jsonc へ
npm run db:migrate:remote                   # 2. スキーマ適用
npx wrangler secret put ADMIN_TOKEN         # 3. 管理トークンを登録
npm run deploy                              # 4. ビルドしてデプロイ
```

手元での確認は `npm run db:migrate:local` と `npm run preview`。
`.dev.vars` に `ADMIN_TOKEN` を書くとローカルでも `/admin` に入れる（Git 管理外）。

### 4.3 環境変数の置き場所（重要）

Cloudflare では secret は `process.env` ではなく **Worker の env binding** に入る。
`NEXT_PUBLIC_*` は逆に **ビルド時にインライン展開**されるので Worker の変数にしても効かない。

| 変数 | 置き場所 | 読み方 |
| --- | --- | --- |
| `ADMIN_TOKEN` | `wrangler secret put`（ローカルは `.dev.vars`） | `serverEnv()` が binding → `process.env` の順に探す |
| `NEXT_PUBLIC_SITE_URL` | **ビルド時**の環境変数 | ビルドに焼き込まれる |
| `NEXT_PUBLIC_ADSENSE_*` / `NEXT_PUBLIC_ADS_ENABLED` | **ビルド時**の環境変数 | 同上 |
| `CLOUDFLARE_ACCOUNT_ID` / `CLOUDFLARE_D1_DATABASE_ID` / `CLOUDFLARE_API_TOKEN` | GitHub Actions secret | 運用スクリプトのみ。**Worker には置かない** |
| `CRAWLER_CONTACT` | GitHub Actions secret | 運用スクリプトのみ |

`NEXT_PUBLIC_*` を変えたら再デプロイが必要。Worker secret は再デプロイ不要。

### 4.4 Cloudflare 側で設定すること（コードでは完結しない）

以下はコードで守れないので、ダッシュボードで設定する。**公開前に必須**。

| 対象 | 設定 | 理由 |
| --- | --- | --- |
| `/api/track` | Rate Limiting（IP あたり 60 req/min 程度） | 認証なしの書き込み口。D1 無料枠の日次書き込み上限を他人に握らせない。コード側の Origin 検査は最低限の防御でしかない |
| `/admin/login` | Rate Limiting（IP あたり 5 req/min 程度） | 共有トークンの総当たり対策。コード側は失敗を `console.warn` でログに出すだけ |
| `/admin` | Cloudflare Access（50ユーザーまで無料） | 任意。入れると総当たり・流出・セッション管理を外部に出せる |

**注意: Rate Limiting は WAF の機能なので、`workers.dev` のままでは効かない。**
独自ドメインを Cloudflare のゾーンに載せる必要がある。

### 4.5 Scheduled job

`.github/workflows/ops.yml`。Worker の Cron Triggers ではなく GitHub Actions を使う。

理由:

- 無料枠の Workers には1回の実行あたり subrequest 50件の上限があり、
  50〜100 Source の巡回を1回で回せない
- `CLOUDFLARE_API_TOKEN` を Worker に置かずに済む（rule 11 の徹底）
- Source crawling と Public serving の分離（rule 4）がそのまま保たれる

| ジョブ | スケジュール（JST） | コマンド |
| --- | --- | --- |
| source check | 月・火・水 05:00 | `npm run ops:check` |
| lifecycle | 毎日 04:30 | `npm run ops:lifecycle` |
| extract | 木 06:00 | `npm run ops:extract -- --since=... --refetch` |
| weekend picks | 金 06:00 | `npm run ops:weekend` |

GitHub Actions は実行間で `.cache/` を共有しないので、木曜の抽出は
`--since` で直近に変更された Source を拾い、`--refetch` で取り直す。
手元で回す場合は `.cache/` が効くので `npm run ops:extract` だけでよい。

## 5. ESTIMATED FREE-TIER USAGE

前提: Source / Listing 50〜100件、初期のアクセスは1日数百 PV 程度。

### Cloudflare D1 Free

| 項目 | 上限 | 想定 |
| --- | --- | --- |
| ストレージ | 5 GB | 下表のとおり年単位でも 100MB 未満 |
| 行読み取り | 500万/日 | 1リクエストあたり数十行。数千 PV でも桁違いに余裕 |
| 行書き込み | 10万/日 | 計測イベントが主。1日数千程度 |

2026年9月1日から、無料枠の日次上限を超えるとクエリが失敗するようになっている。
上限に近づく要因は `analytics_events` の書き込みだけなので、
想定トラフィックでは問題にならない。

| テーブル | 行数の伸び | 見積もり |
| --- | --- | --- |
| `sources` | 固定 100行 | < 1MB |
| `listings` | 累積。archive 込みで年 1,000〜3,000行 | 数 MB |
| `source_checks` | 100 Source × 週3回 = 年 15,000行 | 約 2〜3MB |
| `analytics_events` | 1日 1,000 events で年 365,000行 | 約 30〜50MB |

`docs/05_OPERATIONS.md` の間引き SQL を半年ごとに流せば十分収まる。

### Cloudflare Workers Free

| 項目 | 上限 | 想定 |
| --- | --- | --- |
| リクエスト | 10万/日 | 1日数百〜数千 PV では到達しない |
| CPU 時間 | 1呼び出しあたり 10ms | SSR は主に I/O 待ちで CPU は消費しない |
| 静的アセット | 無制限 | |

### GitHub Actions（private repo: 2,000分/月）

週6回 × 5分 = **月およそ 120分**。無料枠の 6% 程度。

### 外部 API

なし。OpenAI API を使わないため従量課金は発生しない。

## 6. 今後この構成を変える場合

- Source 数が 500 を超えたら `source_checks` の間引き間隔を短くする
- アクセスが増えて Workers の10万 req/日に近づいたら、公開ページに Cache API を入れる
  （現在は `force-dynamic`。キャッシュは入れていない）
- AI を導入する場合も **crawl / extract のバッチ内に閉じる**。
  public request から呼ばない（§48 rule 2 / 14 は変更しない）
