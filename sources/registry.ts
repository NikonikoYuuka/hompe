import { genericAdapter } from "./generic";
import type { SourceAdapter } from "./types";

/**
 * adapter の登録表。sources.adapter カラムの値で引く。
 * V0.1 は generic のみ。未知のキーは generic にフォールバックする。
 */
const ADAPTERS: Record<string, SourceAdapter> = {
  generic: genericAdapter
};

export function getAdapter(key: string | null | undefined): SourceAdapter {
  if (key && key in ADAPTERS) return ADAPTERS[key];
  return genericAdapter;
}

export { genericAdapter };
export type { SourceAdapter };
