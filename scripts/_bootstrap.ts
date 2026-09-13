import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * .env.local を process.env へ読み込む。
 *
 * 運用スクリプトは Next.js の外で動くので、依存を増やさず自前で読む。
 * 既に設定済みの環境変数は上書きしない（CI で環境変数を渡す場合のため）。
 */
function loadEnvFile(filename: string): void {
  const path = resolve(process.cwd(), filename);
  if (!existsSync(path)) return;

  for (const rawLine of readFileSync(path, "utf8").split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const separator = line.indexOf("=");
    if (separator === -1) continue;

    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadEnvFile(".env.local");
loadEnvFile(".env");

// 運用スクリプトは Worker の外で動くので、D1 へは REST API 経由で接続する
// （docs/08_ARCHITECTURE.md §4.3）
import { setDb } from "../lib/db";
import { httpDb } from "../lib/db/http";

setDb(httpDb());

/** コマンドライン引数 --key=value / --flag を読む */
export function arg(name: string): string | undefined {
  const prefix = `--${name}`;
  for (const item of process.argv.slice(2)) {
    if (item === prefix) return "";
    if (item.startsWith(`${prefix}=`)) return item.slice(prefix.length + 1);
  }
  return undefined;
}

export function flag(name: string): boolean {
  return arg(name) !== undefined;
}

/** 巡回で取得した HTML の置き場所。DB に HTML を保存しないための一時領域。 */
export const CACHE_DIR = resolve(process.cwd(), ".cache/sources");
