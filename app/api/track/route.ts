import { getDb } from "../../../lib/db";
import type { AnalyticsEventType } from "../../../lib/types";

/**
 * 匿名アクセス計測 (spec §34)。
 *
 * 個人情報を保存しない。受け取るのは event_type / listing_id / path / anon_session だけ。
 * IP や User-Agent は保存しない。
 */

export const dynamic = "force-dynamic";

/**
 * 自サイトからの送信だけを受け付ける。
 *
 * 認証なしで書き込めるエンドポイントなので、素の curl で
 *   - official_source_click（Demand Validation の主要指標）を捏造される
 *   - D1 無料枠の日次書き込み上限を食い潰される
 * のを防ぐ。navigator.sendBeacon と fetch は Origin を必ず送る。
 *
 * これは量の制御としては最低限で、本命は Cloudflare 側の Rate Limiting
 * （docs/08_ARCHITECTURE.md §4.5）。コードだけで完結させない。
 */
function isAllowedOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;

  const site = process.env.NEXT_PUBLIC_SITE_URL;
  if (site) {
    try {
      return new URL(origin).origin === new URL(site).origin;
    } catch {
      return false;
    }
  }

  // NEXT_PUBLIC_SITE_URL 未設定（開発時）は同一オリジンだけ許可する
  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

const ALLOWED: AnalyticsEventType[] = ["page_view", "listing_view", "official_source_click"];

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  if (!isAllowedOrigin(request)) {
    // 攻撃者に成否を伝えない。正規の利用者と同じ 204 を返す
    return new Response(null, { status: 204 });
  }

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
