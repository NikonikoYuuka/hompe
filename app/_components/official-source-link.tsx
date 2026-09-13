"use client";

import { track } from "../../lib/analytics";
import { hostnameOf } from "../../lib/labels";

/**
 * 主要 CTA「公式サイトで詳細を見る」(D-012)。
 *
 * - サイト内応募はしない。必ず情報提供元の公式ページへ遷移させる
 * - リンク先は実 URL のまま（計測のためのリダイレクト迂回をしない）
 * - official_source_click は MVP で最も重要なユーザー行動 (spec §34)
 */
export function OfficialSourceLink({
  listingId,
  url,
  variant = "primary"
}: {
  listingId: string;
  url: string;
  variant?: "primary" | "compact";
}) {
  const className =
    variant === "primary"
      ? "inline-flex w-full items-center justify-center rounded-md bg-sweat-500 px-5 py-3 text-base font-bold text-ink-950 transition hover:bg-sweat-400 sm:w-auto"
      : "text-sm text-sweat-400 underline underline-offset-4 hover:text-sweat-500";

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      onClick={() => track("official_source_click", { listingId })}
    >
      公式サイトで詳細を見る
      {variant === "primary" && (
        <span className="ml-2 text-xs font-normal opacity-80">{hostnameOf(url)}</span>
      )}
    </a>
  );
}
