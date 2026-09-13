import { test } from "node:test";
import assert from "node:assert/strict";
import { judgeSideJobFit } from "../lib/side-job";
import { extractListing } from "../lib/extract";

/**
 * 働き方の軸の判定 (D-026)。
 *
 * 仕事の中身（physical_work）とは直交する。
 * 「介護は正社員でも介護」なので、中身の判定だけでは転職案件が
 * 「週末の肉体副業」として載ってしまう。
 */

const paid = { category: null, rewardType: "paid" } as const;

test("本業を置き換える働き方は対象外", () => {
  for (const text of [
    "介護スタッフ（正社員）",
    "正規雇用。月給24万円",
    "常勤の介護職員を募集",
    "フルタイムで働ける方",
    "週5日勤務できる方",
    "無期雇用でのご案内です"
  ]) {
    assert.equal(judgeSideJobFit(text, paid).suitable, false, text);
  }
});

test("掲載対象にしていない雇用形態は対象外", () => {
  assert.equal(judgeSideJobFit("清掃スタッフ（契約社員）", paid).suitable, false);
  assert.equal(judgeSideJobFit("搬入ドライバー。業務委託。", paid).suitable, false);
});

test("副業として成立する記載があれば掲載対象", () => {
  for (const text of [
    "単発OK",
    "スポットでのお仕事",
    "短期のお仕事です",
    "副業歓迎",
    "Wワーク可",
    "週1日から勤務可能",
    "登録制のスタッフ募集",
    "アルバイト募集",
    "パート募集",
    "派遣スタッフ募集"
  ]) {
    assert.equal(judgeSideJobFit(text, paid).suitable, true, text);
  }
});

/** 派遣は掲載する。ただし実質フルタイムの派遣は人間が判断する */
test("無期雇用派遣・紹介予定派遣は人間に回す", () => {
  assert.equal(judgeSideJobFit("無期雇用派遣。月給22万円。", paid).suitable, null);
  assert.equal(judgeSideJobFit("紹介予定派遣のお仕事", paid).suitable, null);
});

test("複数の雇用形態が同居していたら人間に回す", () => {
  assert.equal(judgeSideJobFit("正社員・アルバイト同時募集", paid).suitable, null);
  assert.equal(judgeSideJobFit("契約社員またはパート", paid).suitable, null);
});

/** 「正社員登用あり」はアルバイトの福利。「非常勤」は常勤ではない */
test("正社員登用あり / 非常勤を誤って除外しない", () => {
  assert.equal(judgeSideJobFit("アルバイト募集。正社員登用あり。", paid).suitable, true);
  assert.equal(judgeSideJobFit("介護補助（非常勤）。週1日から。", paid).suitable, true);
});

/** 記載がなければ「たぶんアルバイトだろう」と推論しない */
test("雇用形態の記載がなければ掲載しない", () => {
  const result = judgeSideJobFit("倉庫での荷役作業。時給1,200円。", paid);
  assert.equal(result.suitable, false);
  assert.ok(result.reason.includes("推論しない"));
});

test("ボランティア・地域活動は雇用形態の判定対象外", () => {
  assert.equal(
    judgeSideJobFit("河川清掃活動。無償。", { category: "volunteer_local", rewardType: "volunteer" })
      .suitable,
    true
  );
  assert.equal(
    judgeSideJobFit("ビーチクリーンのお手伝い", { category: null, rewardType: "volunteer" }).suitable,
    true
  );
});

// ---------------------------------------------------------------------------
// 抽出全体を通したときの挙動
// ---------------------------------------------------------------------------

function extract(inner: string) {
  return extractListing({
    html: `<html><body>${inner}</body></html>`,
    entityName: "テスト",
    grade: "A"
  });
}

test("正社員の介護求人は Listing にしない（中身は「介護」で通ってしまうため）", () => {
  const facts = extract(
    `<h1>介護スタッフ募集（正社員）</h1><p>東京都世田谷区の特別養護老人ホームでの介護業務。
     身体介護・入浴介助。月給24万円〜。週5日勤務、シフト制のため土日勤務あり。TEL 03-0000-0000</p>`
  );
  assert.equal(facts, null);
});

test("単発の草刈りは Listing になる", () => {
  const facts = extract(
    `<h1>週末の草刈り</h1><p>神奈川県平塚市で草刈り。9:00〜12:00。日給8,000円。単発OK。
     資格不要。TEL 0463-00-0000。毎週募集しています。</p>`
  );
  assert.ok(facts);
  assert.equal(facts.workType, "grass_cutting");
});

test("雇用形態の記載がない有給案件は Listing にしない", () => {
  const facts = extract(
    `<h1>倉庫での搬入作業</h1><p>東京都大田区。荷役作業。時給1,200円。資格不要。TEL 03-2222-2222</p>`
  );
  assert.equal(facts, null);
});

test("同時募集は Listing にするが要確認にする", () => {
  const facts = extract(
    `<h1>清掃スタッフ募集</h1><p>東京都。清掃業務。正社員・アルバイト同時募集。
     時給1,200円〜。TEL 03-3333-3333</p>`
  );
  assert.ok(facts);
  assert.ok(facts.reviewReasons.some((reason) => reason.includes("副業")));
});
