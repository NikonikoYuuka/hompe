# 02. DECISION LOG

各 Decision に Reason を残す。Deferred は **Rejected ではない**。

---

## D-001 Code First / AI は最後

**Decision**: 判断順を `Code → Database → Human review → AI automation` とする。

**Reason**: Phase 0 のコスト方針。初期 MVP で OpenAI API 追加課金を前提にしない。
「AI を使えば簡単だから AI を使う」を禁止する。実際の pain を測定してから自動化する。

**Allowed**: rule / regex / JSON-LD / DOM 見出しでの抽出。判断できない場合の `review_required`。

**Not allowed**: V0.1 で OpenAI API を導入すること。ページ表示時に AI を呼ぶこと。

---

## D-002 第三者求人媒体を Production Fact Source にしない

**Decision**: Indeed / バイトル / Shotworks / Sharefull / 農業ジョブ / あぐりナビ / activo 等は
**Discovery にのみ**利用する。掲載 Fact の取得元にはしない。

**Reason**: Source / terms への依存を避ける。Phase 0 で employer official source から
一定の供給を取得可能であることを確認済み。

**Allowed**: Discovery（会社・団体の発見）。将来の partnership 交渉。

**Not allowed**: 第三者求人媒体の募集本文を Production Fact として DB へ転載すること。

**帰結**: 第三者媒体で会社を発見しても、公式サイトに募集情報がなく第三者媒体上にしか
本文がない場合、Production Listing として採用しない。

---

## D-003 Source Gate を必ず通す

**Decision**: 公開 Web ページであることを理由に「自由に取得・再利用可能」と判断しない。
grade A/B/C/D を付与し、D は使用しない、C は自動公開しない。

**Reason**: robots.txt は利用規約・著作権・商用利用可否とは別問題。
「公的機関だから自由利用可能」も決めつけない。

詳細: `03_SOURCE_POLICY.md`。

---

## D-004 Archive instead of delete

**Decision**: `expired` / `closed` の Listing を DB から物理削除しない。archive として保持する。

**Reason**: 過去パターン分析 / 季節案件の再発見 / 翌年再チェック / Source quality 分析。

**Not allowed**: 古い案件を SEO 目的で大量 index すること（`noindex` を付与する）。

---

## D-005 Availability の区別

**Decision**: `availability_type` を `fixed_date` / `recurring` / `registration` / `unknown` で保持し、
表示を型ごとに変える。

**Reason**: Phase 0 で fixed-date paid job の供給が弱く、recurring / registration が強いことを確認。
「土日勤務可能」を「今週土曜に働ける」と表示するのは事実の増加にあたる。

---

## D-006 Fact / Editorial の分離

**Decision**: `listings` の fact カラムには Source にある事実のみを入れる。
編集コピーは `editorial_note`（肉体副業メモ、人間記入・任意）にのみ入れる。

**Reason**: 編集原則「事実を増やさない。事実は面白く料理していい」。
Source にない健康効果・ストレス解消・達成感・交流・景色・難易度・感想を Fact にしない。

詳細: `04_EDITORIAL.md`。

---

## D-007 Work eligibility は場所ではなく仕事内容で判断

**Decision**: `physical_work` の判定は work content ベース。
キャンプ場勤務でも電話＋受付＋PC 入力中心なら原則対象外。

**Reason**: プロダクトの価値は「デスクワークの反対側」であり、場所ではない。

---

## D-008 ユーザー向けカテゴリは4つ

**Decision**: 公開側は `自然・外仕事` / `運ぶ・作る・片付ける` / `人を手伝う` / `ボランティア・地域活動`。
DB には詳細 `work_type` を別途保持する。

**Reason**: フロントを複雑にしない。データ側の解像度は落とさない。

---

## D-009 Purpose tag は editorial tag であり matching ではない

**Decision**: purpose tag は Listing 側の editorial tag。人間が付与する。
V0.1 で AI による自由な purpose tagging を行わない。

**Reason**: 「何も考えたくない」を介護等の判断・責任・コミュニケーションが必要な仕事へ
安易に付けると誤解を生む。

**Not allowed**: user / job matching、ユーザー適性スコアリング。

---

## D-010 高日給を主要訴求にしない

**Decision**: 「高日給」をカテゴリ・主要ランキング軸・主要訴求にしない。

**Reason**: ブランド上の位置づけと、安全性（高報酬×情報薄）の観点。
ただし高報酬だけを理由に危険とも判断しない。透明性を評価する。

---

## D-011 資格の推論をしない

