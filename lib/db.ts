/**
 * DB アクセスの共通インターフェース (Cloudflare D1)。
 *
 * 実装は2つある:
 *   - lib/db/binding.ts : Worker 内（公開ページ / /admin / /api）。D1 binding を使う
 *   - lib/db/http.ts    : 運用スクリプト（Node / GitHub Actions）。D1 REST API を使う
 *
 * ブラウザから DB を直接触らない。RLS の代わりに
 * 「DB アクセスはすべてサーバ側」という構造で保護する（docs/08_ARCHITECTURE.md）。
 */

export interface Db {
  all<T>(sql: string, params?: unknown[]): Promise<T[]>;
  first<T>(sql: string, params?: unknown[]): Promise<T | null>;
  run(sql: string, params?: unknown[]): Promise<{ changes: number }>;
}

let override: Db | null = null;

/**
 * 運用スクリプトから HTTP ドライバを注入する。
 * これを呼ばない限り Worker の binding ドライバが使われる。
 */
export function setDb(db: Db): void {
  override = db;
}

export async function getDb(): Promise<Db> {
  if (override) return override;
  // Node 側に @opennextjs/cloudflare を持ち込まないよう遅延 import する
  const { bindingDb } = await import("./db/binding");
  return bindingDb();
}

/**
 * DB が利用できない場合に公開ページを 500 にしないためのラッパ。
 * Source や DB の失敗で Public site 全体を落とさない（§48 rule 5）。
 */
export async function safeQuery<T>(
  label: string,
  run: (db: Db) => Promise<T>,
  fallback: T
): Promise<T> {
  try {
    return await run(await getDb());
  } catch (error) {
    console.error(`[db] ${label} に失敗しました:`, error);
    return fallback;
  }
}

export function newId(): string {
  return crypto.randomUUID();
}

export function nowIso(): string {
  return new Date().toISOString();
}
