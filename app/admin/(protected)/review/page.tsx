import Link from "next/link";
import type { Metadata } from "next";
import { fetchListingsNeedingReview } from "../../../../lib/admin-data";
import { SAFETY_FLAG_LABELS, STATUS_LABELS } from "../../../../lib/labels";

export const metadata: Metadata = { title: "要確認", robots: { index: false } };
export const dynamic = "force-dynamic";

/**
 * review_required の一覧 (spec §26)。
 *
 * rule で判断できなかったものだけがここに来る。
 * 週あたり何件出るかが、AI 自動化を導入すべきかの判断材料になる。
 */
export default async function AdminReviewPage() {
  const listings = await fetchListingsNeedingReview();

  return (
    <div>
      <h1 className="text-xl font-bold text-ink-50">要確認</h1>
      <p className="mt-1 text-sm text-ink-400">
        コードで確定できなかった案件と、公開中に Source が変わった案件です。{listings.length} 件。
      </p>

      {listings.length === 0 ? (
        <p className="mt-6 text-sm text-ink-200">確認待ちはありません。</p>
      ) : (
        <ul className="mt-6 space-y-3">
          {listings.map((listing) => (
            <li key={listing.id} className="rounded-lg border border-ink-800 bg-ink-900 p-4">
              <span
                className={`mb-1 inline-block rounded px-2 py-0.5 text-xs ${
                  listing.status === "active"
                    ? "bg-sweat-500 text-ink-950"
                    : "bg-ink-800 text-ink-200"
                }`}
              >
                {listing.status === "active" ? "公開中・要確認" : STATUS_LABELS[listing.status]}
              </span>
              <Link
                href={`/admin/listings/${listing.id}`}
                className="block text-sm font-bold text-ink-50 hover:text-sweat-400"
              >
                {listing.title}
              </Link>
              <p className="mt-1 truncate text-xs text-ink-400">{listing.source_url}</p>
              {listing.review_reason && (
                <pre className="mt-2 whitespace-pre-wrap text-xs leading-relaxed text-ink-400">
                  {listing.review_reason}
                </pre>
              )}
              {listing.safety_flags.length > 0 && (
                <p className="mt-2 text-xs text-sweat-400">
                  {listing.safety_flags
                    .map((flag) => SAFETY_FLAG_LABELS[flag] ?? flag)
                    .join(" / ")}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
