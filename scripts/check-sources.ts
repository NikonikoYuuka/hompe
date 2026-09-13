import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { CACHE_DIR, arg, flag } from "./_bootstrap";
import { supabaseService } from "../lib/supabase";
import { getAdapter } from "../sources/registry";
import { judgeFromHttpStatus } from "../lib/lifecycle";
import type { SourceRow } from "../lib/types";

/**
 * 月〜水の巡回 (spec §23 / docs/05_OPERATIONS.md)。
 *
 * AI を使用しない。HTTP status → normalize → hash → 前回 hash 比較、それだけ。
 * 変更があった Source の HTML だけを .cache/sources に置き、木曜の extract が使う。
 *
 * 使い方:
 *   npm run ops:check
 *   npm run ops:check -- --source=<uuid>
 *   npm run ops:check -- --limit=10
 */

async function main() {
  const db = supabaseService();
  const limit = Number(arg("limit") ?? 200);
  const sourceId = arg("source");

  let query = db
    .from("sources")
    .select("*")
    .eq("status", "active")
    // grade D は利用不可なので取得対象から外す (docs/03_SOURCE_POLICY.md)
    .neq("grade", "D")
    .order("checked_at", { ascending: true, nullsFirst: true })
    .limit(limit);

  if (sourceId) query = query.eq("id", sourceId);

  const { data, error } = await query;
  if (error) throw new Error(`sources の取得に失敗しました: ${error.message}`);

  const sources = (data ?? []) as SourceRow[];
  if (sources.length === 0) {
    console.log("対象の Source がありません。");
    return;
  }

  mkdirSync(CACHE_DIR, { recursive: true });

  let changed = 0;
  let failed = 0;
  const now = new Date().toISOString();

  for (const source of sources) {
    const adapter = getAdapter(source.adapter);
    const outcome = await adapter.check(source);

    await db.from("source_checks").insert({
      source_id: source.id,
      http_status: outcome.httpStatus,
      content_hash: outcome.contentHash,
      changed: outcome.changed,
      attempt: outcome.attempts,
      duration_ms: outcome.durationMs,
      error: outcome.error
    });

    const patch: Record<string, unknown> = {
      checked_at: now,
      last_http_status: outcome.httpStatus
    };

    if (outcome.error) {
      failed += 1;
      patch.consecutive_failures = source.consecutive_failures + 1;
      console.log(`✗ ${source.name} — ${outcome.error} (HTTP ${outcome.httpStatus ?? "-"})`);
    } else {
      patch.consecutive_failures = 0;
      patch.last_content_hash = outcome.contentHash;
      if (outcome.changed) {
        changed += 1;
        patch.changed_at = now;
        if (outcome.html) {
          writeFileSync(join(CACHE_DIR, `${source.id}.html`), outcome.html, "utf8");
        }
        console.log(`△ ${source.name} — 変更あり`);
      } else {
        console.log(`  ${source.name} — 変更なし`);
      }
    }

    await db.from("sources").update(patch).eq("id", source.id);

    // 404 / 410 は即 closed にせず、その Source の Listing を review に回す
    const decision = judgeFromHttpStatus(outcome.httpStatus);
    if (decision) {
      const { error: updateError } = await db
        .from("listings")
        .update({ status: decision.status, review_reason: decision.reason })
        .eq("source_id", source.id)
        .in("status", ["active", "scheduled", "draft"]);
      if (updateError) {
        console.error(`  listing の更新に失敗: ${updateError.message}`);
      } else {
        console.log(`  → 関連 Listing を要確認にしました（${decision.reason}）`);
      }
    }
  }

  console.log(
    `\n巡回 ${sources.length}件 / 変更 ${changed}件 / 失敗 ${failed}件 / 変更なし ${
      sources.length - changed - failed
    }件`
  );
  if (changed > 0 && !flag("quiet")) {
    console.log("次: npm run ops:extract");
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
