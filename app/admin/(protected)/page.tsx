import Link from "next/link";
import type { Metadata } from "next";
import { collectWeeklyMetrics } from "../../../lib/metrics";
import { hasSupabaseConfig } from "../../../lib/env";

export const metadata: Metadata = { title: "管理", robots: { index: false } };

/** 件数サマリと週次 metrics (spec §37)。高機能 CMS は作らない。 */
export default async function AdminHomePage() {
  if (!hasSupabaseConfig()) {
    return <p className="text-sm text-sweat-400">Supabase が未設定です。</p>;
  }

  const metrics = await collectWeeklyMetrics();

  const groups: Array<{ title: string; rows: Array<[string, number]> }> = [
    {
      title: "Source（直近7日）",
      rows: [
        ["sources_checked", metrics.sources_checked],
        ["sources_changed", metrics.sources_changed],
        ["sources_unchanged", metrics.sources_unchanged],
        ["sources_failed", metrics.sources_failed]
      ]
    },
    {
      title: "Listing",
      rows: [
        ["published_listings", metrics.published_listings],
        ["listings_review_required", metrics.listings_review_required],
        ["listings_expired", metrics.listings_expired],
        ["listings_closed", metrics.listings_closed]
      ]
    },
    {
      title: "処理の内訳（直近7日）",
      rows: [
        ["rule_only_processed", metrics.rule_only_processed],
        ["human_review_required", metrics.human_review_required]
      ]
    },
    {
      title: "ユーザー行動（直近7日）",
      rows: [
        ["page_view", metrics.page_view],
        ["listing_view", metrics.listing_view],
        ["official_source_click", metrics.official_source_click]
      ]
    }
  ];

  return (
    <div>
      <h1 className="text-xl font-bold text-ink-50">概要</h1>
      <p className="mt-1 text-sm text-ink-400">
        {metrics.periodStart} 〜 {metrics.periodEnd}
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {groups.map((group) => (
          <section key={group.title} className="rounded-lg border border-ink-800 bg-ink-900 p-5">
            <h2 className="text-sm font-bold text-ink-50">{group.title}</h2>
            <dl className="mt-3 space-y-1 text-sm">
              {group.rows.map(([label, value]) => (
                <div key={label} className="flex justify-between gap-4">
                  <dt className="text-ink-400">{label}</dt>
                  <dd className="tabular-nums text-ink-50">{value}</dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>

      {metrics.listings_review_required > 0 && (
        <p className="mt-6 text-sm">
          <Link href="/admin/review" className="text-sweat-400 underline underline-offset-4">
            要確認が {metrics.listings_review_required} 件あります
          </Link>
        </p>
      )}

      <p className="mt-8 text-xs leading-relaxed text-ink-400">
        official_source_click が Demand Validation の主要指標です
        （docs/01_VALIDATION.md）。X 投稿数・記事数は成功指標にしません。
      </p>
    </div>
  );
}
