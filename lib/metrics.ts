import { supabaseService } from "./supabase";

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

async function countRows(
  table: string,
  build: (query: any) => any
): Promise<number> {
  const query = build(supabaseService().from(table).select("*", { count: "exact", head: true }));
  const { count, error } = await query;
  if (error) {
    console.error(`[metrics] ${table} の集計に失敗しました:`, error.message);
    return 0;
  }
  return count ?? 0;
}

export async function collectWeeklyMetrics(days = 7): Promise<WeeklyMetrics> {
  const end = new Date();
  const start = new Date(end.getTime() - days * 24 * 60 * 60 * 1000);
  const since = start.toISOString();

  const [
    checked,
    changed,
    failed,
    expired,
    closed,
    reviewRequired,
    ruleOnly,
    humanReviewed,
    published,
    listingView,
    officialClick,
    pageView
  ] = await Promise.all([
    countRows("source_checks", (q) => q.gte("checked_at", since)),
    countRows("source_checks", (q) => q.gte("checked_at", since).eq("changed", true)),
    countRows("source_checks", (q) => q.gte("checked_at", since).not("error", "is", null)),

    countRows("listings", (q) => q.eq("status", "expired").gte("updated_at", since)),
    countRows("listings", (q) => q.eq("status", "closed").gte("updated_at", since)),
    countRows("listings", (q) => q.eq("status", "review_required")),

    // rule だけで確定できたもの（review を経ずに公開に到達した件数）
    countRows("listings", (q) =>
      q.eq("extraction_method", "rule").eq("status", "active").gte("updated_at", since)
    ),
    // 人間が触ったもの
    countRows("listings", (q) => q.eq("extraction_method", "human").gte("updated_at", since)),
    countRows("listings", (q) => q.eq("status", "active")),

    countRows("analytics_events", (q) =>
      q.gte("created_at", since).eq("event_type", "listing_view")
    ),
    countRows("analytics_events", (q) =>
      q.gte("created_at", since).eq("event_type", "official_source_click")
    ),
    countRows("analytics_events", (q) => q.gte("created_at", since).eq("event_type", "page_view"))
  ]);

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

    listing_view: listingView,
    official_source_click: officialClick,
    page_view: pageView
  };
}
