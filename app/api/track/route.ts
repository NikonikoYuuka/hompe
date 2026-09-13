import { NextResponse } from "next/server";
import { hasSupabaseConfig } from "../../../lib/env";
import { supabaseAnon } from "../../../lib/supabase";
import type { AnalyticsEventType } from "../../../lib/types";

/**
 * 匿名アクセス計測 (spec §34)。
 *
 * 個人情報を保存しない。受け取るのは event_type / listing_id / path / anon_session だけ。
 * IP や User-Agent は保存しない。
 */

export const runtime = "nodejs";

const ALLOWED: AnalyticsEventType[] = ["page_view", "listing_view", "official_source_click"];

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  if (!hasSupabaseConfig()) {
    // Supabase 未設定でもユーザー操作を止めない
    return new NextResponse(null, { status: 204 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const input = body as Record<string, unknown>;
  const eventType = input.event_type;
  if (typeof eventType !== "string" || !ALLOWED.includes(eventType as AnalyticsEventType)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const listingId =
    typeof input.listing_id === "string" && UUID.test(input.listing_id) ? input.listing_id : null;
  const path =
    typeof input.path === "string" && input.path.startsWith("/")
      ? input.path.slice(0, 200)
      : null;
  const anonSession =
    typeof input.anon_session === "string" && UUID.test(input.anon_session)
      ? input.anon_session
      : null;

  const { error } = await supabaseAnon().from("analytics_events").insert({
    event_type: eventType,
    listing_id: listingId,
    path,
    anon_session: anonSession
  });

  if (error) {
    console.error("[track] 記録に失敗しました:", error.message);
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  return new NextResponse(null, { status: 204 });
}
