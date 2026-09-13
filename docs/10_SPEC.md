# 10. MASTER SPEC（原典）

> このファイルは、肉体副業の実装依頼として受け取った Master Implementation Prompt の原文です。
>
> コードと docs 内にある `spec §N` という参照（38箇所）は、すべてこのファイルの節番号を指します。
> 判断の根拠を作者の頭の中だけに置かないため、原文をそのままコミットしています。
>
> - §0〜§46 … 最初に受け取った分
> - §47〜§49 … 後から追加された分（収益化 / アーキテクチャ制約）
>
> **この文書は解釈や要約を書く場所ではありません。**
> 仕様をどう解釈し何を決めたかは `docs/02_DECISIONS.md`、
> 今回どこまで実装するかは `docs/07_MVP_V0.1.md` に書きます。
> 依頼内容そのものが更新されたときだけ、原文を差し替えます。
>
> 原文からの変更点は、節見出しを Markdown 見出し（`## N.`）にしたことだけです。本文は原文のままです。

---

肉体副業 MVP — Codex Master Implementation Prompt

あなたは「肉体副業」という新規WebサービスのLead Software Architect / Senior Engineerとして実装を担当する。

このプロジェクトでは、すでに市場・供給・情報取得方法・運用・AI利用方針についてPhase 0の調査と議論を行っている。

以下はゼロから考えるためのアイデア集ではない。

検証済み事項、確定した設計判断、現在のMVP実装範囲、将来実装、未検証仮説を明確に区別したプロジェクト仕様である。

既存の検証結果を無視して独自にプロダクトを再設計してはいけない。

一方、将来構想をすべて今すぐ実装してもいけない。

---

## 0. 最重要ルール

この仕様には4種類の情報が存在する。

A. VALIDATED / DECIDED

すでに調査・議論を行い、現時点の設計判断として採用した事項。

原則として変更しない。

技術的・法的・セキュリティ上の重大な問題を発見した場合のみ、勝手に変更せず問題点と代替案を報告する。

B. MVP NOW

今回のV0.1で実装するもの。

実装対象は原則ここだけ。

C. DEFERRED

方針・必要性は認識済みだが、V0.1では実装しないもの。

重要：

Not implemented ≠ Rejected

将来実装を不必要に妨げる設計にはしないが、将来のための過剰な抽象化・汎用化も行わない。

D. HYPOTHESIS / NOT VALIDATED

まだ実データで検証できていない事項。

事実として扱わない。

V0.1で測定可能にする。

---

## 1. PRODUCT CONTEXT [VALIDATED]

サービス名：

肉体副業

主要ペルソナ：

30代独身男女を中心としたデスクワーカー

典型：

平日はPC、Slack、Excel等を使うデスクワーク。

休日もYouTube、Instagram、Netflix、スマートフォン等を見ているうちに時間が過ぎる。

提供したい選択肢：

休日にPC/スマートフォンから離れ、

- 身体を使う
- 普段と違うことをする
- 必要なら報酬も得る

仕事・アルバイト・ボランティア・地域活動等を発見できる編集メディア。

地方創生サイトではない。

農業専門サイトでもない。

求人媒体を作ること自体が目的でもない。

場所より、

「普段のデスクワークと反対側にある体験・仕事」

を重要視する。

---

## 2. BRAND [VALIDATED]

主要コピー：

休日にスマホ6時間。それ、休めてる？
心が疲れたら、身体を働かせ。

平日は、頭で稼ぐ。
週末は、身体で稼ぐ。

PC閉じて、汗かいて、
ついでにお金ももらう。

筋肉は、すべてを解決する。
週末、肉体副業。

ブランドは少し尖っていてよい。

ただし、

- 個人攻撃
- 職業差別
- 属性攻撃
- 差別表現
- 社会問題への便乗炎上

を行わない。

炎上を目的にしない。

しかし無難なwellnessメディアにも寄せない。

---

## 3. BRAND LAYER と FACT LAYER [DECIDED]

非常に重要。

TOPやSNSなどのBrand Layerは尖っていてよい。

しかし案件情報のFact Layerは正確で真面目にする。

例：

Brand Layer：

「土曜の予定が『草刈り』になる週末、なかなかない。」

Fact Layer：

