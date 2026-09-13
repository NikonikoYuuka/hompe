import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { arg } from "./_bootstrap";
import { supabaseService } from "../lib/supabase";
import type { SourceGrade, SourceType } from "../lib/types";

/**
 * 初期 Source の登録 (spec §44 Step 5)。
 *
 * Source は JSON ファイルで管理し、Source Gate の確認結果を一緒に記録する。
 * **第三者求人媒体を Production Fact Source として登録しない (D-002)。**
 * 発見経路は discovery_origin に書く（Fact 取得元ではない）。
 *
 * 使い方:
 *   npm run ops:seed
 *   npm run ops:seed -- --file=sources/seed/sources.json
 */

interface SeedSource {
  url: string;
  name: string;
  entity_name?: string;
  source_type: SourceType;
  grade: SourceGrade;
  acquisition_method?: string;
  terms_url?: string;
  terms_notes?: string;
  robots_notes?: string;
  permission_notes?: string;
  removal_contact?: string;
  discovery_origin?: string;
  adapter?: string;
  notes?: string;
}

/** Production Fact Source にしないと判断済みのドメイン (docs/03_SOURCE_POLICY.md §5) */
const BLOCKED_HOSTS = [
  "indeed.com",
  "jp.indeed.com",
  "baitoru.com",
  "j-sen.jp",
  "shotworks.jp",
  "sharefull.com",
  "agrijob.jp",
  "agrinavi.jp",
  "activo.jp"
];

function hostOf(url: string): string {
  return new URL(url).hostname.replace(/^www\./, "");
}

async function main() {
  const file = arg("file") ?? "sources/seed/sources.json";
  const path = resolve(process.cwd(), file);

  if (!existsSync(path)) {
    console.error(`${file} がありません。`);
    console.error("sources/seed/sources.example.json をコピーして作成してください。");
    process.exit(1);
  }

  const seeds = JSON.parse(readFileSync(path, "utf8")) as SeedSource[];
  const db = supabaseService();

  let inserted = 0;
  let updated = 0;
  let rejected = 0;

  for (const seed of seeds) {
    const host = hostOf(seed.url);

    if (BLOCKED_HOSTS.some((blocked) => host === blocked || host.endsWith(`.${blocked}`))) {
      rejected += 1;
      console.error(
        `✗ ${seed.name} — ${host} は Production Fact Source にしない判断です (D-002)。` +
          " 会社を発見した経路であれば discovery_origin に書いてください。"
      );
      continue;
    }

    if (seed.grade === "D") {
      rejected += 1;
      console.error(`✗ ${seed.name} — grade D（利用不可）は登録しません。`);
      continue;
    }

    const row = {
      url: seed.url,
      name: seed.name,
      entity_name: seed.entity_name ?? null,
      source_type: seed.source_type,
      grade: seed.grade,
      acquisition_method: seed.acquisition_method ?? "http_fetch",
      terms_url: seed.terms_url ?? null,
      terms_notes: seed.terms_notes ?? null,
      robots_notes: seed.robots_notes ?? null,
      permission_notes: seed.permission_notes ?? null,
      removal_contact: seed.removal_contact ?? null,
      discovery_origin: seed.discovery_origin ?? null,
      adapter: seed.adapter ?? "generic",
      notes: seed.notes ?? null
    };

    const { data: existing } = await db
      .from("sources")
      .select("id")
      .eq("url", seed.url)
      .maybeSingle();

    if (existing) {
      const { error } = await db.from("sources").update(row).eq("id", existing.id);
      if (error) {
        console.error(`✗ ${seed.name} — ${error.message}`);
        continue;
      }
      updated += 1;
      console.log(`△ ${seed.name} — 更新`);
    } else {
      const { error } = await db.from("sources").insert(row);
      if (error) {
        console.error(`✗ ${seed.name} — ${error.message}`);
        continue;
      }
      inserted += 1;
      console.log(`+ ${seed.name} — 登録`);
    }
  }

  console.log(`\n登録 ${inserted}件 / 更新 ${updated}件 / 却下 ${rejected}件`);
  if (inserted + updated > 0) console.log("次: npm run ops:check");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
