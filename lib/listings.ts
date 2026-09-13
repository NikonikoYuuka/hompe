import { safeQuery } from "./db";
import { mapListing, type SqliteRow } from "./db/rows";
import { upcomingWeekend } from "./lifecycle";
import type { ListingCategory, ListingRow } from "./types";

/**
 * 公開側の Listing クエリ。
 *
 * - 読むのは status = 'active' のみ。review_required / expired / closed は出さない
 *   （§48 rule 9 / 10）
 * - フィルタは DB query で足りる範囲に留める (spec §33)
 * - ユーザー適性スコアリングは実装しない (D-009)
 */

export interface ListingFilters {
  category?: ListingCategory;
  prefecture?: string;
  availability?: "fixed_date" | "recurring" | "registration" | "unknown";
  reward?: "paid" | "volunteer";
  /** "none": 資格不要と明示されているものだけ */
  qualification?: "none";
}

export type PublicListing = ListingRow;

const COLUMNS = `
  id, source_id, source_url, title, description, work_type, category, physical_work,
  eligibility_reason, reward_type, pay_text, pay_min, pay_max, pay_unit, expenses_provided,
  benefits_text, prefecture, city, address, postal_code, latitude, longitude, nearest_station,
  station_walk_minutes, car_allowed, pickup_available, meeting_point, qualification_required,
  required_qualifications, availability_type, event_date, event_end_date, application_deadline,
  work_hours_text, weekend_available, schedule_note, editorial_note, purpose_tags, safety_flags,
  status, review_reason, extraction_method, fact_hash, last_verified_at, published_at, closed_at,
  created_at, updated_at
`;

export async function fetchPublicListings(
  filters: ListingFilters = {},
  limit = 60
): Promise<PublicListing[]> {
  const where: string[] = ["status = ?"];
  const params: unknown[] = ["active"];

  if (filters.category) {
    where.push("category = ?");
    params.push(filters.category);
  }
  if (filters.prefecture) {
    where.push("prefecture = ?");
    params.push(filters.prefecture);
  }
  if (filters.availability) {
    where.push("availability_type = ?");
    params.push(filters.availability);
  }
  if (filters.reward) {
    where.push("reward_type = ?");
    params.push(filters.reward);
  }
  if (filters.qualification === "none") {
    where.push("qualification_required = 0");
  }

  params.push(limit);

  return safeQuery(
    "公開 Listing の取得",
    async (db) => {
      const rows = await db.all<SqliteRow>(
        `select ${COLUMNS} from listings
         where ${where.join(" and ")}
         order by (event_date is null), event_date asc, published_at desc
         limit ?`,
        params
      );
      return rows.map(mapListing);
    },
    []
  );
}

export async function fetchPublicListing(id: string): Promise<PublicListing | null> {
  return safeQuery(
    "Listing 詳細の取得",
    async (db) => {
      const row = await db.first<SqliteRow>(
        `select ${COLUMNS} from listings where id = ? and status = 'active'`,
        [id]
      );
      return row ? mapListing(row) : null;
    },
    null
  );
}

/**
 * 今週末に日付が確定している Listing。
 *
 * fixed_date のものだけを返す。recurring / registration を
 * 「今週末に働ける」として混ぜない (D-005)。
 */
export async function fetchWeekendListings(limit = 6): Promise<PublicListing[]> {
  const { saturday, sunday } = upcomingWeekend();

  return safeQuery(
    "今週末の Listing の取得",
    async (db) => {
      const rows = await db.all<SqliteRow>(
        `select ${COLUMNS} from listings
         where status = 'active'
           and availability_type = 'fixed_date'
           and event_date >= ? and event_date <= ?
         order by event_date asc
         limit ?`,
        [saturday, sunday, limit]
      );
      return rows.map(mapListing);
    },
    []
  );
}

/** フィルタ用の都道府県候補（公開中 Listing に実在するものだけ） */
export async function fetchAvailablePrefectures(): Promise<string[]> {
  return safeQuery(
    "都道府県一覧の取得",
    async (db) => {
      const rows = await db.all<{ prefecture: string }>(
        `select distinct prefecture from listings
         where status = 'active' and prefecture is not null
         order by prefecture asc`
      );
      return rows.map((row) => row.prefecture);
    },
    []
  );
}
