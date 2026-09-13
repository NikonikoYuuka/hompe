import type { ListingRow, ListingStatus } from "./types";

/**
 * Listing lifecycle (docs/05_OPERATIONS.md)。
 *
 * - fixed_date で event_date が過去 → expired
 * - application_deadline が過去 → expired
 * - 404 / 410 → 公開から外して closed 候補 / review 対象
 * - 5xx → 即 closed にしない。retry する
 * - 物理削除しない。expired / closed は archive として保持する (D-004)
 */

/**
 * このプロダクトの日付はすべて **JST（Asia/Tokyo）の暦日** として扱う。
 *
 * 対象は日本の募集ページであり、ユーザーも日本にいる。UTC で判定すると
 * 日本時間の午前9時までが「前日」になり、土曜のイベントが日曜いっぱい残る。
 * DB の event_date / application_deadline も JST の暦日として保存する。
 */
const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

function jstDayStart(now: Date): Date {
  const jst = new Date(now.getTime() + JST_OFFSET_MS);
  return new Date(Date.UTC(jst.getUTCFullYear(), jst.getUTCMonth(), jst.getUTCDate()));
}

/** JST の「今日」を YYYY-MM-DD で返す */
export function todayIso(now: Date = new Date()): string {
  return jstDayStart(now).toISOString().slice(0, 10);
}

export interface LifecycleDecision {
  status: ListingStatus;
  reason: string;
}

type LifecycleInput = Pick<
  ListingRow,
  "status" | "availability_type" | "event_date" | "event_end_date" | "application_deadline"
>;

/** 日付起因の期限切れ判定。変更が不要なら null を返す。 */
export function judgeExpiry(
  listing: LifecycleInput,
  today: string = todayIso()
): LifecycleDecision | null {
  // すでに archive 済みのものは触らない
  if (listing.status === "expired" || listing.status === "closed") return null;

  if (listing.application_deadline && listing.application_deadline < today) {
    return {
      status: "expired",
      reason: `応募締切 ${listing.application_deadline} を過ぎた`
    };
  }

  if (listing.availability_type === "fixed_date") {
    // 複数日開催は終了日を基準にする
    const last = listing.event_end_date ?? listing.event_date;
    if (last && last < today) {
      return { status: "expired", reason: `開催日 ${last} を過ぎた` };
    }
  }

  return null;
}

/**
 * HTTP status から Listing をどう扱うか決める。
 *
 * 404/410 でも即 closed にはせず review_required にする
 * （URL 構成変更でページが移動しただけの場合があるため）。
 */
export function judgeFromHttpStatus(status: number | null): LifecycleDecision | null {
  if (status === null) return null; // ネットワークエラー → retry 側の責務
  if (status === 404 || status === 410) {
    return {
      status: "review_required",
      reason: `Source が HTTP ${status} を返した。募集終了か URL 変更かを確認する`
    };
  }
  if (status >= 500) return null; // 即 closed にしない
  return null;
}

/** 公開可能な status か */
export function isPublic(status: ListingStatus): boolean {
  return status === "active";
}

/**
 * 今週末（土・日）の ISO 日付を JST 基準で返す。
 *
 * **日曜は「今週末の2日目」なので、当日を含める。**
 * ここを「次の土曜」にすると、日曜に見にきた人へ翌週の案件しか出なくなる。
 */
export function upcomingWeekend(now: Date = new Date()): { saturday: string; sunday: string } {
  const base = jstDayStart(now);
  const dayOfWeek = base.getUTCDay(); // 0=日 ... 6=土
  const daysUntilSaturday = dayOfWeek === 0 ? -1 : 6 - dayOfWeek;

  const saturday = new Date(base);
  saturday.setUTCDate(base.getUTCDate() + daysUntilSaturday);
  const sunday = new Date(saturday);
  sunday.setUTCDate(saturday.getUTCDate() + 1);

  return {
    saturday: saturday.toISOString().slice(0, 10),
    sunday: sunday.toISOString().slice(0, 10)
  };
}
