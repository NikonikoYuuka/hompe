import { fetchSourcePage } from "./http";
import { contentHash } from "./normalize";
import type { SourceRow } from "./types";

/**
 * 1 Source を1回チェックする手続き (spec §23)。
 *
 * AI を使用しない。HTTP status → normalize → hash → 前回 hash と比較、それだけ。
 * DB 書き込みは呼び出し側（scripts/check-sources.ts）が行う。
 */

export interface SourceCheckOutcome {
  sourceId: string;
  httpStatus: number | null;
  contentHash: string | null;
  changed: boolean;
  attempts: number;
  durationMs: number;
  error: string | null;
  /** 抽出処理に渡す本文。変更が無い場合は null（取得しても使わない） */
  html: string | null;
}

export async function checkSource(
  source: Pick<SourceRow, "id" | "url" | "last_content_hash">
): Promise<SourceCheckOutcome> {
  const result = await fetchSourcePage(source.url);

  if (!result.body) {
    return {
      sourceId: source.id,
      httpStatus: result.status,
      contentHash: null,
      changed: false,
      attempts: result.attempts,
      durationMs: result.durationMs,
      error: result.error,
      html: null
    };
  }

  const hash = contentHash(result.body);
  const changed = source.last_content_hash !== hash;

  return {
    sourceId: source.id,
    httpStatus: result.status,
    contentHash: hash,
    changed,
    attempts: result.attempts,
    durationMs: result.durationMs,
    error: null,
    // 変更なしなら本文を後段に渡さない（再判定をしない D-014）
    html: changed ? result.body : null
  };
}