9/19
9:00–12:00
神奈川県平塚市
草刈り・稲架づくり
初心者可
最終確認：9/13
情報元：公式ページ

この2つを混同しない。

---

## 4. EDITORIAL PRINCIPLE [VALIDATED]

最重要原則：

事実を増やさない。事実は面白く料理していい。

Source Fact：

9:00–12:00
草刈り
初心者可

OK：

「土曜の朝から3時間、草を刈る。予定が『草刈り』になる週末、なかなかない。」

NG：

「自然の中でストレス解消」

Sourceに書かれていない、

- 健康効果
- ストレス解消
- 達成感
- 人との交流
- 景色
- 難易度
- 感想

等をFactとして追加しない。

一人称体験を捏造しない。

---

## 5. EDITORIAL TONE [VALIDATED]

30代の友人同士くらい。

少し雑。

少し自虐。

具体的。

説教しない。

wellness/self-help調にしない。

避ける：

- いかがでしたでしょうか
- 〜ではないでしょうか
- おすすめです の連発
- 魅力の一つです
- 近年注目されています
- 現代社会において
- 忙しい毎日の中で
- 心身ともにリフレッシュ
- 新たな一歩を踏み出してみませんか
- 自分自身と向き合う
- 充実した時間
- 〜と言えるでしょう

ブランドとして好ましい例：

「いや、普通に疲れる。」

「土曜の予定がないなら、行ってみる？」

「気づいたら今日もスマホ6時間。だったら外出よう。」

ただし、個別案件についてSource Factにない身体的影響等を断定しない。

---

## 6. SERVICE / LEGAL BOUNDARY [DECIDED]

肉体副業は、

週末に身体を使ってできる仕事・アルバイト・ボランティア・地域活動等を、独自の視点で集めて紹介する編集・まとめメディア

として設計する。

「求人検索サイトと名乗らなければ問題ない」という思想ではない。

名称ではなく、

実際の機能・データフローを法的境界に合わせる。

V0.1では以下を行わない：

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

詳細・応募等は情報提供元の公式ページへ遷移させる。

主要CTAは：

「公式サイトで詳細を見る」

とする。

「応募する」を主要CTAにしない。

法令・情報提供元の利用規約等に反する取得・掲載・機能は実装しない。

法的分類をサービス名称だけで回避しようとしてはいけない。

---

## 7. SUPPLY VALIDATION [VALIDATED]

Phase 0で実際の公開情報を調査した。

供給の存在についてはGO。

確認済み：

Agriculture / 農業
→ GO

Moving / Carrying / 引越・搬入
→ GO

Event setup / removal
→ GO

Cleaning
→ GO

Care / Welfare
→ GO
特に登録型・週末型の供給が強いことを確認。

Outdoor / Camp
→ GO
ただし仕事内容によるeligibility判定が必要。

Estate sorting / 遺品整理
→ 存在確認済み。ただし他カテゴリより供給は弱め。

Municipal / Volunteer / Community activity
→ GO
特にfixed-date案件の供給源として有望。

この供給検証を「未検証」に戻してはいけない。

---

## 8. SOURCE STRATEGY VALIDATION [VALIDATED]

以下のフローが成立することをPhase 0で確認した。

第三者求人サイト等
↓
会社・団体を発見
↓
会社/団体公式サイト
↓
公式採用・募集ページ
↓
Source Gate
↓
肉体副業Fact

第三者求人サービスはDiscoveryに利用可能。

ただし原則としてProduction Fact Sourceにはしない。

例：

- Indeed
- バイトル
- Shotworks
- Sharefull
- 農業ジョブ
- あぐりナビ
- activo等

重要：

どこで会社を発見したかではなく、肉体副業に掲載するFactをどこから取得したかを判断基準にする。

第三者求人サービスで会社を発見しても、

公式サイトに募集情報がなく、第三者求人媒体上にしか募集本文がない場合：

→ Production Listingとして採用しない。

---

## 9. PRIMARY PRODUCTION SOURCES [DECIDED]

優先：

- 雇用主公式サイト
- 雇用主公式採用ページ
- 自治体
- 公的機関
- NPO
- 主催者
- 明示的許可を得たSource
- 将来の企業直接掲載

