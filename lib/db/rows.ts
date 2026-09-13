import type { ListingRow, SourceCheckRow, SourceRow } from "../types";

/**
 * SQLite の行をドメイン型へ変換する。
 *
 * D1 (SQLite) には boolean も配列もないので、ここで一箇所に寄せて変換する:
 *   - INTEGER 0/1/NULL → boolean | null（NULL は「記載を確認できず」の第3状態）
 *   - JSON 文字列      → string[]
 */

export type SqliteRow = Record<string, unknown>;

/** 0/1/NULL を boolean | null に。NULL を false に潰さないこと (D-011) */
export function toBool(value: unknown): boolean | null {
  if (value === null || value === undefined) return null;
  return Number(value) === 1;
}

/** boolean | null を 0/1/NULL に */
export function fromBool(value: boolean | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  return value ? 1 : 0;
}

export function toList(value: unknown): string[] {
  if (typeof value !== "string" || value.length === 0) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

export function fromList(value: readonly string[] | null | undefined): string {
  return JSON.stringify(value ?? []);
}

function num(value: unknown): number | null {
  return value === null || value === undefined ? null : Number(value);
}

function str(value: unknown): string | null {
  return value === null || value === undefined ? null : String(value);
}

export function mapSource(row: SqliteRow): SourceRow {
  return {
    id: String(row.id),
    url: String(row.url),
    name: String(row.name),
    entity_name: str(row.entity_name),
    source_type: row.source_type as SourceRow["source_type"],
    grade: row.grade as SourceRow["grade"],
    status: row.status as SourceRow["status"],
    acquisition_method: String(row.acquisition_method),
    terms_url: str(row.terms_url),
    terms_notes: str(row.terms_notes),
    robots_notes: str(row.robots_notes),
    permission_notes: str(row.permission_notes),
    removal_contact: str(row.removal_contact),
    discovery_origin: str(row.discovery_origin),
    adapter: String(row.adapter),
    content_selector: str(row.content_selector),
    checked_at: str(row.checked_at),
    changed_at: str(row.changed_at),
    last_http_status: num(row.last_http_status),
    last_content_hash: str(row.last_content_hash),
    consecutive_failures: Number(row.consecutive_failures ?? 0),
    notes: str(row.notes),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at)
  };
}

export function mapListing(row: SqliteRow): ListingRow {
  return {
    id: String(row.id),
    source_id: String(row.source_id),
    source_url: String(row.source_url),

    title: String(row.title),
    description: str(row.description),
    work_type: str(row.work_type),
    category: (row.category as ListingRow["category"]) ?? null,
    physical_work: toBool(row.physical_work),
    eligibility_reason: str(row.eligibility_reason),

    reward_type: row.reward_type as ListingRow["reward_type"],
    pay_text: str(row.pay_text),
    pay_min: num(row.pay_min),
    pay_max: num(row.pay_max),
    pay_unit: str(row.pay_unit),
    expenses_provided: toBool(row.expenses_provided),
    benefits_text: str(row.benefits_text),

    prefecture: str(row.prefecture),
    city: str(row.city),
    address: str(row.address),
    postal_code: str(row.postal_code),
    latitude: num(row.latitude),
    longitude: num(row.longitude),
    nearest_station: str(row.nearest_station),
    station_walk_minutes: num(row.station_walk_minutes),
    car_allowed: toBool(row.car_allowed),
    pickup_available: toBool(row.pickup_available),
    meeting_point: str(row.meeting_point),

    qualification_required: toBool(row.qualification_required),
    required_qualifications: toList(row.required_qualifications),

    availability_type: row.availability_type as ListingRow["availability_type"],
    event_date: str(row.event_date),
    event_end_date: str(row.event_end_date),
    application_deadline: str(row.application_deadline),
    work_hours_text: str(row.work_hours_text),
    weekend_available: toBool(row.weekend_available),
    schedule_note: str(row.schedule_note),

    editorial_note: str(row.editorial_note),
    purpose_tags: toList(row.purpose_tags),

    safety_flags: toList(row.safety_flags),
    status: row.status as ListingRow["status"],
    review_reason: str(row.review_reason),
    extraction_method: row.extraction_method as ListingRow["extraction_method"],
    fact_hash: str(row.fact_hash),
    last_verified_at: str(row.last_verified_at),
    published_at: str(row.published_at),
    closed_at: str(row.closed_at),

    created_at: String(row.created_at),
    updated_at: String(row.updated_at)
  };
}

export function mapSourceCheck(row: SqliteRow): SourceCheckRow {
  return {
    id: Number(row.id),
    source_id: String(row.source_id),
    checked_at: String(row.checked_at),
    http_status: num(row.http_status),
    content_hash: str(row.content_hash),
    changed: Number(row.changed) === 1,
    attempt: Number(row.attempt ?? 1),
    duration_ms: num(row.duration_ms),
    error: str(row.error)
  };
}
