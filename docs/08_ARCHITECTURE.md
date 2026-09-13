# 08. SYSTEM ARCHITECTURE

> spec §48 / §49。
> §49 は「Repository Audit まで HYPOTHESIS」とされていた。Audit を実施したので、
> **このファイルが確定版**であり、以下は仮説ではなく実際の構成である。
> ただし hosting だけは未確定（§4 参照）。

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
                                   │ read only (anon key + RLS)
                                   │ status = 'active' のみ
                    ┌──────────────▼──────────────────────────┐
   Admin ──────────▶│  Admin / Review Interface  /admin       │
   (ADMIN_TOKEN)    │   review / listing 編集 / publish        │
                    └──────────────┬──────────────────────────┘
                                   │ service role key
                    ┌──────────────▼──────────────────────────┐
                    │  Application / Domain Logic  (lib/)     │
                    │   extract / eligibility / safety /      │
                    │   lifecycle / metrics / labels          │
                    └──────────────┬──────────────────────────┘
                                   │
                    ┌──────────────▼──────────────────────────┐
                    │  Database (Supabase Postgres)           │
                    │   sources / listings / source_checks /  │
                    │   analytics_events                      │
                    └──────────────▲──────────────────────────┘
                                   │ service role key
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
Request ──▶ Next.js（ISR: revalidate 300）──▶ Supabase（anon key）
                                                │
                                                ▼
                                        status='active' の行だけ
