import { cookies } from "next/headers";
import { serverEnv } from "./env";

/**
 * /admin の認証 (D-015)。
 *
 * V0.1 は運用者1人を前提にした共有トークン。ユーザーアカウント機能は作らない。
 * 将来 Cloudflare Access 等へ差し替えられるよう、判定をこのファイルに閉じる。
 *
 * トークンは Cloudflare の secret として登録する（`wrangler secret put ADMIN_TOKEN`）。
 * Worker では process.env ではなく env binding に入るので serverEnv() 経由で読む。
 */

export const ADMIN_COOKIE = "nf_admin";

/**
 * 一定時間比較。Workers には node:crypto の timingSafeEqual が無い場合があるので、
 * Web 標準の範囲で実装する。
 */
function safeEqual(a: string, b: string): boolean {
  const left = new TextEncoder().encode(a);
  const right = new TextEncoder().encode(b);
  if (left.length !== right.length) return false;
  let diff = 0;
  for (let i = 0; i < left.length; i++) diff |= left[i] ^ right[i];
  return diff === 0;
}

export async function adminTokenConfigured(): Promise<boolean> {
  return Boolean(await serverEnv("ADMIN_TOKEN"));
}

export async function verifyAdminToken(token: string): Promise<boolean> {
  const expected = await serverEnv("ADMIN_TOKEN");
  if (!expected) return false;
  return safeEqual(token, expected);
}

export async function isAdminAuthenticated(): Promise<boolean> {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  return Boolean(token && (await verifyAdminToken(token)));
}