企業公式サイトから正式にリンクされている企業専用ATS / Recruitment SaaSについてはSource Gate対象。

第三者マーケットプレイスとは区別する。

---

## 10. SOURCE GATE [DECIDED]

公開Webページだから自由に取得・再利用可能とは判断しない。

確認対象：

- official sourceか
- terms
- automated access
- commercial use
- reuse
- AI processing
- image reuse
- permission
- update/removal handling

Source grade：

A：
API / RSS / Open Data / 明示的利用許可

B：
直接許可 / 提携 / 企業直接投稿

C：
公式Sourceだが自動取得・再利用条件が不明確

D：
利用不可

D：
使用しない。

C：
自動公開しない。必要に応じreview。

注意：

robots.txtを単純なlegal OK/NG booleanとして扱わない。

robotsと利用規約・著作権・商用利用等は別問題。

---

## 11. PREVIOUS SOURCE AUDIT [VALIDATED]

Phase 0で以下の判断を行っている。

Shotworks：
Production Sourceとして使用しない。

Baitoru：
Production Sourceとして使用しない。

Sharefull：
Production Sourceとして使用しない。

Indeed：
Production Sourceとして使用しない。

農業ジョブ：
Production Sourceとして使用しない。

あぐりナビ：
Discovery / partnership候補。Production Sourceとして直接利用しない。

activo：
Discovery扱い。

自治体・公共・NPO Source：
候補だが「公的だから自由利用可能」とは決めつけずSource Gateを通す。

この判断を、実装の簡便さを理由に勝手に逆転させない。

---

## 12. AVAILABILITY VALIDATION [VALIDATED]

Phase 0で以下を確認した。

recurring / registration型：

供給が比較的強い。

fixed-date paid job：

比較的弱い。

municipal / volunteer / community activity：

fixed-date供給に有効。

したがって、以下を区別する。

availability_type：

- fixed_date
- recurring
- registration
- unknown

重要：

Sourceに

「土日勤務可能」

とあるだけで、

「今週土曜日に働ける」

と表示してはいけない。

recurring / registrationは、

「土日勤務可能。今週末の募集状況は公式サイトで確認」

等の表示を想定。

---

## 13. LISTING LIFECYCLE [DECIDED]

status：

- scheduled
- active
- expired
- closed
- review_required

fixed_date：

event_date < today

→ expired

application deadline：

application_deadline < today

→ expired

404 / 410：

公開対象から一旦外す。

closed候補 / review対象。

5xx：

即closedにしない。

retry。

DBから物理削除しない。

expired / closedはarchiveとして保持する。

理由：

- 過去パターン分析
- 季節案件の再発見
- 翌年再チェック
- Source quality分析

古い案件をSEO目的で大量indexしない。

---

## 14. WORK ELIGIBILITY [DECIDED]

重要：

場所ではなく実際の仕事内容で判断する。

Include候補：

- agriculture
- harvest
- grass cutting
- forest maintenance
- moving
- carrying
- event setup
- event removal
- cleaning
- estate sorting
- campground maintenance
- care
- welfare
- environmental activity
- community activity

Exclude：

- data entry
- call center
- reception only
- PC-centric work
- remote work
- general office work

例：

キャンプ場勤務でも、

電話＋受付＋PC入力中心

→ 原則対象外。

---

## 15. USER-FACING CATEGORIES [DECIDED]

フロントでは複雑にしすぎない。

4カテゴリ：

1. 自然・外仕事
2. 運ぶ・作る・片付ける
3. 人を手伝う
4. ボランティア・地域活動

DBには詳細work_typeを保持可能にする。

---

## 16. PURPOSE TAGS [DECIDED WITH CAUTION]

ユーザーの入口候補：

- 外に出たい
- 身体を使いたい
- 何も考えたくない
- 普段やらないことをしたい
- 誰かの役に立ちたい

これはuser/job matchingではない。

Listing側editorial tag。

特に：

「何も考えたくない」

は慎重に扱う。

介護等、判断・責任・コミュニケーションが必要な仕事へ安易に付けない。

V0.1ではAIによる自由なpurpose taggingを行わない。

必要なら人間編集で付与する。

---

## 17. REWARD [DECIDED]

基本：

paid = 有給

volunteer = 無償

expenses = 交通費等支給

