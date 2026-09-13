"use client";

import { useEffect, useRef } from "react";
import {
  adReservedHeight,
  adSlotId,
  adsEnabled,
  adsenseClientId,
  adsPlaceholderVisible,
  shouldRenderAd,
  type AdPlacement
} from "../../lib/ads";

/**
 * 広告枠 (spec §47)。
 *
 * ルール:
 *   - 未設定なら null を返す。レイアウトは壊れない
 *   - 「広告」ラベルを必ず付け、Listing のカードと見た目を変える
 *     （ユーザーが案件情報と誤認しないようにする）
 *   - script はここから読み込まない。root layout の AdScript が1回だけ読む
 *   - 高さを先に確保して CLS を抑える
 *   - Listing のデータを一切受け取らない（§48 rule 13）
 */
export function AdSlot({ placement }: { placement: AdPlacement }) {
  const ref = useRef<HTMLModElement>(null);
  const pushed = useRef(false);
  const slot = adSlotId(placement);
  const client = adsenseClientId();
  const height = adReservedHeight(placement);

  useEffect(() => {
    if (!adsEnabled() || pushed.current || !ref.current) return;
    try {
      const w = window as unknown as { adsbygoogle?: unknown[] };
      w.adsbygoogle = w.adsbygoogle ?? [];
      w.adsbygoogle.push({});
      pushed.current = true;
    } catch {
      // 広告の読み込み失敗でページを壊さない
    }
  }, []);

  if (!shouldRenderAd(placement)) return null;

  return (
    <aside
      aria-label="広告"
      className="my-10 border-t border-ink-800 pt-4"
      data-ad-placement={placement}
    >
      <p className="mb-2 text-[11px] tracking-widest text-ink-400">広告</p>

      <div style={{ minHeight: height }} className="overflow-hidden">
        {adsPlaceholderVisible() ? (
          <div
            style={{ height }}
            className="flex items-center justify-center rounded border border-dashed border-ink-700 text-xs text-ink-400"
          >
            広告枠（{placement}）— 開発環境では配信しません
          </div>
        ) : (
          <ins
            ref={ref}
            className="adsbygoogle block"
            style={{ display: "block", minHeight: height }}
            data-ad-client={client}
            data-ad-slot={slot}
            data-ad-format="auto"
            data-full-width-responsive="true"
          />
        )}
      </div>
    </aside>
  );
}
