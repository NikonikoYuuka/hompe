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

/**
 * 取得する本文の上限。
 *
 * lib/normalize.ts の正規表現は入力長に対して O(n^2) で劣化する
 * （閉じタグの無い `<!--` や `<script` が並ぶページで顕著）。
 * 上限が無いと、巨大ページ1枚で週次巡回が何時間もハングする。
 */
const MAX_BODY_BYTES = 2 * 1024 * 1024;

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

/** 上限までしか読まない。超えたら null を返して読み捨てる */
async function readCapped(response: Response): Promise<string | null> {
  const declared = Number(response.headers.get("content-length") ?? "0");
  if (declared > MAX_BODY_BYTES) {
    await response.body?.cancel();
    return null;
  }

  const reader = response.body?.getReader();
  if (!reader) return response.text();

  const chunks: Uint8Array[] = [];
  let total = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_BODY_BYTES) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }

  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder("utf-8").decode(merged);
}

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
        const body = await readCapped(response);
        if (body === null) {
          // 大きすぎるページは諦める。retry しても同じなので即終了する
          return {
            status,
            body: null,
            error: `本文が大きすぎます（${MAX_BODY_BYTES} バイト超）`,
            attempts: attempt,
            durationMs: Date.now() - startedAt,
            finalUrl
          };
        }
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
