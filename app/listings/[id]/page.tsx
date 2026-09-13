import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { AdSlot } from "../../_components/ad-slot";
import { ListingViewTracker } from "../../_components/listing-view-tracker";
import { OfficialSourceLink } from "../../_components/official-source-link";
import {
  CATEGORY_LABELS,
  SAFETY_FLAG_LABELS,
  formatDate,
  formatVerifiedAt,
  hostnameOf,
  locationText,
  qualificationText,
  rewardText,
  scheduleText
} from "../../../lib/labels";
import { fetchPublicListing } from "../../../lib/listings";

/**
 * Listing 詳細 = **Fact Layer**。
 *
 * 表示するのは Source にあった事実と、その最終確認日・情報元だけ。
 * 「肉体副業メモ」は人間が書いた場合のみ、Fact と視覚的に分離して表示する (D-006)。
 * 主要 CTA は「公式サイトで詳細を見る」。サイト内応募はしない (D-012)。
 */

// D1 binding はリクエスト時にしか無いので、ビルド時のプリレンダリングを行わない
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const listing = await fetchPublicListing(id);
  if (!listing) return { title: "案件が見つかりません" };
  return {
    title: listing.title,
    description: listing.description?.slice(0, 120) ?? undefined
  };
}

export default async function ListingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const listing = await fetchPublicListing(id);
  if (!listing) notFound();

  const facts: Array<{ label: string; value: string }> = [
    { label: "日程", value: scheduleText(listing) },
    { label: "場所", value: locationText(listing) },
    { label: "報酬", value: rewardText(listing) },
    { label: "資格", value: qualificationText(listing) }
  ];

  if (listing.application_deadline) {
    facts.push({
      label: "応募締切",
      value: formatDate(listing.application_deadline) ?? listing.application_deadline
    });
  }
  if (listing.meeting_point) {
    facts.push({ label: "集合場所", value: listing.meeting_point });
  }
  if (listing.benefits_text) {
    facts.push({ label: "食事・宿泊", value: listing.benefits_text });
  }
  if (listing.schedule_note) {
    facts.push({ label: "日程の補足", value: listing.schedule_note });
  }

  return (
    <article className="mx-auto max-w-3xl px-5 py-10">
      <ListingViewTracker listingId={listing.id} />

      <nav className="text-sm text-ink-400">
        <Link href="/listings" className="underline underline-offset-4 hover:text-ink-200">
          案件一覧
        </Link>
      </nav>

      <header className="mt-4">
        <div className="flex flex-wrap gap-2 text-xs text-ink-400">
          {listing.category && (
            <span className="rounded bg-ink-800 px-2 py-0.5 text-ink-200">
              {CATEGORY_LABELS[listing.category]}
            </span>
          )}
          {listing.purpose_tags.map((tag) => (
            <span key={tag} className="rounded bg-ink-800 px-2 py-0.5 text-ink-200">
              {tag}
            </span>
          ))}
        </div>
        <h1 className="mt-3 text-2xl font-bold leading-snug text-ink-50">{listing.title}</h1>
      </header>

      {/* ---- Fact Layer ---- */}
      <section className="mt-8">
        <h2 className="text-sm font-bold text-ink-400">募集情報</h2>
        <dl className="mt-2">
          {facts.map((fact) => (
            <div key={fact.label} className="fact-row">
              <dt className="fact-label">{fact.label}</dt>
              <dd className="fact-value">{fact.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      {listing.description && (
        <section className="mt-8">
          <h2 className="text-sm font-bold text-ink-400">公式ページの記載</h2>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-ink-200">
            {listing.description}
          </p>
        </section>
      )}

      {/* ---- Editorial Layer（人間が書いた場合のみ） ---- */}
      {listing.editorial_note && (
        <section className="mt-8 rounded-lg border border-ink-800 bg-ink-900 p-5">
          <h2 className="text-sm font-bold text-sweat-400">肉体副業メモ</h2>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-ink-200">
            {listing.editorial_note}
          </p>
          <p className="mt-3 text-xs text-ink-400">
            編集部のメモです。募集内容そのものは上の「募集情報」と公式サイトを確認してください。
          </p>
        </section>
      )}

      {listing.safety_flags.length > 0 && (
        <section className="mt-8 rounded-lg border border-ink-700 p-5">
          <h2 className="text-sm font-bold text-ink-200">確認しておきたい点</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-ink-400">
            {listing.safety_flags.map((flag) => (
              <li key={flag}>{SAFETY_FLAG_LABELS[flag] ?? flag}</li>
            ))}
          </ul>
        </section>
      )}

      {/* ---- CTA ---- */}
      <section className="mt-10 border-t border-ink-800 pt-8">
        <OfficialSourceLink listingId={listing.id} url={listing.source_url} />
        <p className="mt-4 text-xs leading-relaxed text-ink-400">
          応募の受付・仲介は行っていません。募集の最新状況、応募方法、条件は公式ページで確認してください。
        </p>
      </section>

      <footer className="mt-8 border-t border-ink-800 pt-6 text-xs text-ink-400">
        <p>情報元：{hostnameOf(listing.source_url)}</p>
        {listing.last_verified_at && (
          <p className="mt-1">最終確認：{formatVerifiedAt(listing.last_verified_at)}</p>
        )}
      </footer>

      {/* CTA から離す。誤クリックを誘発する配置にしない (spec §47) */}
      <AdSlot placement="listing_detail" />
    </article>
  );
}