benefit = 食事・宿泊等あり

特殊なポイント制度等はSourceに存在する場合のみ保持。

「高日給」をカテゴリ・主要ランキング軸・主要訴求にしない。

---

## 18. QUALIFICATION [DECIDED]

qualification_required

required_qualifications[]

を保持可能にする。

介護等で資格が必要な場合は明示。

「有資格者向け」をカテゴリにはしない。

無資格可能とSourceが明示していない場合、勝手に無資格可と推論しない。

---

## 19. SAFETY [DECIDED]

最低限確認：

- 募集主体
- 会社/団体確認
- 所在地
- 連絡先
- 仕事内容
- 勤務地
- 報酬

flags候補：

- unverified_entity
- vague_work
- missing_location
- missing_contact
- suspicious_contact_channel
- high_pay_low_detail
- sns_only

匿名SNS / Telegram等のみの募集を自動掲載しない。

高報酬だけを理由に危険と判断しない。

透明性を評価する。

---

## 20. LOCATION [DECIDED]

将来的に保持可能：

- address
- postal_code
- prefecture
- city
- latitude
- longitude
- nearest_station
- station_walk_minutes
- car_allowed
- pickup_available
- meeting_point

MVPは首都圏中心でもよい。

DBは全国展開を不必要に妨げない構造にする。

ただし12都市×全Listingの移動時間等を事前計算するシステムはV0.1で作らない。

---

## 21. COST / RESOURCE PRINCIPLE [VALIDATED]

Phase 0〜初期MVP：

DB：

無料枠。

OpenAI API：

原則使用しない。

追加AI従量課金：

前提にしない。

現在契約しているCodex / Work等の利用枠を活用する。

基本思想：

Rule First / Code First / AI When Needed / Batch AI

さらに優先順位：

1. Code
2. Database
3. Human review
4. AI automation when pain is proven

AIを使えば簡単だからAIを使う、は禁止。

---

## 22. AI COST PRINCIPLE [DECIDED]

AIを毎回全Listingに使用しない。

新規・変更情報だけを対象にする。

一度確定したFactは保存する。

Sourceの該当Factが変わっていない場合は再判定しない。

AIをpage view時に呼び出さない。

記事/X生成時にも元Webページを再読込させない。

DBに保存した確定Factを再利用する。

---

## 23. CODE-FIRST SOURCE CHECK [MVP NOW]

AIを使用しない。

基本：

HTTP request
↓
status
↓
HTML normalize
↓
hash
↓
previous hash比較

変更なし：

終了。

変更あり：

review/extraction対象。

実装対象：

- HTTP status
- retry
- normalized content/hash
- checked_at
- changed_at
- error state

normalizeでは可能な範囲で、

- script
- style
- tracking
- navigation
- irrelevant dynamic noise

等を除去。

ただし過剰な汎用Crawlerを作らない。

---

## 24. CRAWLER ARCHITECTURE [MVP NOW]

最初から万能Crawlerを作らない。

Source Adapter方式を優先する。

例：

sources/

generic

specific adapters when necessary

共通化：

- fetch
- retry
- status
- normalize
- hash
- logging

Source固有処理：

adapter。

原則：

同じ処理が複数Sourceで実際に必要になってから共通化する。

将来を予測して過剰抽象化しない。

---

## 25. RULE EXTRACTION [MVP NOW / LIMITED]

AIの前にコードで処理可能なFactを抽出する。

候補：

- pay
- dates
- weekdays
- hours
- weekly frequency
- address
- qualifications
- transportation reimbursement
- deadline

利用可能なら：

- JSON-LD
- structured data
- DOM headings
- regex

を使う。

確信できない場合：

推論しない。

review_required。

V0.1では「すべての公式採用サイトに対応する汎用Fact extractor」を目標にしない。

---

## 26. AI FALLBACK [DEFERRED AUTOMATION]

将来的にはAIを以下に使用可能：

1. ruleで確定できないFact
2. physical-work eligibilityの曖昧ケース
3. Safety / Sourceの曖昧ケース
4. 肉体副業メモ
5. 記事
6. X投稿

しかしV0.1では、

ruleで判断できない
↓
review_required
↓
人間確認

を基本とする。

理由：

まず実際に何件reviewが発生するかを測定する。

