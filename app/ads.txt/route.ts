import { adsensePublisherId } from "../../lib/ads";

/**
 * ads.txt (spec §47)。
 *
 * パブリッシャー ID はハードコードせず環境変数から組み立てる。
 * 未設定なら 404 を返す（中途半端な ads.txt を置かない）。
 */
export const dynamic = "force-static";
export const revalidate = 86400;

export function GET() {
  const publisherId = adsensePublisherId();
  if (!publisherId) {
    return new Response("Not Found", { status: 404 });
  }

  // AdSense が指定する1行。DIRECT と認証局 ID は AdSense 共通の固定値。
  const body = `google.com, ${publisherId}, DIRECT, f08c47fec0942fa0\n`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=86400"
    }
  });
}
