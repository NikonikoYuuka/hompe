import { test } from "node:test";
import assert from "node:assert/strict";
import { judgeExpiry, judgeFromHttpStatus, upcomingWeekend } from "../lib/lifecycle";
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
