import { supabaseService } from "./supabase";
import type { ListingRow, ListingStatus, SourceCheckRow, SourceRow } from "./types";

/** /admin と運用スクリプトが共有する読み取り（service role 経由 = RLS bypass） */

export async function fetchAdminListings(
  filters: { status?: ListingStatus } = {},
  limit = 100
): Promise<ListingRow[]> {
  let query = supabaseService()
    .from("listings")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (filters.status) query = query.eq("status", filters.status);

  const { data, error } = await query;
  if (error) throw new Error(`listings の取得に失敗しました: ${error.message}`);
  return (data ?? []) as ListingRow[];
}

export async function fetchAdminListing(id: string): Promise<ListingRow | null> {
  const { data, error } = await supabaseService()
    .from("listings")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`listing の取得に失敗しました: ${error.message}`);
  return (data as ListingRow) ?? null;
}

export async function fetchSources(): Promise<SourceRow[]> {
  const { data, error } = await supabaseService()
    .from("sources")
    .select("*")
    .order("checked_at", { ascending: true, nullsFirst: true });
  if (error) throw new Error(`sources の取得に失敗しました: ${error.message}`);
  return (data ?? []) as SourceRow[];
}

export async function fetchRecentChecks(limit = 50): Promise<SourceCheckRow[]> {
  const { data, error } = await supabaseService()
    .from("source_checks")
    .select("*")
    .order("checked_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`source_checks の取得に失敗しました: ${error.message}`);
  return (data ?? []) as SourceCheckRow[];
}

export async function countListingsByStatus(): Promise<Record<string, number>> {
  const { data, error } = await supabaseService().from("listings").select("status");
  if (error) throw new Error(`listings の集計に失敗しました: ${error.message}`);
  const counts: Record<string, number> = {};
  for (const row of (data ?? []) as Array<{ status: string }>) {
    counts[row.status] = (counts[row.status] ?? 0) + 1;
  }
  return counts;
}
