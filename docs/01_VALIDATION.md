# 01. VALIDATION STATUS

> **このファイルの最重要ルール**
> 一度 VALIDATED になった項目を、実装の都合で「未検証」に戻さない。
> HYPOTHESIS を Fact として扱わない。

## サマリー

| 領域 | ステータス |
| --- | --- |
| Supply Validation（供給の存在） | **GO / VALIDATED** |
| Source Strategy（取得フロー成立性） | **GO / VALIDATED** |
| Availability（供給の性質） | **PARTIAL — 特性は把握済み** |
| Technical / Cost（1週間運用の実測） | **NOT YET VALIDATED** |
| Demand（需要） | **NOT YET VALIDATED** |

---

## 1. Supply Validation — GO [VALIDATED]

Phase 0 で実際の公開情報を調査し、供給の存在を確認した。

| カテゴリ | 判定 | 備考 |
| --- | --- | --- |
| Agriculture / 農業 | GO | |
| Moving / Carrying / 引越・搬入 | GO | |
| Event setup / removal | GO | |
| Cleaning | GO | |
| Care / Welfare | GO | 登録型・週末型の供給が特に強い |
| Outdoor / Camp | GO | 仕事内容による eligibility 判定が必要 |
| Estate sorting / 遺品整理 | 存在確認済み | 他カテゴリより供給は弱め |
| Municipal / Volunteer / Community activity | GO | fixed-date 案件の供給源として有望 |

**この検証を「未検証」に戻してはいけない。**

---

## 2. Source Strategy Validation — GO [VALIDATED]

以下のフローが成立することを Phase 0 で確認した。

```
第三者求人サイト等
  ↓
会社・団体を発見 (Discovery)
  ↓
会社 / 団体 公式サイト
  ↓
公式採用・募集ページ
  ↓
Source Gate
  ↓
肉体副業 Fact
```

判断基準は **「どこで会社を発見したか」ではなく「Fact をどこから取得したか」**。

詳細は `03_SOURCE_POLICY.md`。

---

## 3. Availability Validation — PARTIAL [VALIDATED（特性のみ）]

Phase 0 で確認した供給の性質:

| 型 | 供給の強さ |
| --- | --- |
| recurring / registration 型 | 比較的強い |
| fixed-date paid job | 比較的弱い |
| municipal / volunteer / community activity | fixed-date 供給に有効 |

**帰結（実装必須）**: `availability_type` を `fixed_date` / `recurring` / `registration` / `unknown` で区別する。

Source に「土日勤務可能」とあるだけの案件を「今週土曜日に働ける」と表示してはいけない。

---

## 4. Technical / Cost Validation — NOT YET VALIDATED

Code First architecture は妥当と判断している（`02_DECISIONS.md` D-001）。
しかし以下は **まだ実測していない**。V0.1 で測定する。

- Codex / Work 利用量
- 人間レビュー時間（週あたり）
- changed source 率
- review_required 率

計測手段: `docs/05_OPERATIONS.md` の weekly metrics / `npm run ops:metrics`。

---

## 5. Demand Validation — NOT YET VALIDATED

**V0.1 はこの仮説を検証するために存在する。**

未検証の問い:

1. 30代デスクワーカーが実際に Listing を見るか
2. 公式 Source までクリックするか
3. 実際にやりたい案件を見つけるか
4. 翌週また見たいと思うか

計測手段: `analytics_events`（`page_view` / `listing_view` / `official_source_click`）。

> Supply Validation が GO したことと Product Market Fit を混同しない。
> X 投稿を生成した数・記事を生成した数を Product Success として扱わない。
> MVP で最も重要なユーザー行動の一つは **Official Source Click**。
