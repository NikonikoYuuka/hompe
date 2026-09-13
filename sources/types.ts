import type { ExtractOutcome } from "../lib/extract";
import type { SourceCheckOutcome } from "../lib/source-check";
import type { SourceRow } from "../lib/types";

/**
 * Source Adapter (D-013)。
 *
 * 最初から万能 Crawler を作らない。共通処理（fetch / retry / status / normalize /
 * hash / logging）は lib/ 側に置き、Source 固有の差分だけを adapter に置く。
 *
 * V0.1 では generic のみ。同じ処理が複数 Source で実際に必要になってから共通化する。
 */
export interface SourceAdapter {
  key: string;
  /** Source を1回チェックして変更の有無を返す */
  check(source: SourceRow): Promise<SourceCheckOutcome>;
  /** 変更があったページから Fact を抽出する。掲載対象外なら理由つきで返す */
  extract(html: string, source: SourceRow): ExtractOutcome;
}
