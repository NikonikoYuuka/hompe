import Link from "next/link";
import type { PublicListing } from "../../lib/listings";
import {
  CATEGORY_LABELS,
  locationText,
  rewardText,
  scheduleText
} from "../../lib/labels";

/**
 * 一覧に出すカード。**Fact Layer** なので事実だけを出す。
 * 煽り文句・感想・効能を足さない (docs/04_EDITORIAL.md)。
 */
export function ListingCard({ listing }: { listing: PublicListing }) {
  return (
    <li className="rounded-lg border border-ink-800 bg-ink-900 transition hover:border-ink-700">
      <Link href={`/listings/${listing.id}`} className="block p-5">
        <div className="flex flex-wrap items-center gap-2 text-xs text-ink-400">
          {listing.category && (
            <span className="rounded bg-ink-800 px-2 py-0.5 text-ink-200">
              {CATEGORY_LABELS[listing.category]}
            </span>
          )}
          {/* unknown を「有給」に潰さない。記載がなければバッジを出さない (D-006) */}
          {listing.reward_type !== "unknown" && (
            <span>{listing.reward_type === "volunteer" ? "無償" : "有給"}</span>
          )}
        </div>

        <h2 className="mt-3 text-base font-bold leading-snug text-ink-50">{listing.title}</h2>

        <dl className="mt-3 space-y-1 text-sm text-ink-200">
          <div className="flex gap-2">
            <dt className="shrink-0 text-ink-400">日程</dt>
            <dd>{scheduleText(listing)}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="shrink-0 text-ink-400">場所</dt>
            <dd>{locationText(listing)}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="shrink-0 text-ink-400">報酬</dt>
            <dd>{rewardText(listing)}</dd>
          </div>
        </dl>
      </Link>
    </li>
  );
}
