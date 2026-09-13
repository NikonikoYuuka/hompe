import { hasSupabaseConfig } from "./env";
import { supabaseAnon } from "./supabase";
import { upcomingWeekend } from "./lifecycle";
import type { ListingCategory, ListingRow } from "./types";

/**
 * 公開側の Listing クエリ。
 *
 * - 読むのは status = 'active' のみ（RLS でも同じ条件を強制している）
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

const PUBLIC_COLUMNS =
  "id, source_id, source_url, title, description, work_type, category, reward_type, pay_text, " +
  "expenses_provided, benefits_text, prefecture, city, nearest_station, station_walk_minutes, " +
  "meeting_point, qualification_required, required_qualifications, availability_type, event_date, " +
  "event_end_date, application_deadline, work_hours_text, weekend_available, schedule_note, " +
  "editorial_note, purpose_tags, safety_flags, status, last_verified_at, published_at";

export type PublicListing = Pick<
  ListingRow,
  | "id"
  | "source_id"
  | "source_url"
  | "title"
  | "description"
  | "work_type"
  | "category"
  | "reward_type"
  | "pay_text"
  | "expenses_provided"
  | "benefits_text"
  | "prefecture"
  | "city"
  | "nearest_station"
  | "station_walk_minutes"
  | "meeting_point"
  | "qualification_required"
  | "required_qualifications"
  | "availability_type"
  | "event_date"
  | "event_end_date"
  | "application_deadline"
  | "work_hours_text"
  | "weekend_available"
  | "schedule_note"
  | "editorial_note"
  | "purpose_tags"
  | "safety_flags"
  | "status"
  | "last_verified_at"
  | "published_at"
>;

export async function fetchPublicListings(
  filters: ListingFilters = {},
  limit = 60
): Promise<PublicListing[]> {
  if (!hasSupabaseConfig()) return [];

  let query = supabaseAnon()
    .from("listings")
    .select(PUBLIC_COLUMNS)
    .eq("status", "active")
    .order("event_date", { ascending: true, nullsFirst: false })
    .order("published_at", { ascending: false })
    .limit(limit);

  if (filters.category) query = query.eq("category", filters.category);
  if (filters.prefecture) query = query.eq("prefecture", filters.prefecture);
  if (filters.availability) query = query.eq("availability_type", filters.availability);
  if (filters.reward) query = query.eq("reward_type", filters.reward);
  if (filters.qualification === "none") query = query.eq("qualification_required", false);

  const { data, error } = await query;
  if (error) {
    console.error("[listings] 取得に失敗しました:", error.message);
    return [];
  }
  return (data ?? []) as unknown as PublicListing[];
}

export async function fetchPublicListing(id: string): Promise<PublicListing | null> {
  if (!hasSupabaseConfig()) return null;

  const { data, error } = await supabaseAnon()
    .from("listings")
    .select(PUBLIC_COLUMNS)
    .eq("status", "active")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("[listings] 取得に失敗しました:", error.message);
    return null;
  }
  return (data as unknown as PublicListing) ?? null;
}

/**
 * 今週末に日付が確定している Listing。
 *
 * fixed_date のものだけを返す。recurring / registration を
 * 「今週末に働ける」として混ぜない (D-005)。
 */
export async function fetchWeekendListings(limit = 6): Promise<PublicListing[]> {
  if (!hasSupabaseConfig()) return [];
  const { saturday, sunday } = upcomingWeekend();

  const { data, error } = await supabaseAnon()
    .from("listings")
    .select(PUBLIC_COLUMNS)
    .eq("status", "active")
    .eq("availability_type", "fixed_date")
    .gte("event_date", saturday)
    .lte("event_date", sunday)
    .order("event_date", { ascending: true })
    .limit(limit);

  if (error) {
    console.error("[listings] 週末分の取得に失敗しました:", error.message);
    return [];
  }
  return (data ?? []) as unknown as PublicListing[];
}

/** フィルタ用の都道府県候補（公開中 Listing に実在するものだけ） */
export async function fetchAvailablePrefectures(): Promise<string[]> {
  if (!hasSupabaseConfig()) return [];
  const { data, error } = await supabaseAnon()
    .from("listings")
    .select("prefecture")
    .eq("status", "active")
    .not("prefecture", "is", null);

  if (error) return [];
  const set = new Set<string>();
  for (const row of (data ?? []) as Array<{ prefecture: string | null }>) {
    if (row.prefecture) set.add(row.prefecture);
  }
  return [...set].sort();
}
