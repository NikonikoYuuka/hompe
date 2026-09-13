import "./_bootstrap";
import { supabaseService } from "../lib/supabase";
import { judgeExpiry, todayIso } from "../lib/lifecycle";
import type { ListingRow } from "../lib/types";

/**
 * 期限切れの掃除 (docs/05_OPERATIONS.md)。
 *
 * 物理削除しない。status を expired にして archive として残す (D-004)。
 * 日次で回してよい。
 */
async function main() {
  const db = supabaseService();
  const today = todayIso();

  const { data, error } = await db
    .from("listings")
    .select("*")
    .in("status", ["active", "scheduled", "draft", "review_required"]);
  if (error) throw new Error(`listings の取得に失敗しました: ${error.message}`);

  const listings = (data ?? []) as ListingRow[];
  let expired = 0;

  for (const listing of listings) {
    const decision = judgeExpiry(listing, today);
    if (!decision) continue;

    const { error: updateError } = await db
      .from("listings")
      .update({ status: decision.status, review_reason: decision.reason })
      .eq("id", listing.id);

    if (updateError) {
      console.error(`✗ ${listing.title} — ${updateError.message}`);
      continue;
    }
    expired += 1;
    console.log(`- ${listing.title} — ${decision.reason}`);
  }

  console.log(`\n確認 ${listings.length}件 / 期限切れ ${expired}件（${today} 基準）`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
