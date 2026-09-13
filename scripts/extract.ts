import { existsSync, readFileSync, readdirSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { CACHE_DIR, arg, flag } from "./_bootstrap";
import { getDb, newId, nowIso } from "../lib/db";
import { fromBool, fromList, mapListing, mapSource, type SqliteRow } from "../lib/db/rows";
import { getAdapter } from "../sources/registry";
import { fetchSourcePage } from "../lib/http";

/**
 * 木曜の処理 (docs/05_OPERATIONS.md)。
 *
 * 変更があった Source だけを対象に、コードで Fact を抽出する。
 * **AI を使わない。** rule で確定できないものは review_required にして人間に回す。
 *
 * 使い方:
 *   npm run ops:extract
 *   npm run ops:extract -- --refetch            … .cache を使わず取り直す
 *   npm run ops:extract -- --since=2026-09-01   … changed_at がこれ以降の Source を対象にする
 *   npm run ops:extract -- --source=<id>
 */

function cachedHtml(sourceId: string): string | null {
  const path = join(CACHE_DIR, `${sourceId}.html`);
  return existsSync(path) ? readFileSync(path, "utf8") : null;
}

function dropCache(sourceId: string): void {
  const path = join(CACHE_DIR, `${sourceId}.html`);
  if (existsSync(path)) unlinkSync(path);
}

function pendingSourceIds(): string[] {
  if (!existsSync(CACHE_DIR)) return [];
  return readdirSync(CACHE_DIR)
    .filter((name) => name.endsWith(".html"))
    .map((name) => name.replace(/\.html$/, ""));
}

async function main() {
  const db = await getDb();
  const explicitId = arg("source");
  const since = arg("since");
  const refetch = flag("refetch");

  /**
   * 対象の決め方:
   *   1. --source=<id> があればそれだけ
   *   2. --since=<date> があれば changed_at がそれ以降の Source（CI 向け。.cache を共有できないため）
   *   3. それ以外は .cache に残っている Source（手元での通常運用）
   */
  let rows: SqliteRow[];
  if (explicitId) {
    rows = await db.all<SqliteRow>("select * from sources where id = ?", [explicitId]);
  } else if (since) {
    rows = await db.all<SqliteRow>(
      "select * from sources where changed_at is not null and changed_at >= ? and status = 'active' and grade <> 'D'",
      [since]
    );
  } else {
    const ids = pendingSourceIds();
    if (ids.length === 0) {
      console.log("処理対象がありません。先に npm run ops:check を実行してください。");
      console.log("（CI で .cache を共有できない場合は --since=YYYY-MM-DD --refetch を使う）");
      return;
    }
    const placeholders = ids.map(() => "?").join(", ");
    rows = await db.all<SqliteRow>(`select * from sources where id in (${placeholders})`, ids);
  }

  const sources = rows.map(mapSource);
  if (sources.length === 0) {
    console.log("処理対象がありません。");
    return;
  }

  let created = 0;
  let updated = 0;
  let review = 0;
  let skipped = 0;
  let changedWhilePublished = 0;

  for (const source of sources) {
    let html = refetch ? null : cachedHtml(source.id);
    if (!html) {
      const result = await fetchSourcePage(source.url);
      html = result.body;
      if (!html) {
        console.log(`✗ ${source.name} — 取得できませんでした (${result.error})`);
        continue;
      }
    }

    const adapter = getAdapter(source.adapter);
    const facts = adapter.extract(html, source);

    if (!facts) {
      skipped += 1;
      console.log(
        `  ${source.name} — 掲載対象外（身体を使う仕事でない / 副業向きの雇用形態でない / 本文が短い）`
      );
      dropCache(source.id);
      continue;
    }

    const existingRow = await db.first<SqliteRow>("select * from listings where source_url = ?", [
      source.url
    ]);
    const existing = existingRow ? mapListing(existingRow) : null;

    // Fact Cache: 確定 Fact が変わっていなければ再判定も更新もしない (D-014)
    if (existing && existing.fact_hash === facts.factHash) {
      await db.run("update listings set last_verified_at = ? where id = ?", [
        nowIso(),
        existing.id
      ]);
      console.log(`  ${source.name} — Fact に変更なし（最終確認日のみ更新）`);
      dropCache(source.id);
      continue;
    }

    const needsReview = facts.reviewReasons.length > 0;
    if (needsReview) review += 1;

    // 人間が編集した Listing を rule 抽出で上書きしない。事実が変わったことだけ知らせる。
    if (existing && existing.extraction_method === "human") {
      await db.run("update listings set status = ?, review_reason = ? where id = ?", [
        "review_required",
        "Source の内容が変わりました。人間が編集済みのため自動更新していません。\n" +
          facts.reviewReasons.join("\n"),
        existing.id
      ]);
      console.log(`△ ${source.name} — 人手編集済みのため要確認にしました`);
      dropCache(source.id);
      continue;
    }

    /**
     * 公開中の Listing は、rule 抽出の結果で **下げも書き換えもしない**。
     *
     * 以前は status を無条件に draft / review_required で上書きしていたため、
     * 「編集せず公開ボタンだけ押した」案件（= extraction_method が 'rule' のまま）が
     * Source の些細な変更で公開停止されていた。
     *
     * ここでやるのは「Source が変わった」と記録することだけ。
     * 下げるか直すかは人間が /admin/review で決める。
     * last_verified_at も更新しない（確認していない事実を「確認済み」と表示しない）。
     */
    if (existing && existing.status === "active") {
      await db.run("update listings set review_reason = ? where id = ?", [
        "Source の内容が変わりました。公開中のため自動更新していません。内容を確認してください。\n" +
          facts.reviewReasons.join("\n"),
        existing.id
      ]);
      changedWhilePublished += 1;
      console.log(`! ${source.name} — 公開中に Source が変わりました（要確認・公開は継続）`);
      dropCache(source.id);
      continue;
    }

    const values: Record<string, unknown> = {
      source_id: source.id,
      source_url: source.url,
      title: facts.title,
      description: facts.description,
      work_type: facts.workType,
      category: facts.category,
      physical_work: fromBool(facts.physicalWork),
      eligibility_reason: facts.eligibilityReason,
      reward_type: facts.rewardType,
      pay_text: facts.payText,
      pay_min: facts.payMin,
      pay_max: facts.payMax,
      pay_unit: facts.payUnit,
      expenses_provided: fromBool(facts.expensesProvided),
      prefecture: facts.prefecture,
      city: facts.city,
      address: facts.address,
      nearest_station: facts.nearestStation,
      qualification_required: fromBool(facts.qualificationRequired),
      required_qualifications: fromList(facts.requiredQualifications),
      availability_type: facts.availabilityType,
      event_date: facts.eventDate,
      event_end_date: facts.eventEndDate,
      application_deadline: facts.applicationDeadline,
      work_hours_text: facts.workHoursText,
      weekend_available: fromBool(facts.weekendAvailable),
      safety_flags: fromList(facts.safetyFlags),
      fact_hash: facts.factHash,
      extraction_method: "rule",
      last_verified_at: nowIso(),
      // rule で全部確定できたものだけ draft（公開は人が押す）。それ以外は review_required
      status: needsReview ? "review_required" : "draft",
      review_reason: needsReview ? facts.reviewReasons.join("\n") : null
    };

    const keys = Object.keys(values);

    if (existing) {
      await db.run(
        `update listings set ${keys.map((key) => `${key} = ?`).join(", ")} where id = ?`,
        [...keys.map((key) => values[key]), existing.id]
      );
      updated += 1;
      console.log(`△ ${source.name} — 更新${needsReview ? "（要確認）" : ""}`);
    } else {
      await db.run(
        `insert into listings (id, ${keys.join(", ")})
         values (${["?", ...keys.map(() => "?")].join(", ")})`,
        [newId(), ...keys.map((key) => values[key])]
      );
      created += 1;
      console.log(`+ ${source.name} — 新規${needsReview ? "（要確認）" : ""}`);
    }

    dropCache(source.id);
  }

  console.log(
    `\n新規 ${created}件 / 更新 ${updated}件 / 要確認 ${review}件 / 対象外 ${skipped}件` +
      ` / 公開中に変更 ${changedWhilePublished}件`
  );
  if (review + changedWhilePublished > 0) console.log("次: /admin/review で確認");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
