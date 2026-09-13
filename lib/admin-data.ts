import { getDb } from "./db";
import { mapListing, mapSource, mapSourceCheck, type SqliteRow } from "./db/rows";
import type { ListingRow, ListingStatus, SourceCheckRow, SourceRow } from "./types";

/** /admin と運用スクリプトが共有する読み取り */

export async function fetchAdminListings(
  filters: { status?: ListingStatus } = {},
  limit = 100
): Promise<ListingRow[]> {
  const db = await getDb();
  const where = filters.status ? "where status = ?" : "";
  const params: unknown[] = filters.status ? [filters.status, limit] : [limit];

  const rows = await db.all<SqliteRow>(
    `select * from listings ${where} order by updated_at desc limit ?`,
    params
  );
  return rows.map(mapListing);
}

/**
 * 人間の確認が必要な Listing。
 *
 * status = 'review_required' に加えて、**公開中に Source が変わったもの**も含める。
 * 後者は公開を止めていないので、ここに出さないと誰も気づけない（scripts/extract.ts）。
 */
export async function fetchListingsNeedingReview(): Promise<ListingRow[]> {
  const db = await getDb();
  const rows = await db.all<SqliteRow>(
    `select * from listings
     where status = 'review_required'
        or (status = 'active' and review_reason is not null)
     order by (status = 'review_required') desc, updated_at desc`
  );
  return rows.map(mapListing);
}

export async function fetchAdminListing(id: string): Promise<ListingRow | null> {
  const db = await getDb();
  const row = await db.first<SqliteRow>("select * from listings where id = ?", [id]);
  return row ? mapListing(row) : null;
}

export async function fetchSources(): Promise<SourceRow[]> {
  const db = await getDb();
  const rows = await db.all<SqliteRow>(
    "select * from sources order by (checked_at is not null), checked_at asc"
  );
  return rows.map(mapSource);
}

export async function fetchRecentChecks(limit = 50): Promise<SourceCheckRow[]> {
  const db = await getDb();
  const rows = await db.all<SqliteRow>(
    "select * from source_checks order by checked_at desc limit ?",
    [limit]
  );
  return rows.map(mapSourceCheck);
}

export async function countListingsByStatus(): Promise<Record<string, number>> {
  const db = await getDb();
  const rows = await db.all<{ status: string; count: number }>(
    "select status, count(*) as count from listings group by status"
  );
  return Object.fromEntries(rows.map((row) => [row.status, Number(row.count)]));
}
