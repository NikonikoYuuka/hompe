/**
 * 肉体副業 V0.1 domain types.
 *
 * DB の enum (supabase/migrations/0002_nikutai_fukugyou.sql) と 1:1 で対応する。
 * ここには「Source にある事実」と「lifecycle」だけを置く。編集コピーは editorialNote のみ。
 */

export type SourceType =
  | "employer_official"
  | "employer_ats"
  | "municipal"
  | "public_agency"
  | "npo"
  | "organizer"
  | "permitted"
  | "direct_post";

export type SourceGrade = "A" | "B" | "C" | "D";
export type SourceStatus = "active" | "paused" | "blocked";

/** 公開側の4カテゴリ (D-008) */
export type ListingCategory =
  | "nature_outdoor"
  | "move_build_clear"
  | "help_people"
  | "volunteer_local";

/** 「土日勤務可能」と「今週土曜に働ける」を区別するための型 (D-005) */
export type AvailabilityType = "fixed_date" | "recurring" | "registration" | "unknown";

export type RewardType = "paid" | "volunteer" | "unknown";

export type ListingStatus =
  | "draft"
  | "review_required"
  | "scheduled"
  | "active"
  | "expired"
  | "closed";

/** 将来 "ai" を足せるようにしておく (docs/06_FUTURE_DESIGN.md) */
export type ExtractionMethod = "rule" | "human";

export type AnalyticsEventType = "page_view" | "listing_view" | "official_source_click";

export type SafetyFlag =
  | "unverified_entity"
  | "vague_work"
  | "missing_location"
  | "missing_contact"
  | "suspicious_contact_channel"
  | "high_pay_low_detail"
  | "sns_only";

export interface SourceRow {
  id: string;
  url: string;
  name: string;
  entity_name: string | null;
  source_type: SourceType;
  grade: SourceGrade;
  status: SourceStatus;
  acquisition_method: string;
  terms_url: string | null;
  terms_notes: string | null;
  robots_notes: string | null;
  permission_notes: string | null;
  removal_contact: string | null;
  discovery_origin: string | null;
  adapter: string;
  content_selector: string | null;
  checked_at: string | null;
  changed_at: string | null;
  last_http_status: number | null;
  last_content_hash: string | null;
  consecutive_failures: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ListingRow {
  id: string;
  source_id: string;
  source_url: string;

  title: string;
  description: string | null;
  work_type: string | null;
  category: ListingCategory | null;
  physical_work: boolean | null;
  eligibility_reason: string | null;

  reward_type: RewardType;
  pay_text: string | null;
  pay_min: number | null;
  pay_max: number | null;
  pay_unit: string | null;
  expenses_provided: boolean | null;
  benefits_text: string | null;

  prefecture: string | null;
  city: string | null;
  address: string | null;
  postal_code: string | null;
  latitude: number | null;
  longitude: number | null;
  nearest_station: string | null;
  station_walk_minutes: number | null;
  car_allowed: boolean | null;
  pickup_available: boolean | null;
  meeting_point: string | null;

  qualification_required: boolean | null;
  required_qualifications: string[];

  availability_type: AvailabilityType;
  event_date: string | null;
  event_end_date: string | null;
  application_deadline: string | null;
  work_hours_text: string | null;
  weekend_available: boolean | null;
  schedule_note: string | null;

  editorial_note: string | null;
  purpose_tags: string[];

  safety_flags: string[];
  status: ListingStatus;
  review_reason: string | null;
  extraction_method: ExtractionMethod;
  fact_hash: string | null;
  last_verified_at: string | null;
  published_at: string | null;
  closed_at: string | null;

  created_at: string;
  updated_at: string;
}

export interface SourceCheckRow {
  id: number;
  source_id: string;
  checked_at: string;
  http_status: number | null;
  content_hash: string | null;
  changed: boolean;
  attempt: number;
  duration_ms: number | null;
  error: string | null;
}

/**
 * 抽出結果の共通形。
 *
 * 値が取れなかった場合は null を返し、**推論しない**。
 * 将来 rule 実装を AI 実装に差し替えても呼び出し側が変わらないように、
 * evidence（Source 上の根拠テキスト）を必ず添える。
 */
export interface Extracted<T> {
  value: T;
  /** high: 構造化データ等で確実 / low: 正規表現等で推定。low は review 対象にする */
  confidence: "high" | "low";
  /** 判断根拠になった Source 上のテキスト断片 */
  evidence: string;
}

export function extracted<T>(
  value: T,
  confidence: "high" | "low",
  evidence: string
): Extracted<T> {
  return { value, confidence, evidence };
}
