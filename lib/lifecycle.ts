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

export function todayIso(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
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

/** 今週末（土・日）の ISO 日付を返す */
export function upcomingWeekend(now: Date = new Date()): { saturday: string; sunday: string } {
  const base = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const daysUntilSaturday = (6 - base.getUTCDay() + 7) % 7;
  const saturday = new Date(base);
  saturday.setUTCDate(base.getUTCDate() + daysUntilSaturday);
  const sunday = new Date(saturday);
  sunday.setUTCDate(saturday.getUTCDate() + 1);
  return {
    saturday: saturday.toISOString().slice(0, 10),
    sunday: sunday.toISOString().slice(0, 10)
  };
}
