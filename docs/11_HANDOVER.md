# 11. 引き継ぎメモ

> このファイルは**次の担当者が最初に読むもの**。
> 仕様の正は `docs/10_SPEC.md`（原典）、判断の正は `docs/02_DECISIONS.md`。
> ここには「いまどこまで出来ていて、次に何をすべきで、どこでハマるか」だけを書く。

---

## 1. 30分で動かす

```bash
npm install

# D1 を作り、出力された database_id を wrangler.jsonc の d1_databases[0].database_id に貼る
npx wrangler d1 create nikutai-fukugyou

npm run db:migrate:local     # スキーマ
npm run db:seed:dev          # 開発用のサンプルデータ（これを忘れると画面が空になる）

# /admin に入るためのトークン。Git 管理外
echo 'ADMIN_TOKEN = "任意のランダム文字列"' > .dev.vars

npm run dev                  # http://localhost:3000
npm run preview              # Worker として動かす（本番に近い。/admin を触るならこちら）
```

`npm run db:seed:dev` で入るデータは `db/fixtures/dev.sql`。
表示の分岐（4カテゴリ / availability 4種 / 資格の三値 / 報酬3種 / safety flag /
肉体副業メモ / review_required / expired）を一通り踏むように作ってある。
**本番には流れない**（`--local` 固定）。

### 確認できること

| URL | 見るもの |
| --- | --- |
| `/` | 「今週末、日付が決まっているもの」に土日の案件が2件出る |
| `/listings` | 7件。終了案件と要確認案件は**出ない** |
| `/listings/a0000004-...` | 「資格要件の記載を確認できず」（D-011 の三値） |
| `/admin/review` | 要確認1件 |
| `/admin/sources` | Source 2件と巡回ログ3件 |

---

## 2. いまどこまで出来ているか

### 動くもの

- 公開サイト（TOP / 一覧 / 詳細 / About / プライバシー）
- 管理画面（要確認一覧 / Fact 編集 / 公開・非公開 / Source 一覧）
- 週次運用コマンド（`ops:check` / `ops:extract` / `ops:lifecycle` / `ops:weekend` / `ops:metrics` / `ops:seed`）
- 計測（`page_view` / `listing_view` / `official_source_click`）
- AdSense の設置構造（環境変数を入れれば有効になる。未設定なら何も出ない）
- CI（PR と push で typecheck / test / lint / migration / build）

### 動かしていないもの

- **一度もデプロイしていない。** Cloudflare のアカウントに何も上がっていない
- **実 Source が1件も入っていない**（`sources/seed/sources.json` は Git 管理外で、
  リポジトリにあるのは架空 URL のテンプレートだけ）
- したがって **1週間運用の実測値がない**（`docs/01_VALIDATION.md` の Technical Gate は未検証のまま）

---

## 3. 次にやること（優先順）

### 3-1. 実 Source を入れる（これが最大のブロッカー）

`sources/seed/README.md` の手順で `sources/seed/sources.json` を作り `npm run ops:seed`。
Phase 0 で確認した実在の公式採用ページが必要。

**Source を選ぶときの注意**: D-026 により、雇用形態が明記されていない有給案件は
掲載対象外になる（日給・日当での募集は例外的に掲載する）。
雇用形態が書かれているページを優先すること。

入れたら `npm run ops:check` → `npm run ops:extract` を回し、
出力の「対象外の内訳」を見る。

```
対象外の内訳:
  身体を使う仕事ではない        3件
  副業向きの雇用形態ではない    12件
```

「副業向きの雇用形態ではない」が多すぎる場合は D-026 の扱い
（記載が無ければ掲載しない）が実データに対して厳しすぎる。閾値を見直す判断材料になる。

### 3-2. 公開前に必ず塞ぐもの

| 項目 | どこ |
| --- | --- |
| Cloudflare の Rate Limiting（`/api/track` と `/admin/login`） | ダッシュボード。**コードでは完結しない** |
| Worker の CPU 10ms を SSR が超えないかの実測 | デプロイ後に Workers Logs で `Exceeded CPU` を確認 |
| `/privacy` と `/about` の連絡先を実際の窓口に書き換える | 「（公開時に記載）」のまま |
| `NEXT_PUBLIC_SITE_URL` をビルド時に設定 | 未設定だと sitemap が空になる |

詳細は `docs/08_ARCHITECTURE.md` §4.4。

### 3-3. 残っている技術的負債

- `月給` が報酬として抽出されない（パートの月給制が「報酬の記載を確認できず」になる）
- DB 書き込みパス（`scripts/extract.ts` / 管理画面の Server Action）にテストが無い。
  `lib/db.ts` の `Db` は3メソッドしかないので、in-memory 実装を40行書けばテストできる
