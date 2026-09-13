import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { requiredEnv } from "./env";

/**
 * 肉体副業 V0.1 の Supabase クライアント。
 *
 * 公開側はログイン不要なので auth-helpers は使わず、supabase-js を直接使う。
 *   - anon client  : 公開中 Listing の読み取り / analytics の insert（RLS 適用）
 *   - service client: 運用スクリプトと /admin（RLS を bypass するのでサーバ側限定）
 *
 * 既存の retro-homepage 用 client は legacy/retro-homepage/supabase-client.ts に退避済み。
 */

let anonClient: SupabaseClient | null = null;
let serviceClient: SupabaseClient | null = null;

export function supabaseAnon(): SupabaseClient {
  if (!anonClient) {
    anonClient = createClient(
      requiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
      requiredEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
      { auth: { persistSession: false } }
    );
  }
  return anonClient;
}

/**
 * service role key を使うクライアント。
 * ブラウザに渡らないよう、呼び出しはサーバコンポーネント / route handler / スクリプトに限る。
 */
export function supabaseService(): SupabaseClient {
  if (typeof window !== "undefined") {
    throw new Error("supabaseService() をブラウザから呼び出してはいけません。");
  }
  if (!serviceClient) {
    serviceClient = createClient(
      requiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
      requiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
      { auth: { persistSession: false } }
    );
  }
  return serviceClient;
}
