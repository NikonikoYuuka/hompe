# 肉体副業 (Nikutai Fukugyou) — V0.1

週末に身体を使ってできる仕事・アルバイト・ボランティア・地域活動を、
**公式の募集ページから集めて紹介する編集メディア**。

求人検索サイトではない。応募の受付・仲介は行わない。
詳細と応募は情報提供元の公式ページへ遷移させる（`docs/03_SOURCE_POLICY.md`）。

---

## V0.1 の目的

このバージョンは **仮説検証のためのシステム**であって、完成品ではない。

| 検証済み | 未検証 |
| --- | --- |
| 供給の存在（GO） | 需要（Demand） |
| Source 取得フローの成立（GO） | 1週間運用の実コスト |

検証状況の正は `docs/01_VALIDATION.md`。**ここを未検証に戻さない。**

---

## セットアップ

ホスティングと DB は **Cloudflare（Workers + D1）の無料枠**。

```bash
npm install

# D1 を作り、出力された database_id を wrangler.jsonc に貼る
npx wrangler d1 create nikutai-fukugyou
npm run db:migrate:local

# 管理画面用のトークンをローカルに置く（Git 管理外）
echo 'ADMIN_TOKEN = "任意のランダム文字列"' > .dev.vars

npm run dev        # Next.js の開発サーバ
npm run preview    # Worker として動かして確認（本番に近い）
```

デプロイと環境変数の置き場所は `docs/08_ARCHITECTURE.md` §4。
DB の詳細は `db/README.md`。

---

## 週次運用

| 曜日 | コマンド | 内容 |
| --- | --- | --- |
| 月〜水 | `npm run ops:check` | Source を巡回。HTTP status / hash で変更検知（AI なし） |
| 月〜水 | `npm run ops:lifecycle` | 期限切れ Listing を公開から外す |
| 木 | `npm run ops:extract` | 変更があった Source だけ抽出。確定できないものは要確認へ |
| 木 | `/admin/review` | 人間が確認して Fact 確定・公開 |
| 金 | `npm run ops:weekend` | 今週末の紹介候補と X 投稿候補を生成（手動投稿） |
| 週次 | `npm run ops:metrics` | 週次 metrics |

初期 Source の登録は `npm run ops:seed`（`sources/seed/README.md`）。

詳細は `docs/05_OPERATIONS.md`。

---

## 設計の芯

1. **Code → DB → Human review → AI**。この順で検討する。AI を使うこと自体を目的にしない。
2. **V0.1 で OpenAI API を使わない。** 追加課金を発生させない（`docs/02_DECISIONS.md` D-001）。
3. **事実を増やさない。事実は面白く料理していい。** Fact Layer と Brand Layer を混ぜない（D-006）。
4. **「土日勤務可能」を「今週末働ける」と表示しない。**（D-005）
5. **第三者求人媒体は Discovery のみ。Fact の取得元にしない。**（D-002）
6. **削除しない。** expired / closed は archive として残す（D-004）。
7. **広告は Listing と構造的に分離する。** 設定は環境変数のみ。1ページ1枠まで（D-017〜D-019）。

---

## ディレクトリ

```
app/            Next.js App Router（公開ページ / /admin / /api/track）
lib/            ドメインロジック（抽出・判定・lifecycle・metrics）
lib/extract/    Rule extraction（JSON-LD → 正規表現 → 諦めて review_required）
sources/        Source Adapter（V0.1 は generic のみ）
sources/seed/   初期 Source の登録用 JSON
scripts/        週次運用コマンド
db/              D1 のスキーマ（migration）
.github/         週次運用の GitHub Actions
tests/          抽出・lifecycle の回帰テスト（npm test）
docs/           仕様・検証状況・意思決定ログ
legacy/         このリポジトリに元々あった Retro Homepage Builder の scaffold
```

---

## ドキュメント

| ファイル | 内容 |
| --- | --- |
| `docs/00_PRODUCT_CONTEXT.md` | ペルソナ / ブランド / Fact と Brand の分離 |
| `docs/01_VALIDATION.md` | 何が検証済みで何が未検証か |
| `docs/02_DECISIONS.md` | 意思決定とその理由 |
| `docs/03_SOURCE_POLICY.md` | Source Gate / 法的境界 / Safety |
| `docs/04_EDITORIAL.md` | 編集原則とトーン |
| `docs/05_OPERATIONS.md` | 週次運用 / lifecycle / metrics |
| `docs/06_FUTURE_DESIGN.md` | V0.1 でやらないこと（Rejected ではない） |
| `docs/07_MVP_V0.1.md` | 実装範囲 / リポジトリ監査 / gap / risk |
| `docs/08_ARCHITECTURE.md` | 構成図 / data flow / deployment / scheduled job / 無料枠見積もり |
| `docs/09_MONETIZATION.md` | AdSense の要件確認・実装・有効化手順 |
| `docs/10_SPEC.md` | **原典**。実装依頼の原文（§0〜§49）。コード中の `spec §N` はここを指す |

---

---

## 収益化 / hosting

AdSense は **環境変数を設定するだけで有効になる**構造にしてある
（未設定なら広告関連の DOM も script も出ない）。有効化の手順は `docs/09_MONETIZATION.md`。

ホスティングは Cloudflare Workers。Vercel Hobby は規約上 AdSense を掲載できないため
採用していない（D-020）。

---

## コマンド

```bash
npm run dev        # 開発サーバ
npm run preview    # Worker として動かす（本番に近い）
npm run deploy     # Cloudflare へデプロイ
npm run build      # Next.js のビルド
npm run lint       # ESLint
npm run typecheck  # tsc --noEmit
npm test           # 抽出・lifecycle・広告ガードのテスト

npm run db:migrate:local    # D1（ローカル）へスキーマ適用
npm run db:migrate:remote   # D1（本番）へスキーマ適用
npm run db:console -- "select ..."
```
