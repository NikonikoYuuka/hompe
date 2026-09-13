import type { Db } from "../db";

/**
 * Cloudflare Workers 内から D1 binding を使うドライバ。
 *
 * binding 名は wrangler.jsonc の `d1_databases[].binding` = "DB"。
 * @cloudflare/workers-types を足さずに済むよう、必要な形だけを構造的に定義する。
 */

interface D1Result<T> {
  results?: T[];
  meta?: { changes?: number };
}

interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  all<T>(): Promise<D1Result<T>>;
  first<T>(): Promise<T | null>;
  run(): Promise<D1Result<unknown>>;
}

interface D1Database {
  prepare(sql: string): D1PreparedStatement;
}

function bind(database: D1Database, sql: string, params: unknown[]): D1PreparedStatement {
  const statement = database.prepare(sql);
  return params.length > 0 ? statement.bind(...params) : statement;
}

async function d1(): Promise<D1Database> {
  const { getCloudflareContext } = await import("@opennextjs/cloudflare");
  const context = await getCloudflareContext({ async: true });
  const database = (context.env as unknown as { DB?: D1Database }).DB;
  if (!database) {
    throw new Error(
      "D1 binding 'DB' が見つかりません。wrangler.jsonc の d1_databases 設定を確認してください。"
    );
  }
  return database;
}

export function bindingDb(): Db {
  return {
    async all<T>(sql: string, params: unknown[] = []) {
      const result = await bind(await d1(), sql, params).all<T>();
      return result.results ?? [];
    },
    async first<T>(sql: string, params: unknown[] = []) {
      return bind(await d1(), sql, params).first<T>();
    },
    async run(sql: string, params: unknown[] = []) {
      const result = await bind(await d1(), sql, params).run();
      return { changes: result.meta?.changes ?? 0 };
    }
  };
}
