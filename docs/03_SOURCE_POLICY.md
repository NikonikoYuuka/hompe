# 03. SOURCE POLICY / LEGAL BOUNDARY

---

## 1. SERVICE / LEGAL BOUNDARY [DECIDED]

肉体副業は、

> 週末に身体を使ってできる仕事・アルバイト・ボランティア・地域活動等を、
> 独自の視点で集めて紹介する **編集・まとめメディア**

として設計する。

**「求人検索サイトと名乗らなければ問題ない」という思想を採らない。**
名称ではなく、実際の機能・データフローを法的境界に合わせる。

### V0.1 で実装しないもの（機能としての境界）

- 求人申込み受付
- 求職申込み受付
- 履歴書受付
- 候補者選定
- 求職者と企業の仲介
- ユーザー情報を企業へ送信
- ユーザー適性判定
- 求人とのマッチング
- チャット
- 決済
- サイト内応募

### CTA

主要 CTA は **「公式サイトで詳細を見る」**。
「応募する」を主要 CTA にしない。詳細・応募は情報提供元の公式ページへ遷移させる。

法令・情報提供元の利用規約等に反する取得・掲載・機能は実装しない。

---

## 2. DISCOVERY と PRODUCTION FACT SOURCE の区別

```
第三者求人サイト等 ──(Discovery のみ)──> 会社・団体を特定
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

第三者求人サービスで会社を発見しても、公式サイトに募集情報がなく、
第三者求人媒体上にしか募集本文がない場合 → **Production Listing として採用しない。**

DB 上の表現: `sources.discovery_origin`（発見経路のメモ。Fact 取得元ではない）と
`sources.url`（Production Fact 取得元 URL）を分離して保持する。

---

## 3. PRIMARY PRODUCTION SOURCES [DECIDED]

優先順:

1. 雇用主公式サイト
2. 雇用主公式採用ページ
3. 自治体
4. 公的機関
5. NPO
6. 主催者
7. 明示的許可を得た Source
8. （将来）企業直接掲載

企業公式サイトから正式にリンクされている **企業専用 ATS / Recruitment SaaS** は Source Gate 対象とし、
第三者マーケットプレイスとは区別する。

---

## 4. SOURCE GATE [DECIDED]

公開 Web ページだから自由に取得・再利用可能、とは判断しない。

### 確認対象

- official source か
- terms（利用規約）
- automated access の可否
- commercial use の可否
- reuse の可否
- AI processing の可否
- image reuse の可否
- permission（明示的許可の有無）
- update / removal handling（削除・更新要請への対応手順）

### Source grade

| grade | 定義 | 扱い |
| --- | --- | --- |
| **A** | API / RSS / Open Data / 明示的利用許可 | 自動取得・自動公開可 |
| **B** | 直接許可 / 提携 / 企業直接投稿 | 自動取得・自動公開可 |
| **C** | 公式 Source だが自動取得・再利用条件が不明確 | **自動公開しない。** 取得しても `review_required` 経由でのみ公開 |
| **D** | 利用不可 | **使用しない。** 取得処理の対象から外す |

実装上の強制:
- grade `D` の source は `scripts/check-sources` の対象から除外する。
- grade `C` の source 由来の listing は、rule 抽出が成功しても `status = review_required` から始まる。

### robots.txt の扱い

robots.txt を単純な legal OK/NG boolean として扱わない。
robots と利用規約・著作権・商用利用は別問題であり、`sources.robots_notes` と
`sources.terms_notes` を別カラムで保持する。

---

## 5. PREVIOUS SOURCE AUDIT [VALIDATED]

Phase 0 での判断。実装の簡便さを理由に勝手に逆転させない。

| Source | 判断 |
| --- | --- |
| Shotworks | Production Source として使用しない |
| バイトル | Production Source として使用しない |
| Sharefull | Production Source として使用しない |
| Indeed | Production Source として使用しない |
| 農業ジョブ | Production Source として使用しない |
| あぐりナビ | Discovery / partnership 候補。Production Source として直接利用しない |
| activo | Discovery 扱い |
| 自治体・公共・NPO Source | 候補。ただし「公的だから自由利用可能」と決めつけず Source Gate を通す |

---

## 6. SAFETY [DECIDED]

### 最低限確認する項目

- 募集主体
- 会社 / 団体の確認
- 所在地
- 連絡先
- 仕事内容
- 勤務地
- 報酬

### safety flags

`listings.safety_flags text[]` に保持する候補値:

- `unverified_entity`
- `vague_work`
- `missing_location`
- `missing_contact`
- `suspicious_contact_channel`
- `high_pay_low_detail`
- `sns_only`

### ルール

- 匿名 SNS / Telegram 等のみの募集は **自動掲載しない**（`sns_only` → `review_required`）。
- 高報酬だけを理由に危険と判断しない。**透明性を評価する。**
