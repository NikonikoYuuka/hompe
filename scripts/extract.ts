import { existsSync, readFileSync, readdirSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { CACHE_DIR, arg, flag } from "./_bootstrap";
import { supabaseService } from "../lib/supabase";
import { getAdapter } from "../sources/registry";
import { fetchSourcePage } from "../lib/http";
import type { ListingRow, SourceRow } from "../lib/types";

/**
 * 木曜の処理 (docs/05_OPERATIONS.md)。
 *
 * 変更があった Source だけを対象に、コードで Fact を抽出する。
 * **AI を使わない。** rule で確定できないものは review_required にして人間に回す。
 *
 * 使い方:
 *   npm run ops:extract
 *   npm run ops:extract -- --source=<uuid> --refetch
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
  const db = supabaseService();
  const explicitId = arg("source");
  const refetch = flag("refetch");

  const ids = explicitId ? [explicitId] : pendingSourceIds();
  if (ids.length === 0) {
    console.log("処理対象がありません。先に npm run ops:check を実行してください。");
    return;
  }

  const { data, error } = await db.from("sources").select("*").in("id", ids);
  if (error) throw new Error(`sources の取得に失敗しました: ${error.message}`);
  const sources = (data ?? []) as SourceRow[];

  let created = 0;
  let updated = 0;
  let review = 0;
  let skipped = 0;

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
      console.log(`  ${source.name} — 掲載対象の募集を抽出できませんでした`);
      dropCache(source.id);
      continue;
    }

    const { data: existingData } = await db
      .from("listings")
      .select("*")
      .eq("source_url", source.url)
      .maybeSingle();
    const existing = existingData as ListingRow | null;

    // Fact Cache: 確定 Fact が変わっていなければ再判定も更新もしない (D-014)
    if (existing && existing.fact_hash === facts.factHash) {
      await db
        .from("listings")
        .update({ last_verified_at: new Date().toISOString() })
        .eq("id", existing.id);
      console.log(`  ${source.name} — Fact に変更なし（最終確認日のみ更新）`);
      dropCache(source.id);
      continue;
    }

    const needsReview = facts.reviewReasons.length > 0;
    if (needsReview) review += 1;

    const row = {
      source_id: source.id,
      source_url: source.url,
      title: facts.title,
      description: facts.description,
      work_type: facts.workType,
      category: facts.category,
      physical_work: facts.physicalWork,
      eligibility_reason: facts.eligibilityReason,
      reward_type: facts.rewardType,
      pay_text: facts.payText,
      pay_min: facts.payMin,
      pay_max: facts.payMax,
      pay_unit: facts.payUnit,
      expenses_provided: facts.expensesProvided,
      prefecture: facts.prefecture,
      city: facts.city,
      address: facts.address,
      nearest_station: facts.nearestStation,
      qualification_required: facts.qualificationRequired,
      required_qualifications: facts.requiredQualifications,
      availability_type: facts.availabilityType,
      event_date: facts.eventDate,
      event_end_date: facts.eventEndDate,
      application_deadline: facts.applicationDeadline,
      work_hours_text: facts.workHoursText,
      weekend_available: facts.weekendAvailable,
      safety_flags: facts.safetyFlags,
      fact_hash: facts.factHash,
      extraction_method: "rule" as const,
      last_verified_at: new Date().toISOString(),
      // rule で全部確定できたものだけ draft（公開は人が押す）。それ以外は review_required
      status: needsReview ? ("review_required" as const) : ("draft" as const),
      review_reason: needsReview ? facts.reviewReasons.join("\n") : null
    };

    if (existing) {
      // 人間が編集した Listing を rule 抽出で上書きしない。事実が変わったことだけ知らせる。
      if (existing.extraction_method === "human") {
        await db
          .from("listings")
          .update({
            status: "review_required",
            review_reason:
              "Source の内容が変わりました。人間が編集済みのため自動更新していません。\n" +
              facts.reviewReasons.join("\n")
          })
          .eq("id", existing.id);
        review += 1;
        console.log(`△ ${source.name} — 人手編集済みのため要確認にしました`);
      } else {
        await db.from("listings").update(row).eq("id", existing.id);
        updated += 1;
        console.log(`△ ${source.name} — 更新${needsReview ? "（要確認）" : ""}`);
      }
    } else {
      await db.from("listings").insert(row);
      created += 1;
      console.log(`+ ${source.name} — 新規${needsReview ? "（要確認）" : ""}`);
    }

    dropCache(source.id);
  }

  console.log(
    `\n新規 ${created}件 / 更新 ${updated}件 / 要確認 ${review}件 / 対象外 ${skipped}件`
  );
  if (review > 0) console.log("次: /admin/review で確認");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
