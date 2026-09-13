import { extractListing } from "../lib/extract";
import { checkSource } from "../lib/source-check";
import type { SourceAdapter } from "./types";

/**
 * 汎用 adapter。
 *
 * 公式採用ページ / 自治体ページに対して、
 *   JSON-LD → 正規表現 → 取れなければ review_required
 * を行う。特定 Source 向けの処理はここに足さず、新しい adapter を作ること。
 */
export const genericAdapter: SourceAdapter = {
  key: "generic",

  check(source) {
    return checkSource(source);
  },

  extract(html, source) {
    return extractListing({
      html,
      entityName: source.entity_name,
      grade: source.grade
    });
  }
};
