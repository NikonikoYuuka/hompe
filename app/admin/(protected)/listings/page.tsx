import Link from "next/link";
import type { Metadata } from "next";
import { fetchAdminListings, countListingsByStatus } from "../../../../lib/admin-data";
import { STATUS_LABELS } from "../../../../lib/labels";
import type { ListingStatus } from "../../../../lib/types";

export const metadata: Metadata = { title: "Listing 一覧", robots: { index: false } };
export const dynamic = "force-dynamic";

const STATUSES = Object.keys(STATUS_LABELS) as ListingStatus[];

export default async function AdminListingsPage({
  searchParams
}: {
  searchParams: { status?: string };
}) {
  const status = STATUSES.includes(searchParams.status as ListingStatus)
    ? (searchParams.status as ListingStatus)
    : undefined;

  const [listings, counts] = await Promise.all([
    fetchAdminListings({ status }),
    countListingsByStatus()
  ]);

  return (
    <div>
      <h1 className="text-xl font-bold text-ink-50">Listing</h1>

      <div className="mt-4 flex flex-wrap gap-2 text-sm">
        <Link
          href="/admin/listings"
          className={`rounded px-3 py-1 ${!status ? "bg-ink-50 text-ink-950" : "bg-ink-800 text-ink-200"}`}
        >
          すべて
        </Link>
        {STATUSES.map((key) => (
          <Link
            key={key}
            href={`/admin/listings?status=${key}`}
            className={`rounded px-3 py-1 ${
              status === key ? "bg-ink-50 text-ink-950" : "bg-ink-800 text-ink-200"
            }`}
          >
            {STATUS_LABELS[key]} {counts[key] ?? 0}
          </Link>
        ))}
      </div>

      <ul className="mt-6 divide-y divide-ink-800">
        {listings.map((listing) => (
          <li key={listing.id} className="py-3">
            <Link href={`/admin/listings/${listing.id}`} className="block hover:text-sweat-400">
              <span className="text-xs text-ink-400">{STATUS_LABELS[listing.status]}</span>
              <span className="mt-1 block text-sm text-ink-50">{listing.title}</span>
              <span className="mt-1 block truncate text-xs text-ink-400">
                {listing.source_url}
              </span>
            </Link>
          </li>
        ))}
      </ul>

      {listings.length === 0 && <p className="mt-6 text-sm text-ink-400">該当なし。</p>}
    </div>
  );
}
