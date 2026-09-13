import { test } from "node:test";
import assert from "node:assert/strict";
import {
  extractPay,
  extractQualification,
  extractWorkHours,
  extractWeekendMention,
  extractLocation,
  extractDeadline
} from "../lib/extract/patterns";
import { extractListing } from "../lib/extract";
import { contentHash, normalizeContent } from "../lib/normalize";

/**
 * 抽出は「事実を増やさない」ことが最優先 (docs/04_EDITORIAL.md)。
 * ここでは「取れないときに null を返すこと」を重点的に確認する。
 */

test("時給・日給は単位つきで取れる", () => {
  const hourly = extractPay("時給1,200円〜1,500円");
  assert.equal(hourly?.value.min, 1200);
  assert.equal(hourly?.value.max, 1500);
  assert.equal(hourly?.value.unit, "hourly");
  assert.equal(hourly?.confidence, "high");

  const daily = extractPay("日給 10000円");
  assert.equal(daily?.value.min, 10000);
  assert.equal(daily?.value.unit, "daily");
});

test("単位のない数字を報酬として拾わない", () => {
  assert.equal(extractPay("定員30名、参加費500円"), null);
});

test("資格の明示がない場合は null（無資格可と推論しない）", () => {
  assert.equal(extractQualification("草刈りの補助をお願いします。"), null);

  const none = extractQualification("資格不要。どなたでも参加できます。");
  assert.equal(none?.value.required, false);

  const required = extractQualification("介護職員初任者研修をお持ちの方");
  assert.equal(required?.value.required, true);
  assert.deepEqual(required?.value.names, ["介護職員初任者研修"]);
});

/**
 * 「未経験可」は *経験* の記載であって *資格* の記載ではない (D-011)。
 * これを混ぜると、要免許の案件が「資格不要（Source 記載）」として公開される。
 */
test("「未経験可 / 初心者歓迎 / 経験不問」から資格不要を導かない", () => {
  for (const text of [
    "未経験可。どなたでも参加できます。",
    "初心者歓迎です。",
    "経験不問。"
  ]) {
    assert.equal(extractQualification(text), null, `資格について何も言えない: ${text}`);
  }
});

test("一覧に無い資格の要求を取りこぼさない（取りこぼすと「資格不要」になる）", () => {
  const cases = [
    "力仕事です。未経験可。運転免許をお持ちの方（AT限定不可）。",
    "経験不問。要・けん引免許。",
    "初心者歓迎！チェーンソー取扱資格が必要です。",
    "持ち物：要・高所作業車運転技能講習修了証"
  ];
  for (const text of cases) {
    const result = extractQualification(text);
    assert.ok(result, `資格の要求を検出できていない: ${text}`);
    assert.equal(result.value.required, true, text);
    assert.notEqual(result.value.required, false, "絶対に「資格不要」にしてはいけない");
  }
});

test("「資格不要」と資格の要求が同居していたら人間に回す", () => {
  assert.equal(extractQualification("資格不要ですが、普通免許があれば尚可"), null);
});

test("時間帯を取れる", () => {
  assert.equal(extractWorkHours("9:00〜12:00")?.value, "09:00–12:00");
  assert.equal(extractWorkHours("9時〜12時")?.value, "09:00–12:00");
});

test("土日の記載は検出するが、日付ではない", () => {
  const weekend = extractWeekendMention("土日勤務可能です");
  assert.equal(weekend?.value, true);
  // 日付として扱わないこと（availability の判定は judgeAvailability の責務）
  assert.equal(extractDeadline("土日勤務可能です"), null);
});

/**
 * 否定文から weekend_available を立てると、Source が言っていないどころか
 * 正反対のことを「（Source 記載）」付きで表示することになる。
 */
test("否定文から「週末に働ける」を導かない", () => {
  for (const text of [
    "土日勤務は不可能です",
    "土日はお休みです（勤務なし）",
    "平日のみ。土日は活動しません",
    "週末は受け付けておりません"
  ]) {
    assert.equal(extractWeekendMention(text), null, text);
  }
});

test("都道府県と市区町村を取れる", () => {
  const location = extractLocation("勤務地：神奈川県平塚市◯◯1-2-3");
  assert.equal(location?.value.prefecture, "神奈川県");
  assert.equal(location?.value.city, "平塚市");
});