毎週2件しか発生しない問題のためにAI automationを構築しない。

Automate proven pain, not imagined pain.

ただし将来的にAI処理へ交換できるよう、domain logicとUIを密結合させない。

過剰なAI frameworkは不要。

---

## 27. FACT CACHE [MVP NOW]

一度確認したFactを保存する。

例：

physical_work = true

work_type = event_setup

Sourceの仕事内容が変わらず、給与だけ変わった場合：

physical_workを再判定しない。

変更範囲が判断可能なら、Fact単位で更新する。

難しい場合はreview_requiredでよい。

複雑なsemantic diff systemをV0.1で作る必要はない。

---

## 28. WEEKLY OPERATION [VALIDATED / MUST SUPPORT]

一週間の運用を以下とする。

月〜水

Sourceをコードで巡回。

確認：

- HTTP status
- hash/change
- deadline
- event date
- availability related changes

変更なし：

AI/人間レビューなし。

期限切れ：

コードで非公開/archive。

木

新規・変更Sourceのみ処理。

Code extraction
↓
確定できないもの
↓
review_required
↓
人間確認
↓
Fact確定
↓
DB

金

今週末に紹介可能なListingをDBから抽出。

同じ確定Factを利用して：

X投稿候補 3〜5本

を作る。

V0.1ではX APIによる自動投稿は不要。

手動投稿でよい。

週1回

確定Factを材料に記事1本を作る。

案件ごとの薄い大量SEO記事を作らない。

V0.1では高度な記事CMSは不要。

簡易方式/Markdown/既存仕組み等でよい。

土日

公開Listingを表示。

原則AI処理なし。

期限到達はコードで非公開。

---

## 29. INITIAL SCALE [VALIDATED]

最初は：

50〜100 Source / Listing程度

を想定。

巨大規模を前提としたpremature optimizationを行わない。

Supabase等の無料DB枠内を基本とする。

---

## 30. DATABASE [MVP NOW]

最低限：

sources

listings

source_checks

必要なら：

listing_tags

ただし不要ならV0.1で無理に作らない。

最低限保持：

Source：

- id
- url
- name
- source_type
- source_grade/status
- acquisition method
- checked_at
- notes

Listing：

- id
- source_id
- title
- factual description
- work_type
- category
- reward
- pay facts if applicable
- location facts
- qualification facts
- availability_type
- relevant dates/deadline
- weekend facts
- status
- last_verified_at
- source_url

Source Check：

- source_id
- checked_at
- http_status
- content_hash
- changed
- error/retry state

DB schemaは既存repositoryのarchitectureに合わせて最終決定する。

---

## 31. V0.1 PUBLIC PRODUCT [MVP NOW]

Public側は最小限。

必須：

TOP

Brand concept

主要カテゴリ/入口

Listingへの導線

Listing一覧

現在公開可能なListingを表示。

Listing詳細

Fact Layer中心。

表示候補：

- title
- work
- location
- reward
- schedule/availability
- qualification
- last verified
- source
- 肉体副業メモが存在する場合のみ表示

CTA：

公式サイトで詳細を見る

必要最低限のAbout / Disclaimer

法的・Source表示に必要な最低限。

---

## 32. V0.1 ADMIN [MVP NOW]

最低限：

- Listing確認
- Source確認
- review_required一覧
- Fact修正
- publish/unpublish
- status変更

高機能CMSを作らない。

---

## 33. FILTERS [MVP NOW / MINIMAL]

最低限必要なものだけ実装。

候補：

- category
- area
- availability
- paid / volunteer
- qualification

date / morning / purpose等は既存architectureとデータ品質を見て必要なら追加。

複雑なsearch engineを作らない。

DB queryで十分。

ユーザー適性スコアリングは実装しない。

---

## 34. ANALYTICS [MVP NOW / IMPORTANT]

供給検証はGOしている。

次に重要なのはDemand Validation。

最低限計測：

- page_view
- listing_view
- official_source_click

可能なら匿名session単位で、

TOP
↓
Listing
↓
Official Source

のconversionを測れるようにする。

個人情報を不必要に収集しない。

MVPで最も重要なユーザー行動の一つ：

Official Source Click

単にX投稿を生成した数や記事を生成した数をProduct Successと扱わない。

