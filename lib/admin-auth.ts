import { cookies } from "next/headers";
import { timingSafeEqual } from "node:crypto";
import { optionalEnv } from "./env";

/**
 * /admin の認証 (D-015)。
 *
 * V0.1 は運用者1人を前提にした共有トークン。ユーザーアカウント機能は作らない。
 * 将来 Supabase Auth へ差し替えられるよう、判定をこのファイルに閉じる。
 */

export const ADMIN_COOKIE = "nf_admin";

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export function adminTokenConfigured(): boolean {
  return Boolean(optionalEnv("ADMIN_TOKEN"));
}

export function verifyAdminToken(token: string): boolean {
  const expected = optionalEnv("ADMIN_TOKEN");
  if (!expected) return false;
  return safeEqual(token, expected);
}

export function isAdminAuthenticated(): boolean {
  const token = cookies().get(ADMIN_COOKIE)?.value;
  return Boolean(token && verifyAdminToken(token));
}
