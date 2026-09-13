"use client";

import { useEffect } from "react";
import { track } from "../../lib/analytics";

/** Listing 詳細の閲覧を1回だけ送る */
export function ListingViewTracker({ listingId }: { listingId: string }) {
  useEffect(() => {
    track("listing_view", { listingId });
  }, [listingId]);

  return null;
}
