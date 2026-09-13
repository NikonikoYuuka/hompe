# 05. WEEKLY OPERATIONS

初期規模: **50〜100 Source / Listing 程度**。
目標運用負荷: **週あたり概ね2時間**。

---

## 週次サイクル [VALIDATED / MUST SUPPORT]

### 月〜水 — Source をコードで巡回

```bash
npm run ops:check      # HTTP status / hash / 変更検知
npm run ops:lifecycle  # 期限切れ判定 → expired
```

確認内容:

- HTTP status
- normalized content hash の変更
- application deadline
- event date
- availability 関連の変更

- 変更なし → **AI / 人間レビューなし**（何もしない）
- 期限切れ → コードで非公開 / archive

### 木 — 新規・変更 Source のみ処理

```bash
npm run ops:extract
```

```
変更あり Source
  ↓
Code extraction（JSON-LD / regex / 見出し）
  ↓
確定できないもの
  ↓
review_required
  ↓
人間確認（/admin/review）
  ↓
Fact 確定 → DB
```

### 金 — 週末分の紹介候補と X 投稿候補

```bash
npm run ops:weekend
```

- DB から今週末に紹介可能な Listing を抽出
- 同じ確定 Fact を使い X 投稿候補 3〜5本を生成（テンプレート結合のみ / AI なし）
- **V0.1 では X API 自動投稿は行わない。手動投稿でよい。**

### 週1回 — 記事1本

- 確定 Fact を材料に記事を1本作る。
- 案件ごとの薄い大量 SEO 記事を作らない。
- V0.1 で高度な記事 CMS は作らない。Markdown / 既存仕組みでよい。

### 土日 — 公開

- 公開 Listing を表示するだけ。原則 AI 処理なし。
- 期限到達はコードで非公開（`ops:lifecycle` を日次で回してもよい）。

---

## LISTING LIFECYCLE [DECIDED]

`listings.status`:

| status | 意味 |
| --- | --- |
| `draft` | 抽出済み・未公開 |
| `review_required` | 人間確認待ち |
| `scheduled` | 公開予定（掲載開始日待ち） |
| `active` | 公開中 |
| `expired` | 日付・締切超過 |
| `closed` | 募集終了（404/410 等） |

### 遷移ルール（コードで実行）

- `fixed_date` かつ `event_date < today` → `expired`
- `application_deadline < today` → `expired`
- HTTP 404 / 410 → 公開対象から一旦外し、`closed` 候補 / review 対象にする
- HTTP 5xx → **即 closed にしない**。retry する（`source_checks.attempt` で回数を保持）

### 削除しない [D-004]

DB から物理削除しない。`expired` / `closed` は archive として保持する。

理由: 過去パターン分析 / 季節案件の再発見 / 翌年再チェック / Source quality 分析。

古い案件を SEO 目的で大量 index しない（非公開 listing のページは `noindex`）。

---

## CODE-FIRST SOURCE CHECK [MVP NOW]

AI を使用しない。

```
HTTP request
  ↓
status
  ↓
HTML normalize
  ↓
hash
  ↓
previous hash 比較
  ↓
変更なし → 終了 / 変更あり → review / extraction 対象
```

normalize で可能な範囲で除去するもの: `script` / `style` / tracking / navigation /
irrelevant dynamic noise（日時表示・CSRF トークン・ランダム ID 等）。

ただし **過剰な汎用 Crawler を作らない**。

---

## WEEKLY METRICS [MVP NOW]

```bash
npm run ops:metrics
```

取得する値:

- `sources_checked`
- `sources_changed`
- `sources_unchanged`
- `sources_failed`
- `listings_expired`
- `listings_closed`
- `listings_review_required`
- `rule_only_processed`
- `human_review_required`
- `published_listings`
- `listing_view`（可能なら）
- `official_source_click`（可能なら）

将来 AI automation を導入した場合は `ai_review_required` を追加する。

---

## データの間引き

行数が伸びるのは `analytics_events` と `source_checks` だけ。
週次 metrics を `docs/reports/` に記録したあとであれば、古い行は消してよい
（Listing / Source は消さない D-004）。

```bash
npm run db:console -- "delete from analytics_events where created_at < date('now', '-180 days')"
npm run db:console -- "delete from source_checks    where checked_at < date('now', '-180 days')"
```

## 人手作業の記録

Technical / Cost Validation のため、週次で以下を手で記録する（`docs/reports/` に追記）。

- 人間レビューにかかった時間
- Codex / Work の利用量体感
- 想定外だった作業

`docs/reports/TEMPLATE.md` をコピーして使う。