```

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
| 5 | Source failure で Public site を落とさない | crawl は別プロセス。`fetchPublicListings` は error を握って `[]` を返す |
| 6 | Source checker は retry 可能 | `fetchSourcePage` が 5xx/429 のみ最大3回、exponential backoff |
| 7 | 結果を logging する | 全試行を `source_checks` に insert（status / hash / changed / attempt / duration / error） |
| 8 | changed / unchanged を DB で追跡 | `source_checks.changed` と `sources.last_content_hash` / `changed_at` |
| 9 | review_required を自動公開しない | RLS が `status='active'` のみ select 許可。`active` への遷移は `/admin` の手動操作のみ |
| 10 | expired / closed を検索結果に出さない | 同上。行は残す（D-004）。sitemap にも出さない |
| 11 | secrets を client bundle に含めない | `SUPABASE_SERVICE_ROLE_KEY` / `ADMIN_TOKEN` は `NEXT_PUBLIC_` を付けていない。`supabaseService()` はブラウザから呼ばれると throw |
| 12 | Admin を Public から分離・保護 | `/admin/(protected)/layout.tsx` で全ページを gate。`robots.txt` で Disallow。全 admin ページに `robots: { index: false }` |
| 13 | AdSense と Listing domain logic を密結合させない | `lib/ads.ts` は listings / supabase を import しない（テストで検証）。`AdSlot` は Listing データを受け取らない |
| 14 | AI / Codex を runtime dependency にしない | production runtime に AI 呼び出しなし。記事・X 生成は人が別途行う |

---

## 4. DEPLOYMENT ARCHITECTURE

### 4.1 確定している部分

| 層 | 採用 | 理由 |
| --- | --- | --- |
| Frontend / Web | 既存の Next.js 14 App Router | Repository Audit の結果、既存基盤をそのまま再利用。migration しない |
| Database | Supabase Free | 既存 `.env.example` が Supabase 前提。無料枠で足りる規模 |
| Source checking | 通常の Node スクリプト（`scripts/`） | AI を使わない。web プロセスと分離 |
| Analytics | 自前の最小実装（`analytics_events`） | 既存 analytics がなかった。外部サービスを増やさない。個人情報を持たない |
| AI | production runtime では不使用 | D-001 |

### 4.2 未確定：hosting（**判断が必要**）

**Vercel Hobby（無料）は使えない。** Vercel の Fair Use Guidelines は Hobby を
非商用の個人利用に限定しており、**Google AdSense を含む広告の掲載を
「commercial usage」として明示的に例示**している。AdSense を入れる時点で Pro が必要になる。

選択肢:

| 案 | 月額 | 備考 |
| --- | --- | --- |
| A. Cloudflare Workers（`@opennextjs/cloudflare`） | 0円 | 無料枠に一般的な商用利用禁止条項はない（決済情報の処理のみ不可）。Next.js App Router / SSR / ISR に対応。workerd 上で動くため動作確認が必要 |
| B. Vercel Pro | $20 | 追加設定なしで確実。ただし有料サービスの導入 |
| C. AdSense を後回しにして Vercel Hobby で Demand Validation だけ先に行う | 0円 | 広告なしなら Hobby の範囲内。Product Gate 通過後に hosting を決める |

**推奨は C → A**。V0.1 の目的は Demand Validation であり、
AdSense 収益は検証対象ではない（§47「AdSense 実装によって Product Validation を妨げない」）。
広告なしで検証を回し、続けると決めてから A へ移す。

コード側はこの判断を待たずに完成している。`NEXT_PUBLIC_ADS_ENABLED` を
設定しなければ広告は一切描画されず、設定すれば有効になる。

> 有料サービスの導入は独断で行わない（spec §45）。A / B / C の選択は依頼者が決める。

### 4.3 Scheduled job の実行方法

**推奨: GitHub Actions の scheduled workflow。**

理由:

- 運用スクリプトは Node CLI であり、web hosting に依存しない
- `SUPABASE_SERVICE_ROLE_KEY` を web プロセスへ置かずに済む（§48 rule 11 の徹底）
- Vercel Hobby の cron は1日1回・2ジョブまでという制約があるが、GitHub Actions は
  cron を自由に組める
- private repository でも無料枠（2,000分/月）の範囲。50〜100 Source の巡回は
  1回あたり数分

| ジョブ | スケジュール（JST） | コマンド |
| --- | --- | --- |
| source check | 月・火・水 06:00 | `npm run ops:check` |
| lifecycle | 毎日 05:00 | `npm run ops:lifecycle` |
| extract | 木 06:00 | `npm run ops:extract -- --refetch` |
| weekend picks | 金 06:00 | `npm run ops:weekend` |

注意: `ops:check` と `ops:extract` を別ジョブで動かす場合、`.cache/` は
GitHub Actions の実行間で共有されないため、`ops:extract` は `--refetch` を付けて
Source を取り直す（`changed_at` を見て対象を絞る運用にするか、
2つを1ジョブに束ねるかは、実際の所要時間を見てから決める）。

ワークフロー定義はまだ置いていない。hosting と同時に決めるため。
手元での手動実行は今すぐできる。

### 4.4 Secrets / Environment variables

| 変数 | client bundle | 置き場所 |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | 含まれる | hosting |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 含まれる | hosting（RLS で保護） |
| `SUPABASE_SERVICE_ROLE_KEY` | **含まれない** | hosting（server のみ）+ GitHub Actions secret |
| `ADMIN_TOKEN` | **含まれない** | hosting（server のみ） |
| `NEXT_PUBLIC_SITE_URL` | 含まれる | hosting |
| `CRAWLER_CONTACT` | **含まれない** | GitHub Actions secret |
| `NEXT_PUBLIC_ADSENSE_CLIENT` | 含まれる | hosting（公開値。secret ではない） |
| `NEXT_PUBLIC_ADS_ENABLED` | 含まれる | **production 環境にのみ設定する** |
| `NEXT_PUBLIC_ADSENSE_SLOT_*` | 含まれる | hosting（公開値） |

---

## 5. ESTIMATED FREE-TIER USAGE

前提: Source / Listing 50〜100件、初期のアクセスは1日数百 PV 程度。

### Supabase Free（500MB DB / 5GB 転送）

| テーブル | 行数の伸び | 見積もり |
| --- | --- | --- |
| `sources` | 固定 100行 | < 1MB |
| `listings` | 累積。週に数十行、archive 込みで年 1,000〜3,000行 | 数 MB |
| `source_checks` | 100 Source × 週3回 = 週 300行 → 年 15,000行 | 約 2〜3MB |
| `analytics_events` | 1日 1,000 events でも年 365,000行 | 約 30〜50MB |

年単位でも 100MB に届かない見込み。`05_OPERATIONS.md` の間引き SQL を
半年ごとに流せば十分収まる。

### GitHub Actions（private repo: 2,000分/月）

週6回 × 5分 = **月およそ 120分**。無料枠の 6% 程度。

### Cloudflare Workers Free（10万 req/日）

1日数百〜数千 PV では到達しない。静的アセットは無制限。

### 外部 API

なし。OpenAI API を使わないため従量課金は発生しない。

---

## 6. 今後この構成を変える場合

- hosting を決めたら §4.2 を更新し、GitHub Actions の workflow を追加する
- Source 数が 500 を超えたら `source_checks` の間引き間隔を短くする
- AI を導入する場合も **crawl / extract のバッチ内に閉じる**。
  public request から呼ばない（§48 rule 2 / 14 は変更しない）
