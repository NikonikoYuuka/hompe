import "./_bootstrap";
import { getDb } from "../lib/db";
import { mapListing, type SqliteRow } from "../lib/db/rows";
import { judgeExpiry, todayIso } from "../lib/lifecycle";

/**
 * 期限切れの掃除 (docs/05_OPERATIONS.md)。
 *
 * 物理削除しない。status を expired にして archive として残す (D-004)。
 * 日次で回してよい。
 */
async function main() {
  const db = await getDb();
  const today = todayIso();

  const rows = await db.all<SqliteRow>(
    `select * from listings where status in ('active', 'scheduled', 'draft', 'review_required')`
  );
  const listings = rows.map(mapListing);

  let expired = 0;

  for (const listing of listings) {
    const decision = judgeExpiry(listing, today);
    if (!decision) continue;

    await db.run("update listings set status = ?, review_reason = ? where id = ?", [
      decision.status,
      decision.reason,
      listing.id
    ]);
    expired += 1;
    console.log(`- ${listing.title} — ${decision.reason}`);
  }

  console.log(`\n確認 ${listings.length}件 / 期限切れ ${expired}件（${today} 基準）`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