---

## 35. DEMAND VALIDATION [NOT YET VALIDATED]

未検証：

30代デスクワーカーが、

- 実際にListingを見るか
- 公式Sourceまでクリックするか
- 実際にやりたい案件を見つけるか
- 翌週また見たいと思うか

V0.1はこの仮説を検証するために存在する。

供給ValidationがGOしたことと、Product Market Fitを混同しない。

---

## 36. TECHNICAL / COST VALIDATION [NOT YET COMPLETE]

Code First architectureは妥当と判断している。

しかし実際の1週間運用で、

- Codex / Work利用量
- 人間レビュー時間
- changed source率
- review_required率

はまだ実測していない。

V0.1で測定する。

---

## 37. WEEKLY METRICS [MVP NOW]

最低限取得可能にする：

sources_checked

sources_changed

sources_unchanged

sources_failed

listings_expired

listings_closed

listings_review_required

rule_only_processed

human_review_required

published_listings

可能なら：

official_source_click

listing_view

AI automationを将来導入した場合：

ai_review_required

も追加可能。

---

## 38. GO / NO-GO FRAMEWORK [DECIDED]

Supply Gate

GO済み。

Source Strategy Gate

GO済み。

Technical Gate

目標：

- 50〜100件を無料DBで管理
- 週次更新が概ね2時間程度で回る
- OpenAI API追加費0円
- 変更検知の大部分がコードで完結
- 古い募集を放置しない
- AIを使う場合も管理案件の30%以下/週を目標

Product Gate

5〜10人程度の初期ユーザーテスト等で、

- Listing閲覧
- Official Source Click
- 実際にやりたいListingの有無
- 翌週再訪意向

を確認。

Technical GateとProduct Gateを通過してMVP GO判断。

---

## 39. DEFERRED [DO NOT IMPLEMENT NOW]

以下は削除された要件ではない。

将来候補として保持するがV0.1では実装しない。

- OpenAI API連携
- 自動AI Fact extraction
- 自動AI eligibility
- 自動AI Safety judgment
- X API自動投稿
- 高度な記事CMS
- 大量SEO記事生成
- AI recommendation
- user matching
- user account
- chat
- payment
- application flow
- employer candidate management
- nationwide travel-time precomputation
- universal crawler
- complex semantic diff engine
- overengineered AI orchestration

これらをV0.1に追加しない。

---

## 40. IMPLEMENTATION PHILOSOPHY

最重要：

肉体副業という仮説を最小コストで検証できるシステムを作る。

「完成した巨大サービス」を作らない。

「技術的に面白いCrawler」を作ることを目的にしない。

「AIを使うこと」を目的にしない。

「すべて自動化すること」を目的にしない。

判断順：

Can simple code solve this?

↓

Can DB solve this?

↓

Can a human review the small exception volume?

↓

Only then consider AI automation.

---

## 41. EXISTING REPOSITORY FIRST

実装開始前に必ずrepositoryを調査する。

確認：

- existing architecture
- framework
- package manager
- DB
- schema
- hosting
- CI/CD
- authentication if any
- styling/design system
- existing pages/components
- tests
- environment variables
- current unfinished work

既存コードを最大限利用。

不要なframework migrationを行わない。

既存コードを見ずに新しいarchitectureを作り始めない。

---

## 42. REQUIRED DOCUMENTATION

repository内に以下を整理する。

必要に応じて既存docs構造に合わせてよい。

推奨：

docs/

00_PRODUCT_CONTEXT.md

01_VALIDATION.md

02_DECISIONS.md

03_SOURCE_POLICY.md

04_EDITORIAL.md

05_OPERATIONS.md

06_FUTURE_DESIGN.md

07_MVP_V0.1.md

重要：

これらはこのMaster Promptの内容を適切に分割して保存する。

特に01_VALIDATION.mdには、

Supply Validation = GO

Source Strategy = GO

Availability = partial characteristics understood

Technical/Cost = one-week operation not yet validated

Demand = not yet validated

を明記。

過去の検証を未検証扱いに戻さない。

---

## 43. DECISION LOG

重要な判断にはReasonを残す。

例：

Decision:

Third-party job boards are not Production Fact Sources.

Reason:

Source/terms dependencyを避ける。