- `sources/registry.ts` の `getAdapter` が未知のキーを黙って generic にフォールバックする
- `lib/http.ts` が `finalUrl` を取得しているのに保存していない
  （リダイレクト先が変わっても検知できない）

---

## 4. ハマりどころ（実際にハマったもの）

### 環境変数の置き場所が2種類ある

| 種類 | 置き場所 | 変更時 |
| --- | --- | --- |
| `ADMIN_TOKEN` | `wrangler secret put`（ローカルは `.dev.vars`） | 再デプロイ不要 |
| `NEXT_PUBLIC_*` | **ビルド時**の環境変数 | **再デプロイが必要** |
| `CLOUDFLARE_API_TOKEN` 等 | GitHub Actions secret | Worker には置かない |

`NEXT_PUBLIC_*` はビルドに焼き込まれるので、Worker の変数に入れても効かない。
`ADMIN_TOKEN` は逆に Worker の env binding に入るので、`.env.local` に書いても
`npm run preview` では読まれない（`.dev.vars` が要る）。

### Server Action は curl でテストできない

`/admin` のログインや保存は Server Action なので、
素の form POST（`curl -d 'token=...'`）では動かない。RSC のプロトコルが要る。
確認するならブラウザか Playwright を使う。

### 公開ページは `force-dynamic`

D1 binding はリクエスト時にしか存在しないので、ビルド時のプリレンダリングをしていない。
`revalidate` を足すとビルド時に DB を読もうとして空になる。

### `wrangler dev` は `.dev.vars` が無いと静かに動く

`ADMIN_TOKEN` が無くてもサーバーは起動し、`/admin/login` が
「ADMIN_TOKEN が設定されていません」と出すだけ。起動失敗しないので気づきにくい。

### テストを書くときの注意

- `tsx` は CJS にトランスパイルするので、`import("../lib/x.ts?query")` でモジュールを
  読み直す小細工が効かない（キャッシュされる）。env を差し替えるテストは
  `before` フックで1回だけ読み込む形にしてある（`tests/ads.test.ts`）
- Playwright の `request.headers()` は `sendBeacon` の Origin を見せない。
  計測が飛んでいるかはサーバー側（D1 の行数）で確認すること
- 抽出のテストで本文が40文字未満だと `too_short` で落ちる。
  検証したいゲートまで到達しないので、実在のページに近い長さにすること

---

## 5. ドキュメントの地図

| ファイル | 何が書いてあるか |
| --- | --- |
| `docs/10_SPEC.md` | **原典**。実装依頼の原文（§0〜§49）。コード中の `spec §N` はここ |
| `docs/02_DECISIONS.md` | **判断の正**。D-001〜D-029。理由つき。ここを読まずに方針を変えない |
| `docs/01_VALIDATION.md` | 何が検証済みで何が未検証か。検証済みを未検証に戻さない |
| `docs/00_PRODUCT_CONTEXT.md` | ペルソナ / ブランド / Fact と Brand の分離 |
| `docs/03_SOURCE_POLICY.md` | Source Gate / 法的境界 / Safety |
| `docs/04_EDITORIAL.md` | 編集原則とトーン |
| `docs/05_OPERATIONS.md` | 週次運用 / 失敗にどう気づくか / バックアップ |
| `docs/06_FUTURE_DESIGN.md` | やらないこと（Rejected ではない） |
| `docs/07_MVP_V0.1.md` | 実装範囲 / リポジトリ監査 / risk |
| `docs/08_ARCHITECTURE.md` | 構成図 / data flow / デプロイ / 無料枠見積もり |
| `docs/09_MONETIZATION.md` | AdSense の要件確認・有効化手順 |
| `docs/reports/TEMPLATE.md` | 週次レポートの雛形 |

---

## 6. 絶対に壊してはいけないもの

コードで守っていて、テストで固定してある。変更するときは理由を D-0xx として残すこと。

1. **事実を増やさない** — Source に無いことを表示しない（D-006）
2. **「土日勤務可能」を「今週末働ける」と表示しない** — 日付は `scheduleText()` 経由のみ（D-005）
3. **資格要件を推論しない** — `boolean | null` の三値を潰さない（D-011 / D-022）
4. **review_required / expired / closed を公開しない** — 公開クエリは `status = 'active'` 固定
5. **人間が編集した Listing / 公開中の Listing を自動で上書きしない**（D-025）
6. **削除しない** — expired / closed は archive として残す（D-004）
7. **正規雇用を掲載しない** — 転職メディアではない（D-026）
8. **public request から Source を取りに行かない / AI を呼ばない**（原典 §48）
