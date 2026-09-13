/**
 * 環境変数の読み取り。
 *
 * Cloudflare Workers では secret / vars は `process.env` ではなく env binding に入る。
 * 一方、運用スクリプト（Node）は `process.env` を使う。
 * その差をここ1箇所に閉じ込める。
 *
 * 注意: NEXT_PUBLIC_* はビルド時にインライン展開されるので、この関数を通す必要はない。
 */

/** Worker の env binding から読む。Worker 外（Node / ビルド時）では undefined を返す。 */
async function fromCloudflareEnv(name: string): Promise<string | undefined> {
  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    const context = await getCloudflareContext({ async: true });
    const value = (context.env as unknown as Record<string, unknown>)[name];
    return typeof value === "string" && value.length > 0 ? value : undefined;
  } catch {
    // Worker の外（Node スクリプト / ビルド時）では binding が無い
    return undefined;
  }
}

/**
 * サーバ側の環境変数を読む。
 * Cloudflare の env binding → process.env の順に探す。
 */
export async function serverEnv(name: string): Promise<string | undefined> {
  const fromBinding = await fromCloudflareEnv(name);
  if (fromBinding) return fromBinding;
  const value = process.env[name];
  return value && value.length > 0 ? value : undefined;
}

/** process.env だけを見る（運用スクリプト用） */
export function optionalEnv(name: string): string | undefined {
  const value = process.env[name];
  return value && value.length > 0 ? value : undefined;
}

export function requiredEnv(name: string): string {
  const value = optionalEnv(name);
  if (!value) {
    throw new Error(
      `環境変数 ${name} が設定されていません。.env.example を参照して設定してください。`
    );
  }
  return value;
}