Phase 0でEmployer official sourcesから一定供給を取得可能であることを確認した。

Allowed:

Discovery.

Not Allowed:

Third-party job-board listing bodyをProduction FactとしてDBへ転載すること。

同様に、

- Code First
- archive instead of delete
- availability distinction
- Fact/Editorial separation
- no user matching
- no OpenAI API in initial MVP

等をDecisionとして残す。

---

## 44. IMPLEMENTATION ORDER

Step 1 — Repository Audit

コードを書き始める前にrepositoryを調査。

Step 2 — Documentation

このMaster Promptをrepositoryのdocsへ構造化して保存。

Step 3 — Architecture Proposal

現在のrepositoryに基づき、

- existing architecture
- proposed minimal V0.1 architecture
- DB changes
- source adapter architecture
- review flow
- analytics
- implementation sequence
- risks

を提示。

ここで過剰設計をしない。

Step 4 — V0.1 Foundation

- DB
- source model
- listing model
- source checks
- lifecycle
- change detection
- review_required

Step 5 — Initial Sources

Phase 0で確認したSource群から適切なものを使って初期データを構築。

第三者求人媒体をProduction Fact Sourceに変更しない。

Step 6 — Admin

最低限のreview/publish workflow。

Step 7 — Public UI

TOP

Listing list

Listing detail

Official Source CTA

Step 8 — Analytics

Listing View

Official Source Click

等。

Step 9 — Weekly Operation

50〜100 Source/Listing程度で一週間運用可能な状態にする。

Step 10 — Validation Report

Technical metrics

Human workload

Source change rate

Review rate

User behavior

をまとめる。

---

## 45. FIRST TASK FOR CODEX

このプロンプトを受け取った直後に、いきなり全機能を実装してはいけない。

まず：

1. repository全体を調査する。
2. 現在のarchitectureを把握する。
3. このMaster Promptをdocsへ整理する。
4. "docs/07_MVP_V0.1.md" に今回の実装範囲を明確化する。
5. 現在のコードと仕様のgapを分析する。
6. 最小の実装計画を作る。
7. その後V0.1実装を開始する。

実装詳細について合理的に判断できるものは、不要な確認質問で停止せず進める。

しかし、

- Product positioning
- Source Policy
- Legal boundary
- Data acquisition policy
- Major scope expansion
- Paid external service introduction
- OpenAI API introduction

を独断で変更しない。

重大な矛盾を発見した場合は、

1. 問題
2. 影響
3. 推奨案
4. 代替案

を明示する。

---

## 46. DEFINITION OF SUCCESS FOR THIS IMPLEMENTATION

V0.1の成功はコード量ではない。

以下を実現すること：

1. 公式Source中心で50〜100件規模を管理できる。
2. 変更なしSourceをAI/人間が再確認しなくてよい。
3. 期限切れListingが自動的に公開対象から外れる。
4. 曖昧ケースだけreview_requiredになる。
5. ユーザーがListingから公式Sourceへ移動できる。
6. Official Source Clickを計測できる。
7. 一週間の運用負荷を測定できる。
8. 追加OpenAI API費用を発生させない。
9. 将来機能のためにV0.1を過剰設計しない。
10. Phase 0で得た検証結果・設計判断を失わない。

最後にもう一度：

Validated Decisionsを勝手に未検証へ戻さない。

DeferredをRejectedとして扱わない。

HypothesisをFactとして扱わない。

MVP Now以外を勝手に実装しない。

AIより先にCode/DB/Human Reviewを検討する。

肉体副業のMVPは、サービス仮説を検証するためのシステムである。システムを作ること自体を目的化しない。

以上を前提として、Repository Auditから開始すること。

---

## 47. MONETIZATION / ADSENSE [MVP NOW]

肉体副業では初期収益化手段の一つとしてGoogle AdSenseを利用する。

ユーザーは既にAdSenseを利用可能な前提である。

V0.1では広告収益最大化システムを作るのではなく、AdSenseを安全に設置・変更できる構造を実装する。

要件：

