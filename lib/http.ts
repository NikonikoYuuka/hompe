/**
 * Source 巡回用の HTTP fetch。
 *
 * ここで持つのは fetch / timeout / retry / User-Agent だけ。
 * 汎用 crawler を作らない (D-013)。
 */

export interface FetchResult {
  status: number | null;
  body: string | null;
  error: string | null;
  attempts: number;
  durationMs: number;
  finalUrl: string | null;
}

const DEFAULT_TIMEOUT_MS = 20_000;
const DEFAULT_MAX_ATTEMPTS = 3;

/** 誰が取得しているか分かるようにする。連絡先は環境変数で差し替え可能。 */
function userAgent(): string {
  const contact = process.env.CRAWLER_CONTACT ?? "https://example.com/about";
  return `NikutaiFukugyouBot/0.1 (+${contact})`;
}

function isRetryable(status: number | null): boolean {
  // 5xx と 429 のみ retry。404/410 は retry せず closed 候補として扱う。
  if (status === null) return true; // ネットワークエラー
  return status >= 500 || status === 429;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function fetchSourcePage(
  url: string,
  options: { timeoutMs?: number; maxAttempts?: number } = {}
): Promise<FetchResult> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxAttempts = options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
  const startedAt = Date.now();

  let status: number | null = null;
  let error: string | null = null;
  let finalUrl: string | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, {
        signal: controller.signal,
        redirect: "follow",
        headers: {
          "User-Agent": userAgent(),
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "ja,en;q=0.8"
        }
      });
      status = response.status;
      finalUrl = response.url || url;

      if (response.ok) {
        const body = await response.text();
        return {
          status,
          body,
          error: null,
          attempts: attempt,
          durationMs: Date.now() - startedAt,
          finalUrl
        };
      }

      error = `HTTP ${response.status}`;
      if (!isRetryable(status)) break;
    } catch (cause) {
      status = null;
      error = cause instanceof Error ? cause.message : String(cause);
    } finally {
      clearTimeout(timer);
    }

    if (attempt < maxAttempts) {
      // exponential backoff: 2s, 4s
      await sleep(2000 * 2 ** (attempt - 1));
    }
  }

  return {
    status,
    body: null,
    error,
    attempts: maxAttempts,
    durationMs: Date.now() - startedAt,
    finalUrl
  };
}