test("年の記載がない締切は推定値として low confidence になる", () => {
  const deadline = extractDeadline("応募締切 9月13日");
  assert.ok(deadline);
  assert.equal(deadline.confidence, "low");
});

test("normalize は script/style を落とし、hash が安定する", () => {
  const a = `<html><head><style>.a{color:red}</style></head><body><script>var t=1</script><p>草刈り</p></body></html>`;
  const b = `<html><head><style>.a{color:blue}</style></head><body><script>var t=2</script><p>草刈り</p></body></html>`;
  assert.equal(normalizeContent(a), "草刈り");
  assert.equal(contentHash(a), contentHash(b));
});

test("JSON-LD があれば構造化データから Fact を取り、review 理由が減る", () => {
  const html = `
    <html><head>
    <script type="application/ld+json">
    {"@type":"JobPosting","title":"週末の草刈り作業","description":"9:00-12:00 の草刈り作業です。初心者可。連絡先 0463-00-0000",
     "validThrough":"2026-09-13","jobLocation":{"address":{"addressRegion":"神奈川県","addressLocality":"平塚市"}},
     "hiringOrganization":{"name":"株式会社テスト農園"}}
    </script></head>
    <body><h1>週末の草刈り作業</h1>
    <p>神奈川県平塚市。9:00〜12:00 の草刈り作業です。初心者可。日給8,000円。交通費支給。お問い合わせ 0463-00-0000</p>
    </body></html>`;

  const facts = extractListing({ html, entityName: "株式会社テスト農園", grade: "A" });
  assert.ok(facts);
  assert.equal(facts.title, "週末の草刈り作業");
  assert.equal(facts.workType, "grass_cutting");
  assert.equal(facts.category, "nature_outdoor");
  assert.equal(facts.physicalWork, true);
  assert.equal(facts.rewardType, "paid");
  assert.equal(facts.prefecture, "神奈川県");
  assert.equal(facts.applicationDeadline, "2026-09-13");
  assert.equal(facts.expensesProvided, true);

  // 本文は「初心者可」としか書いていない。これは経験の話なので資格は不明のまま (D-011)
  assert.equal(facts.qualificationRequired, null);
  assert.ok(
    facts.reviewReasons.some((reason) => reason.includes("資格")),
    "資格が不明なら review 理由に積む"
  );
});

test("資格不要と明記されていれば、そう表示できる", () => {
  const html = `
    <html><body><h1>週末の草刈り作業</h1>
    <p>神奈川県平塚市。9:00〜12:00 の草刈り作業です。資格不要。日給8,000円。
    交通費支給。お問い合わせ 0463-00-0000。毎週募集しています。</p>
    </body></html>`;
  const facts = extractListing({ html, entityName: "株式会社テスト農園", grade: "A" });
  assert.ok(facts);
  assert.equal(facts.qualificationRequired, false);
});

test("grade C は抽出が通っても自動公開しない理由が残る", () => {
  const html = `<html><body><h1>週末の草刈り</h1><p>神奈川県平塚市で草刈り。9:00〜12:00。初心者可。日給8,000円。お問い合わせ 0463-00-0000。毎週募集しています。</p></body></html>`;
  const facts = extractListing({ html, entityName: "テスト農園", grade: "C" });
  assert.ok(facts);
  assert.ok(facts.reviewReasons.some((reason) => reason.includes("grade C")));
});

test("身体作業の語がなく除外語だけの仕事は Listing にしない", () => {
  const html = `<html><body><h1>事務スタッフ</h1><p>データ入力とコールセンター業務。時給1,100円。</p></body></html>`;
  assert.equal(extractListing({ html, entityName: "テスト", grade: "A" }), null);
});

test("身体作業の語とデスクワークの語が同居したら人間に回す (D-007)", () => {
  // 「キャンプ場」という場所の語だけで対象と判断しない。主従はコードでは決めない。
  const html = `<html><body><h1>キャンプ場スタッフ</h1><p>キャンプ場の受付のみ。データ入力とパソコン入力が中心です。時給1,100円。</p></body></html>`;
  const facts = extractListing({ html, entityName: "テスト", grade: "A" });
  assert.ok(facts);
  assert.equal(facts.physicalWork, null, "身体作業かどうかを断定しない");
  assert.ok(facts.reviewReasons.some((reason) => reason.includes("判定できない")));
});
