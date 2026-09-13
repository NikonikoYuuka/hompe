# 06. FUTURE DESIGN (DEFERRED)

> **Not implemented ≠ Rejected.**
> ここにある項目は方針・必要性を認識済みだが V0.1 では実装しない。
> 将来実装を不必要に妨げる設計にはしない。ただし将来のための過剰な抽象化・汎用化も行わない。

---

## V0.1 で実装しないもの

| 項目 | メモ |
| --- | --- |
| OpenAI API 連携 | コスト原則 [D-001]。導入は独断で決めない |
| 自動 AI Fact extraction | まず rule 抽出の失敗率を実測する |
| 自動 AI eligibility 判定 | 曖昧ケース件数を実測してから |
| 自動 AI Safety judgment | 同上 |
| X API 自動投稿 | 手動投稿で足りる [D-016] |
| 高度な記事 CMS | Markdown で足りる |
| 大量 SEO 記事生成 | 方針として行わない |
| AI recommendation | — |
| user matching / ユーザー適性スコアリング | [D-009] |
| user account | 公開側にログインは不要 |
| chat | 法的境界 [D-012] |
| payment | 同上 |
| application flow / サイト内応募 | 同上 |
| employer candidate management | 同上 |
| 全国 travel-time 事前計算 | 12都市×全 Listing の事前計算は作らない |
| universal crawler | Source Adapter 方式 [D-013] |
| complex semantic diff engine | ページ hash + review で足りる [D-014] |
| overengineered AI orchestration | — |

---

## 将来の収益化候補

V0.1 で実装するのは **AdSense のみ**（`docs/09_MONETIZATION.md`）。
以下は将来候補であり、V0.1 では実装しない。

| 項目 | メモ |
| --- | --- |
| 交通 / 宿泊 / レンタカー / 仕事用品等の Affiliate | 案件との関連付け方を設計してから |
| PR / Featured Listing | 通常の Listing と見分けが付く表示が必須（D-019 と同じ理由） |
| Employer direct listing | `source_type` に `direct_post` を用意済み |
| B2B | — |
| その他適法な Referral | — |

---

## AI FALLBACK（将来の使いどころ）

将来的に AI を使用してよい領域:

1. rule で確定できない Fact の抽出
2. physical-work eligibility の曖昧ケース
3. Safety / Source の曖昧ケース
4. 肉体副業メモの下書き
5. 記事
6. X 投稿

### V0.1 での代替

```
rule で判断できない → review_required → 人間確認
```

理由: まず実際に何件 review が発生するかを測定する。
週に2件しか発生しない問題のために AI automation を構築しない。

> **Automate proven pain, not imagined pain.**

### 将来の交換可能性のために守ること（過剰にしない範囲で）

- domain logic と UI を密結合させない
  → 抽出・判定ロジックは `lib/` に置き、`app/` から直接 HTML を触らない。
- 抽出結果は `{ value, confidence, evidence }` の形で返す
  → AI 実装に差し替えても呼び出し側が変わらない。
- `listings.extraction_method`（`rule` / `human` / 将来 `ai`）を保持する
  → 将来 `ai_review_required` を metrics に足せる。

これ以上の AI framework は不要。

---

## LOCATION（将来保持しうる項目）

V0.1 のスキーマに以下のカラムは用意するが、埋まらなくてよい（NULL 可）:

- `address` / `postal_code` / `prefecture` / `city`
- `latitude` / `longitude`
- `nearest_station` / `station_walk_minutes`
- `car_allowed` / `pickup_available` / `meeting_point`

MVP は首都圏中心でよい。DB は全国展開を不必要に妨げない構造にする。
ただし移動時間の事前計算システムは V0.1 で作らない。

---

## 将来のフィルタ候補

`date` / `morning` / `purpose` 等は、既存 architecture とデータ品質を見て
必要になったら追加する。複雑な search engine は作らない。DB query で十分。
