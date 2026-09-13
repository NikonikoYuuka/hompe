import { getDb } from "../../../lib/db";
import type { AnalyticsEventType } from "../../../lib/types";

/**
 * 匿名アクセス計測 (spec §34)。
 *
 * 個人情報を保存しない。受け取るのは event_type / listing_id / path / anon_session だけ。
 * IP や User-Agent は保存しない。
 */

export const dynamic = "force-dynamic";

const ALLOWED: AnalyticsEventType[] = ["page_view", "listing_view", "official_source_click"];

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response(null, { status: 400 });
  }

  const input = body as Record<string, unknown>;
  const eventType = input.event_type;
  if (typeof eventType !== "string" || !ALLOWED.includes(eventType as AnalyticsEventType)) {
    return new Response(null, { status: 400 });
  }

  const listingId =
    typeof input.listing_id === "string" && UUID.test(input.listing_id) ? input.listing_id : null;
  const path =
    typeof input.path === "string" && input.path.startsWith("/") ? input.path.slice(0, 200) : null;
  const anonSession =
    typeof input.anon_session === "string" && UUID.test(input.anon_session)
      ? input.anon_session
      : null;

  try {
    const db = await getDb();
    await db.run(
      "insert into analytics_events (event_type, listing_id, path, anon_session) values (?, ?, ?, ?)",
      [eventType, listingId, path, anonSession]
    );
  } catch (error) {
    // 計測の失敗でユーザー操作を止めない
    console.error("[track] 記録に失敗しました:", error);
    return new Response(null, { status: 204 });
  }

  return new Response(null, { status: 204 });
}
