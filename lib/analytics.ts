import type { AnalyticsEventType } from "./types";

/**
 * Demand Validation 用のクライアント側 helper (spec §34)。
 *
 * 個人情報を収集しない。anon session id はランダム UUID を sessionStorage に置くだけ。
 * 最も重要なイベントは official_source_click。
 */

const SESSION_KEY = "nf_anon_session";

export function anonSessionId(): string {
  if (typeof window === "undefined") return "";
  try {
    const existing = window.sessionStorage.getItem(SESSION_KEY);
    if (existing) return existing;
    const created = crypto.randomUUID();
    window.sessionStorage.setItem(SESSION_KEY, created);
    return created;
  } catch {
    // sessionStorage が使えない環境では session 単位の集計を諦める
    return "";
  }
}

export function track(
  eventType: AnalyticsEventType,
  options: { listingId?: string; path?: string } = {}
): void {
  if (typeof window === "undefined") return;

  const payload = JSON.stringify({
    event_type: eventType,
    listing_id: options.listingId ?? null,
    path: options.path ?? window.location.pathname,
    anon_session: anonSessionId()
  });

  try {
    // 外部リンクへの遷移中でも送信が落ちないよう sendBeacon を使う
    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/track", new Blob([payload], { type: "application/json" }));
      return;
    }
    void fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
      keepalive: true
    });
  } catch {
    // 計測の失敗でユーザー操作を止めない
  }
}
