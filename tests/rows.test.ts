import { test } from "node:test";
import assert from "node:assert/strict";
import { fromBool, fromList, mapListing, mapSource, mapSourceCheck, toBool, toList } from "../lib/db/rows";

/**
 * SQLite とドメイン型の境界 (db/README.md)。
 *
 * ここが壊れると D-011 の三値（true / false / 「記載を確認できず」）が静かに潰れ、
 * 「資格要件不明」が「資格不要」として表示される。
 * 壊れ方が「表示が微妙に違う」だけなので発覚が遅い。
 */

test("toBool は NULL を false に潰さない（三値を維持する）", () => {
  assert.equal(toBool(1), true);
  assert.equal(toBool(0), false);
  assert.equal(toBool(null), null);
  assert.equal(toBool(undefined), null, "SELECT にカラムが無い場合も null");
});

test("fromBool は null を 0 にしない", () => {
  assert.equal(fromBool(true), 1);
  assert.equal(fromBool(false), 0);
  assert.equal(fromBool(null), null);
  assert.equal(fromBool(undefined), null);
});

test("boolean は往復しても値が変わらない", () => {
  for (const value of [true, false, null] as const) {
    assert.equal(toBool(fromBool(value)), value);
  }
});

test("toList は壊れた JSON でも例外を投げない", () => {
  assert.deepEqual(toList('["a","b"]'), ["a", "b"]);
  assert.deepEqual(toList("[]"), []);
  assert.deepEqual(toList(null), []);
  assert.deepEqual(toList(undefined), []);
  assert.deepEqual(toList("壊れた JSON"), []);
  assert.deepEqual(toList('{"not":"array"}'), []);
  assert.deepEqual(toList('["a",1,null]'), ["a"], "文字列以外は捨てる");
});

test("配列は往復しても値が変わらない", () => {
  const value = ["介護職員初任者研修", "普通自動車運転免許"];
  assert.deepEqual(toList(fromList(value)), value);
  assert.deepEqual(toList(fromList([])), []);
  assert.deepEqual(toList(fromList(null)), []);
});

// ---------------------------------------------------------------------------
// マッパー
// ---------------------------------------------------------------------------

/** DB が返す形（boolean は 0/1、配列は JSON 文字列） */
const listingRow = {
  id: "22222222-2222-4222-8222-222222222222",
  source_id: "11111111-1111-4111-8111-111111111111",
  source_url: "https://example.com/recruit",
  title: "週末の草刈り",
  description: "草刈り作業です。",
  work_type: "grass_cutting",
  category: "nature_outdoor",
  physical_work: 1,
  eligibility_reason: "該当キーワード: 草刈り",
  reward_type: "paid",
  pay_text: "日給8,000円",
  pay_min: 8000,
  pay_max: null,
  pay_unit: "daily",
  expenses_provided: 1,
  benefits_text: null,
  prefecture: "神奈川県",
  city: "平塚市",
  address: null,
  postal_code: null,
  latitude: null,
  longitude: null,
  nearest_station: null,
  station_walk_minutes: null,
  car_allowed: null,
  pickup_available: null,
  meeting_point: null,
  qualification_required: null, // 「記載を確認できず」
  required_qualifications: "[]",
  availability_type: "fixed_date",
  event_date: "2026-09-19",
  event_end_date: null,
  application_deadline: null,
  work_hours_text: "09:00–12:00",
  weekend_available: 1,
  schedule_note: null,
  editorial_note: null,
  purpose_tags: '["外に出たい"]',
  safety_flags: "[]",
  status: "active",
  review_reason: null,
  extraction_method: "rule",
  fact_hash: "abc",
  last_verified_at: "2026-09-13T00:00:00.000Z",
  published_at: "2026-09-13T00:00:00.000Z",
  closed_at: null,
  created_at: "2026-09-13T00:00:00.000Z",
  updated_at: "2026-09-13T00:00:00.000Z"
};

test("mapListing が 0/1 を boolean に、JSON を配列に変換する", () => {
  const listing = mapListing(listingRow);
  assert.equal(listing.physical_work, true);
  assert.equal(listing.expenses_provided, true);
  assert.equal(listing.weekend_available, true);
  assert.deepEqual(listing.purpose_tags, ["外に出たい"]);
  assert.deepEqual(listing.required_qualifications, []);
  assert.equal(listing.pay_min, 8000);
  assert.equal(listing.pay_max, null);
});

/** 最重要。ここが false になると「資格不要」と表示されてしまう */
test("mapListing は qualification_required の NULL を維持する", () => {
  assert.equal(mapListing(listingRow).qualification_required, null);
  assert.equal(mapListing({ ...listingRow, qualification_required: 0 }).qualification_required, false);
  assert.equal(mapListing({ ...listingRow, qualification_required: 1 }).qualification_required, true);
});

test("mapListing はスキーマの全カラムを読む（SELECT の書き漏れを検出する）", () => {
  const listing = mapListing(listingRow);
  // 生の行に無いキーを読んでいたら undefined になる。null との違いを見る
  for (const [key, value] of Object.entries(listing)) {
    assert.notEqual(value, undefined, `${key} が undefined。マッパーかカラム名を確認`);
  }
  // "undefined" という文字列が入り込んでいないこと（String(undefined) の罠）
  assert.notEqual(listing.title, "undefined");
  assert.notEqual(listing.id, "undefined");
});

test("mapSource / mapSourceCheck も 0/1 と数値を正しく変換する", () => {
  const source = mapSource({
    id: "s1",
    url: "https://example.com",
    name: "テスト",
    entity_name: null,
    source_type: "employer_official",
    grade: "A",
    status: "active",
    acquisition_method: "http_fetch",
    terms_url: null,
    terms_notes: null,
    robots_notes: null,
    permission_notes: null,
    removal_contact: null,
    discovery_origin: null,
    adapter: "generic",
    content_selector: null,
    checked_at: null,
    changed_at: null,
    last_http_status: null,
    last_content_hash: null,
    consecutive_failures: 0,
    notes: null,
    created_at: "2026-09-13T00:00:00.000Z",
    updated_at: "2026-09-13T00:00:00.000Z"
  });
  assert.equal(source.consecutive_failures, 0);
  assert.equal(source.checked_at, null);

  const check = mapSourceCheck({
    id: 1,
    source_id: "s1",
    checked_at: "2026-09-13T00:00:00.000Z",
    http_status: 200,
    content_hash: "abc",
    changed: 0,
    attempt: 1,
    duration_ms: 120,
    error: null
  });
  assert.equal(check.changed, false, "changed の 0 を false にする");
  assert.equal(mapSourceCheck({ id: 1, source_id: "s1", checked_at: "x", changed: 1 }).changed, true);
});
