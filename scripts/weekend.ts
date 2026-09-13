import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import "./_bootstrap";
import { getDb } from "../lib/db";
import { mapListing, type SqliteRow } from "../lib/db/rows";
import { upcomingWeekend } from "../lib/lifecycle";
import { CATEGORY_LABELS, formatDate, locationText, rewardText } from "../lib/labels";
import type { ListingRow } from "../lib/types";

/**
 * 金曜の処理 (docs/05_OPERATIONS.md)。
 *
 * 今週末に紹介できる Listing を DB から抽出し、X 投稿候補をテンプレートで組み立てる。
 *
 * 重要:
 *   - AI を使わない。元 Web ページを再読込しない。DB の確定 Fact だけを使う (spec §22)
 *   - X API 自動投稿はしない。出力は候補で、人間が確認して手動投稿する (D-016)
 *   - テンプレートに入るのは事実のみ。効能・感想を足さない (docs/04_EDITORIAL.md)
 */

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://example.com";

/** Brand Layer の枕詞。ここは事実ではないので、案件の内容に踏み込まない一般文にする。 */
const OPENERS = [
  "気づいたら今日もスマホ6時間。だったら外出よう。",
  "土曜の予定がないなら、行ってみる？",
  "平日は頭で稼いだ。週末は身体で。",
  "PC閉じて、汗かいて、ついでにお金ももらう。",
  "心が疲れたら、身体を働かせ。"
];

function postFor(listing: ListingRow, index: number): string {
  const opener = OPENERS[index % OPENERS.length];
  const date = listing.event_date ? formatDate(listing.event_date) : null;
  const facts = [
    date,
    listing.work_hours_text,
    locationText(listing),
    listing.title,
    rewardText(listing)
  ].filter(Boolean);

  return [opener, "", ...facts, "", `${SITE_URL}/listings/${listing.id}`].join("\n");
}

async function main() {
  const db = await getDb();
  const { saturday, sunday } = upcomingWeekend();

  // 日付が確定しているもの（今週末）
  const fixedRows = await db.all<SqliteRow>(
    `select * from listings
     where status = 'active' and availability_type = 'fixed_date'
       and event_date >= ? and event_date <= ?
     order by event_date asc`,
    [saturday, sunday]
  );

  // 土日に働けると Source に記載があるもの（「今週末働ける」とは書かない D-005）
  const recurringRows = await db.all<SqliteRow>(
    `select * from listings
     where status = 'active'
       and availability_type in ('recurring', 'registration')
       and weekend_available = 1
     order by updated_at desc
     limit 10`
  );

  const fixed = fixedRows.map(mapListing);
  const recurring = recurringRows.map(mapListing);

  // 投稿候補は 3〜5本。日付が確定しているものを優先する。
  const picks = [...fixed, ...recurring].slice(0, 5);

  const lines: string[] = [];
  lines.push(`# 今週末（${saturday} 〜 ${sunday}）の紹介候補`);
  lines.push("");
  lines.push(`- 日付確定: ${fixed.length}件`);
  lines.push(`- 土日可（登録制・定期）: ${recurring.length}件`);
  lines.push("");
  lines.push("## X 投稿候補");
  lines.push("");
  lines.push("> 自動投稿しません。内容を確認してから手動で投稿してください。");
  lines.push("> 事実は DB の確定 Fact を使っています。ページを読み直していません。");
  lines.push("");

  picks.forEach((listing, index) => {
    const kind = listing.availability_type === "fixed_date" ? "日付確定" : "土日可";
    const category = listing.category ? CATEGORY_LABELS[listing.category] : "カテゴリ未設定";
    lines.push(`### ${index + 1}. ${listing.title}（${kind} / ${category}）`);
    lines.push("");
    lines.push("```");
    lines.push(postFor(listing, index));
    lines.push("```");
    lines.push("");
  });

  if (picks.length === 0) {
    lines.push("今週末に出せる案件がありません。");
    lines.push("");
  }

  const output = lines.join("\n");
  console.log(output);

  const dir = resolve(process.cwd(), ".cache");
  mkdirSync(dir, { recursive: true });
  const path = resolve(dir, `weekend-${saturday}.md`);
  writeFileSync(path, output, "utf8");
  console.log(`\n保存しました: ${path}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
