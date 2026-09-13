import "./_bootstrap";
import { collectWeeklyMetrics } from "../lib/metrics";

/**
 * 週次 metrics (spec §37)。
 *
 * Technical / Cost Validation はまだ未検証 (docs/01_VALIDATION.md)。
 * この出力を docs/reports/ に貼って、週ごとの推移を残す。
 */
async function main() {
  const days = Number(process.argv.find((a) => a.startsWith("--days="))?.split("=")[1] ?? 7);
  const metrics = await collectWeeklyMetrics(days);

  console.log(`# Weekly metrics ${metrics.periodStart} 〜 ${metrics.periodEnd}\n`);
  for (const [key, value] of Object.entries(metrics)) {
    if (key === "periodStart" || key === "periodEnd") continue;
    console.log(`${key.padEnd(26)} ${value}`);
  }

  const checked = metrics.sources_checked;
  if (checked > 0) {
    const changeRate = ((metrics.sources_changed / checked) * 100).toFixed(1);
    console.log(`\nchanged rate               ${changeRate}%`);
  }
  const handled = metrics.rule_only_processed + metrics.human_review_required;
  if (handled > 0) {
    const reviewRate = ((metrics.human_review_required / handled) * 100).toFixed(1);
    console.log(`human review rate          ${reviewRate}%`);
  }
  console.log(
    "\nメモ: official_source_click が Demand Validation の主要指標です（docs/01_VALIDATION.md）。"
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
