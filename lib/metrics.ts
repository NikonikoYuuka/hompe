import { getDb, type Db } from "./db";

/**
 * Weekly metrics (spec §37)。
 *
 * Technical / Cost Validation は未検証 (docs/01_VALIDATION.md)。
 * 実際に何件 changed / review_required が発生するかをここで測る。
 */

export interface WeeklyMetrics {
  periodStart: string;
  periodEnd: string;

  sources_checked: number;
  sources_changed: number;
  sources_unchanged: number;
  sources_failed: number;

  listings_expired: number;
  listings_closed: number;
  listings_review_required: number;

  rule_only_processed: number;
  human_review_required: number;
  published_listings: number;

  listing_view: number;
  official_source_click: number;
  page_view: number;
}

async function count(db: Db, sql: string, params: unknown[] = []): Promise<number> {
  const row = await db.first<{ count: number }>(sql, params);
  return Number(row?.count ?? 0);
}

export async function collectWeeklyMetrics(days = 7): Promise<WeeklyMetrics> {
  const db = await getDb();
  const end = new Date();
  const start = new Date(end.getTime() - days * 24 * 60 * 60 * 1000);
  const since = start.toISOString();

  const checked = await count(db, "select count(*) as count from source_checks where checked_at >= ?", [since]);
  const changed = await count(db, "select count(*) as count from source_checks where checked_at >= ? and changed = 1", [since]);
  const failed = await count(db, "select count(*) as count from source_checks where checked_at >= ? and error is not null", [since]);

  const expired = await count(db, "select count(*) as count from listings where status = 'expired' and updated_at >= ?", [since]);
  const closed = await count(db, "select count(*) as count from listings where status = 'closed' and updated_at >= ?", [since]);
  const reviewRequired = await count(db, "select count(*) as count from listings where status = 'review_required'");

  // rule だけで確定できたもの（人手を経ずに公開に到達した件数）
  const ruleOnly = await count(
    db,
    "select count(*) as count from listings where extraction_method = 'rule' and status = 'active' and updated_at >= ?",
    [since]
  );
  const humanReviewed = await count(
    db,
    "select count(*) as count from listings where extraction_method = 'human' and updated_at >= ?",
    [since]
  );
  const published = await count(db, "select count(*) as count from listings where status = 'active'");

  const events = await db.all<{ event_type: string; count: number }>(
    "select event_type, count(*) as count from analytics_events where created_at >= ? group by event_type",
    [since]
  );
  const byType = Object.fromEntries(events.map((row) => [row.event_type, Number(row.count)]));

  return {
    periodStart: since.slice(0, 10),
    periodEnd: end.toISOString().slice(0, 10),

    sources_checked: checked,
    sources_changed: changed,
    sources_unchanged: Math.max(checked - changed - failed, 0),
    sources_failed: failed,

    listings_expired: expired,
    listings_closed: closed,
    listings_review_required: reviewRequired,

    rule_only_processed: ruleOnly,
    human_review_required: humanReviewed,
    published_listings: published,

    listing_view: byType.listing_view ?? 0,
    official_source_click: byType.official_source_click ?? 0,
    page_view: byType.page_view ?? 0
  };
}
