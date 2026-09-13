/**
 * Google AdSense の設定 (spec §47)。
 *
 * ここは **Listing の domain logic から完全に独立**している (§48 rule 13)。
 * このファイルは listings / sources を一切 import しないこと。
 *
 * 設計方針:
 *   - ID を一切ハードコードしない。すべて環境変数から読む
 *   - 未設定ならページは広告なしで正常にレンダリングされる
 *   - development / preview で production 広告を出さない
 *   - 枠の高さを先に確保して CLS を抑える
 */

export type AdPlacement = "top" | "listing_list" | "listing_detail" | "article";

/**
 * 環境変数は next のビルド時にインライン展開されるため、
 * process.env[key] のような動的アクセスは使えない。必ずリテラルで書く。
 */
const SLOT_IDS: Record<AdPlacement, string | undefined> = {
  top: process.env.NEXT_PUBLIC_ADSENSE_SLOT_TOP,
  listing_list: process.env.NEXT_PUBLIC_ADSENSE_SLOT_LISTING_LIST,
  listing_detail: process.env.NEXT_PUBLIC_ADSENSE_SLOT_LISTING_DETAIL,
  article: process.env.NEXT_PUBLIC_ADSENSE_SLOT_ARTICLE
};

/**
 * 枠ごとの予約高さ(px)。読み込み前から場所を確保して CLS を抑える。
 * レスポンシブ広告は実際の高さが変わるので、下限だけを確保する。
 */
const RESERVED_HEIGHT: Record<AdPlacement, number> = {
  top: 280,
  listing_list: 280,
  listing_detail: 280,
  article: 280
};

/** AdSense のパブリッシャー ID（ca-pub-...）。公開値なので secret ではない。 */
export function adsenseClientId(): string | undefined {
  const value = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;
  return value && value.startsWith("ca-pub-") ? value : undefined;
}

/** ads.txt 用のパブリッシャー ID（pub-... 形式） */
export function adsensePublisherId(): string | undefined {
  return adsenseClientId()?.replace(/^ca-/, "");
}

/**
 * 広告を実際に配信してよい環境か。
 *
 * production ビルド **かつ** 明示的に有効化されている場合だけ true。
 * preview / staging では NEXT_PUBLIC_ADS_ENABLED を設定しないことで
 * production 広告の誤表示を防ぐ（docs/09_MONETIZATION.md）。
 */
export function adsEnabled(): boolean {
  return (
    process.env.NODE_ENV === "production" &&
    process.env.NEXT_PUBLIC_ADS_ENABLED === "true" &&
    Boolean(adsenseClientId())
  );
}

/** 開発時に枠の位置だけを確認するためのプレースホルダ表示をするか */
export function adsPlaceholderVisible(): boolean {
  return process.env.NODE_ENV !== "production" && process.env.NEXT_PUBLIC_ADS_ENABLED === "true";
}

export function adSlotId(placement: AdPlacement): string | undefined {
  const value = SLOT_IDS[placement];
  return value && value.length > 0 ? value : undefined;
}

export function adReservedHeight(placement: AdPlacement): number {
  return RESERVED_HEIGHT[placement];
}

/** その枠を描画すべきか。未設定なら何も描画しない＝レイアウトは壊れない。 */
export function shouldRenderAd(placement: AdPlacement): boolean {
  if (!adSlotId(placement)) return false;
  return adsEnabled() || adsPlaceholderVisible();
}
