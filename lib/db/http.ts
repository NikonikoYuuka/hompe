import type { Db, SqliteRow } from "../db";

/**
 * 運用スクリプト（Node / GitHub Actions）から D1 を使うドライバ。
 *
 * Worker の外からは binding を使えないので Cloudflare の REST API を叩く。
 * これにより Source crawling と Public serving を分離したまま運用できる（§48 rule 4）。
 *
 * 必要な環境変数:
 *   CLOUDFLARE_ACCOUNT_ID
 *   CLOUDFLARE_D1_DATABASE_ID
 *   CLOUDFLARE_API_TOKEN   … D1 の編集権限のみを付けたトークン
 */

interface D1ApiResponse<T> {
  success: boolean;
  errors?: Array<{ code: number; message: string }>;
  result?: Array<{
    success: boolean;
    results?: T[];
    meta?: { changes?: number };
  }>;
}

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `環境変数 ${name} が設定されていません。.env.example を参照して .env.local に設定してください。`
    );
  }
  return value;
}

async function request<T>(sql: string, params: unknown[]): Promise<{
  rows: T[];
  changes: number;
}> {
  const accountId = required("CLOUDFLARE_ACCOUNT_ID");
  const databaseId = required("CLOUDFLARE_D1_DATABASE_ID");
  const token = required("CLOUDFLARE_API_TOKEN");

  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${databaseId}/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ sql, params })
    }
  );

  const body = (await response.json()) as D1ApiResponse<T>;

  if (!response.ok || !body.success) {
    const reason = body.errors?.map((e) => `${e.code}: ${e.message}`).join(", ");
    throw new Error(`D1 API エラー (HTTP ${response.status}): ${reason ?? "詳細不明"}`);
  }

  const first = body.result?.[0];
  return { rows: first?.results ?? [], changes: first?.meta?.changes ?? 0 };
}

export function httpDb(): Db {
  return {
    async all(sql: string, params: unknown[] = []) {
      const { rows } = await request<SqliteRow>(sql, params);
      return rows;
    },
    async first(sql: string, params: unknown[] = []) {
      const { rows } = await request<SqliteRow>(sql, params);
      return rows[0] ?? null;
    },
    async run(sql: string, params: unknown[] = []) {
      const { changes } = await request<unknown>(sql, params);
      return { changes };
    }
  };
}
