import Script from "next/script";
import { adsEnabled, adsenseClientId } from "../../lib/ads";

/**
 * AdSense の script をページ全体で **1回だけ** 読み込む (spec §47)。
 *
 * 各 AdSlot から読み込まない。root layout でのみ描画する。
 * afterInteractive にして初期表示のブロッキングを避ける。
 */
export function AdScript() {
  const client = adsenseClientId();
  if (!adsEnabled() || !client) return null;

  return (
    <Script
      id="adsbygoogle-init"
      strategy="afterInteractive"
      async
      crossOrigin="anonymous"
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${client}`}
    />
  );
}