- Google AdSenseを後からコードの大幅変更なしで有効化できること
- AdSense関連ID・設定値をソースコードへ直接ハードコードしない
- environment variables等で環境別に管理する
- development / test環境でproduction広告を誤表示しない
- reusableなAdSlot / AdContainer相当のcomponentを用意する
- 広告が未設定でもページレイアウトが壊れない
- 広告読み込みによるCLSを可能な範囲で抑える
- 広告と肉体副業のListingをユーザーが誤認しないUIにする
- Google AdSenseの現行ポリシーに反する実装を行わない
- Privacy / Cookie / Consent等、AdSense導入に必要な要件を実装前に確認する
- AdSense scriptを各componentから重複読み込みしない
- performanceを不必要に悪化させない

広告候補位置：

- TOP
- Listing一覧
- Listing詳細
- 将来の記事ページ

ただしV0.1では広告だらけにしない。

特にListing一覧では、広告を通常Listingに見せかけない。

将来的な収益化候補：

- AdSense
- 交通/宿泊/レンタカー/仕事用品等のAffiliate
- PR / Featured Listing
- Employer direct listing
- B2B
- その他適法なReferral

これらは将来候補であり、AdSense以外をV0.1で実装する必要はない。

AdSense実装によってProduct Validationを妨げないこと。

---

## 48. SYSTEM ARCHITECTURE CONSTRAINTS [DECIDED]

具体的なframework / hosting構成は、既存RepositoryをAuditしてから決定する。

既存技術を合理的に再利用できる場合、不要なmigrationを行わない。

ただしV0.1の論理構成は以下を基本とする。

Users
↓
Public Web Application
├─ TOP
├─ Listing List
└─ Listing Detail
↓
Official Source

Admin
↓
Admin / Review Interface
↓
Application / Domain Logic
↓
Database

Scheduled Job
↓
Source Checker
↓
Official Sources
↓
Normalize / Hash / Rule Extraction
↓
Changed?
├─ No → source_checksのみ更新
└─ Yes
↓
Fact更新可能？
├─ Yes → DB
└─ No → review_required

Database
├─ sources
├─ listings
├─ source_checks
└─ optional listing_tags

Confirmed Facts
├─ Public Website
├─ Weekly Article Dataset
└─ X Post Dataset

Analytics
├─ page_view
├─ listing_view
└─ official_source_click

AdSense
↓
Reusable Ad Component
↓
Selected Public Pages

重要なarchitecture rule：

1. Public page requestからSource websiteを直接取得しない。
2. Public page requestでAIを呼ばない。
3. Public pageは原則DBの確定済みFactを表示する。
4. Source crawlingとPublic servingを分離する。
5. Source failureによってPublic site全体を落とさない。
6. Source checkerはretry可能にする。
7. Source checkerの結果をloggingする。
8. changed / unchangedをDBで追跡可能にする。
9. review_requiredをPublicへ自動公開しない。
10. expired / closedを通常検索結果へ出さない。
11. secretsをclient bundleへ含めない。
12. Admin操作はPublicから分離・保護する。
13. AdSenseとListing data/domain logicを密結合させない。
14. AI/Codexをruntime dependencyにしない。

---

## 49. PREFERRED LOW-COST ARCHITECTURE [HYPOTHESIS UNTIL REPOSITORY AUDIT]

新規構築に近く、既存Repositoryとの衝突がない場合は、以下のような低コスト構成を第一候補として評価する。

Frontend / Web:
既存Repositoryのframeworkを優先。
新規選定が必要ならSEO、SSR/SSG、保守性を考慮する。

Database:
Supabase Freeを第一候補。

Scheduled processing:
無料枠または既存hosting環境で実行可能なcron / scheduled jobを優先。

Source checking:
通常コード。

AI:
production runtimeでは使用しない。

Article / X:
DBの確定Factをdatasetとして出力し、初期はCodex/Work等でbatch生成。

Analytics:
既存analyticsがあれば再利用。
なければOfficial Source Click等を最小構成で計測できる方法を提案する。

Hosting:
既存構成を優先。
新たな有料infrastructureを勝手に導入しない。

Architecture Proposalでは最低限、

- component diagram
- data flow
- deployment architecture
- scheduled job execution method
- database
- hosting
- analytics
- AdSense integration
- secrets/environment variables
- estimated free-tier usage

を示すこと。

Repository Audit後に、このHypothesisを実際の技術構成へ更新し、docsへ残すこと。
