# 初期 Source の登録

## 手順

1. `sources.example.json` を `sources.json` にコピーする。
2. Source ごとに **Source Gate**（`docs/03_SOURCE_POLICY.md` §4）を確認し、
   `grade` と `terms_notes` / `robots_notes` / `permission_notes` を埋める。
3. `npm run ops:seed` を実行する。

## 登録してよい Source

`docs/03_SOURCE_POLICY.md` §3 の優先順に従う。

- 雇用主公式サイト / 公式採用ページ
- 公式サイトから正式にリンクされた企業専用 ATS
- 自治体 / 公的機関 / NPO / 主催者
- 明示的許可を得た Source

## 登録してはいけない Source

第三者求人媒体（Indeed / バイトル / Shotworks / Sharefull / 農業ジョブ / あぐりナビ / activo 等）。
これらは **Discovery にのみ**使う。会社を見つけた経路は `discovery_origin` に書く。

`scripts/seed-sources.ts` はこれらのドメインを登録時に弾く。

第三者媒体で会社を見つけても、公式サイトに募集本文がない場合は Listing にしない。

## grade の目安

| grade | 条件 | 挙動 |
| --- | --- | --- |
| A | API / RSS / Open Data / 明示的利用許可 | 自動公開可 |
| B | 直接許可 / 提携 / 企業直接投稿 | 自動公開可 |
| C | 公式だが自動取得・再利用条件が不明確 | 抽出が全部通っても `review_required` になる |
| D | 利用不可 | 登録されない・巡回されない |

## 目標規模

初期は 50〜100 Source / Listing 程度（`docs/01_VALIDATION.md`）。
巨大規模を前提にした最適化はしない。

## 注意

`sources.json` は `.gitignore` に入れてあります（連絡先メモ等が入るため）。
バックアップは別途取ってください。DB 側の `sources` テーブルが正です。

`removal_contact` には個人名・個人メールではなく、公式の問い合わせ窓口を書いてください。