**Decision**: Source が「無資格可」と明示していない場合、無資格可と推論しない。
`qualification_required` が不明なら `unknown` として扱い、断定表示しない。

---

## D-012 V0.1 は職業安定法上の「仲介」機能を持たない

**Decision**: 求人/求職申込み受付・履歴書受付・候補者選定・仲介・ユーザー情報の企業送信・
適性判定・マッチング・チャット・決済・サイト内応募を実装しない。
主要 CTA は「公式サイトで詳細を見る」。

**Reason**: 名称ではなく **実際の機能・データフロー** を法的境界に合わせる。
「求人検索サイトと名乗らなければ問題ない」という思想を採らない。

詳細: `03_SOURCE_POLICY.md` の LEGAL BOUNDARY。

---

## D-013 Source Adapter 方式（万能 Crawler を作らない）

**Decision**: 共通処理（fetch / retry / status / normalize / hash / logging）を共有し、
Source 固有処理は adapter に置く。V0.1 は `generic` adapter のみを実装する。

**Reason**: 同じ処理が複数 Source で実際に必要になってから共通化する。
将来を予測した過剰抽象化をしない。

---

## D-014 Fact Cache

**Decision**: 一度確定した Fact を保存し、Source の該当箇所が変わっていなければ再判定しない。

**Reason**: AI / 人間コストの削減。V0.1 では複雑な semantic diff engine を作らず、
ページ単位 hash 変更 → `review_required` で十分とする。

---

## D-015 Admin 認証は共有トークンの最小実装

**Decision**: V0.1 の `/admin` は `ADMIN_TOKEN` による単一の共有トークンで保護する。
ユーザーアカウント機能は作らない。

**Reason**: 運用者は当面1人。認証基盤は MVP の検証対象ではない。
将来 Supabase Auth へ差し替えられるよう、認証判定を `lib/admin-auth.ts` に閉じる。

---

## D-016 X 投稿・記事は手動運用

**Decision**: V0.1 で X API 自動投稿を行わない。`npm run ops:weekend` で投稿候補を
テンプレート生成し、人間が確認して手動投稿する。記事も Markdown で十分とする。

**Reason**: 生成数は Product Success ではない。自動投稿は検証対象ではない。

---

## D-017 AdSense は「最大化」ではなく「安全に設置・変更できる構造」を作る

**Decision**: V0.1 では広告最適化を行わない。1ページ1枠まで。
ID はすべて環境変数で管理し、コードを変えずに有効化・変更できるようにする。

**Reason**: V0.1 の目的は Demand Validation であり、広告収益は検証対象ではない。
AdSense 実装によって Product Validation を妨げてはいけない（spec §47）。

**Not allowed**: 広告収益のために `official_source_click` を下げる配置。
詳細ページで CTA の上に広告を置くこと。

---

## D-018 同意管理は Google の認定 CMP を使い、自前実装しない

**Decision**: EEA / UK / スイス向けの同意取得は、AdSense 管理画面の
「プライバシーとメッセージ」で Google の CMP を有効化して対応する。
自前の同意バナーを実装しない。

**Reason**: 2024年1月16日以降、Google 認定かつ IAB TCF 連携済みの CMP の利用が
必須になっている。自前バナーはこの要件を満たさず、
「対応したつもり」の状態を作るだけで危険。Google の CMP は AdSense タグ経由で
配信されるため、サイト側の追加実装を必要としない。

詳細と出典: `docs/09_MONETIZATION.md` §1-1。

---

## D-019 広告と Listing を構造的に分離する

**Decision**: `lib/ads.ts` は listings / supabase を import しない。
`AdSlot` は Listing のデータを受け取らない。
一覧では `<ul>` の外にのみ広告を置く。

**Reason**: spec §48 rule 13。および、ユーザーが広告を案件情報と誤認しないため。
Fact Layer と Brand Layer を混ぜないのと同じ理由（D-006）。

この分離はテスト（`tests/ads.test.ts`）で固定している。

---

## D-020 hosting は AdSense の可否を含めて選ぶ（未確定）

**Decision**: hosting をまだ確定させない。Vercel Hobby は AdSense 掲載が
規約上できないため、選択肢を整理したうえで依頼者の判断を待つ。

**Reason**: Vercel の Fair Use Guidelines が Hobby を非商用に限定し、
Google AdSense を commercial usage として名指ししている。
有料サービスの導入を独断で行わない（spec §45）。

選択肢と推奨: `docs/08_ARCHITECTURE.md` §4.2。
