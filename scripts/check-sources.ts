import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { CACHE_DIR, arg, flag } from "./_bootstrap";
import { getDb, nowIso, type Db } from "../lib/db";
import { mapSource, type SqliteRow } from "../lib/db/rows";
import { getAdapter } from "../sources/registry";
import { judgeFromHttpStatus } from "../lib/lifecycle";
import type { SourceRow } from "../lib/types";

/** これを超える割合の Source が失敗したら、ジョブを失敗として終了する */
const FAILURE_RATE_THRESHOLD = 0.3;

/**
 * 月〜水の巡回 (spec §23 / docs/05_OPERATIONS.md)。
 *
 * AI を使用しない。HTTP status → normalize → hash → 前回 hash 比較、それだけ。
 * 変更があった Source の HTML だけを .cache/sources に置き、木曜の extract が使う。
 *
 * 使い方:
 *   npm run ops:check
 *   npm run ops:check -- --source=<id>
 *   npm run ops:check -- --limit=10
 */

async function main() {
  const db = await getDb();
  const limit = Number(arg("limit") ?? 200);
  const sourceId = arg("source");

  // grade D は利用不可なので取得対象から外す (docs/03_SOURCE_POLICY.md)
  const where = ["status = 'active'", "grade <> 'D'"];
  const params: unknown[] = [];
  if (sourceId) {
    where.push("id = ?");
    params.push(sourceId);
  }
  params.push(limit);

  const rows = await db.all<SqliteRow>(
    `select * from sources where ${where.join(" and ")}
     order by (checked_at is not null), checked_at asc limit ?`,
    params
  );
  const sources = rows.map(mapSource);

  if (sources.length === 0) {
    console.log("対象の Source がありません。");
    return;
  }

  mkdirSync(CACHE_DIR, { recursive: true });

  const now = nowIso();
  let changed = 0;
  let failed = 0;

  for (const source of sources) {
    try {
      const result = await checkOne(db, source, now);
      if (result === "changed") changed += 1;
      if (result === "failed") failed += 1;
    } catch (error) {
      // 1件の失敗で週次巡回全体を止めない。最後にまとめて赤くする
      failed += 1;
      console.log(
        `✗ ${source.name} — 処理中にエラー: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
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

  /**
   * 「全 Source が 403 でも緑で終わる」状態を作らない。
   * 通知経路が GitHub Actions の失敗メールしかないので、ここで赤くする。
   */
  const failureRate = failed / sources.length;
  if (failureRate > FAILURE_RATE_THRESHOLD) {
    console.error(
      `\n失敗率 ${(failureRate * 100).toFixed(0)}% が閾値 ${(
        FAILURE_RATE_THRESHOLD * 100
      ).toFixed(0)}% を超えました。Source 側の拒否やネットワーク障害を疑ってください。`
    );
    process.exitCode = 1;
  }
}

type CheckResult = "changed" | "unchanged" | "failed";

/** Source 1件をチェックして DB に反映する */
async function checkOne(db: Db, source: SourceRow, now: string): Promise<CheckResult> {
  const adapter = getAdapter(source.adapter);
  const outcome = await adapter.check(source);

  await db.run(
    `insert into source_checks
       (source_id, checked_at, http_status, content_hash, changed, attempt, duration_ms, error)
     values (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      source.id,
      now,
      outcome.httpStatus,
      outcome.contentHash,
      outcome.changed ? 1 : 0,
      outcome.attempts,
      outcome.durationMs,
      outcome.error
    ]
  );

  let result: CheckResult;

  if (outcome.error) {
    result = "failed";
    await db.run(
      `update sources
         set checked_at = ?, last_http_status = ?, consecutive_failures = consecutive_failures + 1
       where id = ?`,
      [now, outcome.httpStatus, source.id]
    );
    console.log(`✗ ${source.name} — ${outcome.error} (HTTP ${outcome.httpStatus ?? "-"})`);
  } else if (outcome.changed) {
    result = "changed";
    await db.run(
      `update sources
         set checked_at = ?, last_http_status = ?, consecutive_failures = 0,
             last_content_hash = ?, changed_at = ?
       where id = ?`,
      [now, outcome.httpStatus, outcome.contentHash, now, source.id]
    );
    if (outcome.html) {
      writeFileSync(join(CACHE_DIR, `${source.id}.html`), outcome.html, "utf8");
    }
    console.log(`△ ${source.name} — 変更あり`);
  } else {
    result = "unchanged";
    await db.run(
      `update sources
         set checked_at = ?, last_http_status = ?, consecutive_failures = 0, last_content_hash = ?
       where id = ?`,
      [now, outcome.httpStatus, outcome.contentHash, source.id]
    );
    console.log(`  ${source.name} — 変更なし`);
  }

  // 404 / 410 は即 closed にせず、その Source の Listing を review に回す
  const decision = judgeFromHttpStatus(outcome.httpStatus);
  if (decision) {
    const updated = await db.run(
      `update listings set status = ?, review_reason = ?
       where source_id = ? and status in ('active', 'scheduled', 'draft')`,
      [decision.status, decision.reason, source.id]
    );
    if (updated.changes > 0) {
      console.log(`  → 関連 Listing ${updated.changes}件を要確認にしました（${decision.reason}）`);
    }
  }

  return result;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
