import { test } from "node:test";
import assert from "node:assert/strict";
import { judgeExpiry, judgeFromHttpStatus, todayIso, upcomingWeekend } from "../lib/lifecycle";
import { scheduleText } from "../lib/labels";
import type { ListingRow } from "../lib/types";

const base = {
  status: "active" as const,
  availability_type: "fixed_date" as const,
  event_date: null,
  event_end_date: null,
  application_deadline: null
};

test("開催日を過ぎた fixed_date は expired", () => {
  const decision = judgeExpiry({ ...base, event_date: "2025-01-01" }, "2025-01-02");
  assert.equal(decision?.status, "expired");
});

test("複数日開催は終了日を基準にする", () => {
  const running = judgeExpiry(
    { ...base, event_date: "2025-01-01", event_end_date: "2025-01-03" },
    "2025-01-02"
  );
  assert.equal(running, null);
});

test("応募締切を過ぎたら expired", () => {
  const decision = judgeExpiry({ ...base, application_deadline: "2025-01-01" }, "2025-01-02");
  assert.equal(decision?.status, "expired");
});

test("recurring は日付がなくても expired にしない", () => {
  const decision = judgeExpiry(
    { ...base, availability_type: "recurring", event_date: "2020-01-01" },
    "2025-01-02"
  );
  assert.equal(decision, null);
});

test("404 は closed ではなく review_required にする", () => {
  assert.equal(judgeFromHttpStatus(404)?.status, "review_required");
  // 5xx は即 closed にしない
  assert.equal(judgeFromHttpStatus(503), null);
});

test("週末は土曜と日曜が連続する", () => {
  const { saturday, sunday } = upcomingWeekend(new Date("2025-09-10T00:00:00Z"));
  assert.equal(saturday, "2025-09-13");
  assert.equal(sunday, "2025-09-14");
});

/**
 * 対象は日本の募集ページなので、日付は JST の暦日で判定する。
 * UTC のままだと日本時間の午前9時までが「前日」扱いになる。
 */
test("todayIso は JST の暦日を返す", () => {
  // 9/19 23:30Z = 9/20 08:30 JST
  assert.equal(todayIso(new Date("2026-09-19T23:30:00Z")), "2026-09-20");
  // 9/19 14:00Z = 9/19 23:00 JST
  assert.equal(todayIso(new Date("2026-09-19T14:00:00Z")), "2026-09-19");
});

test("土曜のイベントは日曜まで残らない", () => {
  const saturdayEvent = { ...base, event_date: "2026-09-19" };
  // 掃除ジョブは 19:30Z（= 翌 04:30 JST）に走る。土曜のイベントは日曜朝に期限切れになる
  const sundayMorningJst = todayIso(new Date("2026-09-19T19:30:00Z"));
  assert.equal(judgeExpiry(saturdayEvent, sundayMorningJst)?.status, "expired");

  // 土曜の朝（金曜 19:30Z = 土曜 04:30 JST）にはまだ残っている
  const saturdayMorningJst = todayIso(new Date("2026-09-18T19:30:00Z"));
  assert.equal(judgeExpiry(saturdayEvent, saturdayMorningJst), null);
});

test("日曜に見にきた人へ、その日の週末を出す", () => {
  // 日曜 12:00 JST（= 日曜 03:00Z）。翌週へ飛ばさない
  const sundayNoon = upcomingWeekend(new Date("2026-09-20T03:00:00Z"));
  assert.equal(sundayNoon.saturday, "2026-09-19");
  assert.equal(sundayNoon.sunday, "2026-09-20");

  // 土曜 00:30 JST（= 金曜 15:30Z）
  const saturdayEarly = upcomingWeekend(new Date("2026-09-18T15:30:00Z"));
  assert.equal(saturdayEarly.saturday, "2026-09-19");

  // 月曜 12:00 JST（= 月曜 03:00Z）は「次の週末」
  const monday = upcomingWeekend(new Date("2026-09-21T03:00:00Z"));
  assert.equal(monday.saturday, "2026-09-26");
});

test("週末の記載を「土日」と断定しない（「土曜のみ実施」も true になるため）", () => {
  const listing = {
    availability_type: "recurring",
    event_date: null,
    event_end_date: null,
    work_hours_text: null,
    weekend_available: true
  } as Pick<
    ListingRow,
    "availability_type" | "event_date" | "event_end_date" | "work_hours_text" | "weekend_available"
  >;
  assert.ok(!scheduleText(listing).includes("土日勤務可能"));
});

test("recurring を「今週末働ける」と表示しない (D-005)", () => {
  const listing = {
    availability_type: "recurring",
    event_date: null,
    event_end_date: null,
    work_hours_text: null,
    weekend_available: true
  } as Pick<
    ListingRow,
    "availability_type" | "event_date" | "event_end_date" | "work_hours_text" | "weekend_available"
  >;

  const text = scheduleText(listing);
  assert.ok(text.includes("公式サイトで確認"));
  assert.ok(!/\d+\/\d+/.test(text));
});

test("fixed_date は日付を出す", () => {
  const listing = {
    availability_type: "fixed_date",
    event_date: "2025-09-13",
    event_end_date: null,
    work_hours_text: "09:00–12:00",
    weekend_available: true
  } as Pick<
    ListingRow,
    "availability_type" | "event_date" | "event_end_date" | "work_hours_text" | "weekend_available"
  >;

  assert.equal(scheduleText(listing), "9/13(土) 09:00–12:00");
});
