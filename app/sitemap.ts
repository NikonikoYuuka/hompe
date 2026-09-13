import type { MetadataRoute } from "next";
import { fetchPublicListings } from "../lib/listings";

/**
 * 公開中の Listing だけを載せる。
 * expired / closed は archive として DB に残すが、index させない (D-004)。
 */
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL;
  if (!base) return [];

  const listings = await fetchPublicListings({}, 200);

  return [
    { url: base, changeFrequency: "weekly" as const },
    { url: `${base}/listings`, changeFrequency: "weekly" as const },
    { url: `${base}/about`, changeFrequency: "monthly" as const },
    { url: `${base}/privacy`, changeFrequency: "monthly" as const },
    ...listings.map((listing) => ({
      url: `${base}/listings/${listing.id}`,
      lastModified: listing.published_at ?? undefined,
      changeFrequency: "weekly" as const
    }))
  ];
}
