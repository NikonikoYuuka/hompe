import type {
  AvailabilityType,
  ListingCategory,
  ListingRow,
  ListingStatus,
  RewardType,
  SourceGrade,
  SourceType
} from "./types";

/**
 * 表示ラベル。
 *
 * ここに入るのは「enum の日本語名」だけ。Fact を足す文言を書かない (D-006)。
 */

export const CATEGORY_LABELS: Record<ListingCategory, string> = {
  nature_outdoor: "自然・外仕事",
  move_build_clear: "運ぶ・作る・片付ける",
  help_people: "人を手伝う",
  volunteer_local: "ボランティア・地域活動"
};

/** TOP のカテゴリ入口。lead は Brand Layer のコピー（Fact ではない） */
export const CATEGORY_ENTRIES: Array<{
  key: ListingCategory;
  label: string;
  lead: string;
}> = [
  {
    key: "nature_outdoor",
    label: "自然・外仕事",
    lead: "土を触る。草を刈る。とりあえず外に出る。"
  },
  {
    key: "move_build_clear",
    label: "運ぶ・作る・片付ける",
    lead: "持ち上げて、運んで、終わり。考えることが少ない。"
  },
  {
    key: "help_people",
    label: "人を手伝う",
    lead: "人が相手。身体も頭も使う。"
  },
  {
    key: "volunteer_local",
    label: "ボランティア・地域活動",
    lead: "金にはならないけど、土曜の午前が埋まる。"
  }
];

export const AVAILABILITY_LABELS: Record<AvailabilityType, string> = {
  fixed_date: "開催日が決まっている",
  recurring: "定期・繰り返し募集",
  registration: "登録制",
  unknown: "日程は公式サイトで確認"
};

export const REWARD_LABELS: Record<RewardType, string> = {
  paid: "有給",
  volunteer: "無償",
  unknown: "報酬の記載を確認できず"
};

export const STATUS_LABELS: Record<ListingStatus, string> = {
  draft: "下書き",
  review_required: "要確認",
  scheduled: "公開予定",
  active: "公開中",
  expired: "期限切れ",
  closed: "募集終了"
};

export const SOURCE_TYPE_LABELS: Record<SourceType, string> = {
  employer_official: "雇用主 公式サイト",
  employer_ats: "企業専用 ATS（公式サイトからリンク）",
  municipal: "自治体",
  public_agency: "公的機関",
  npo: "NPO",
  organizer: "主催者",
  permitted: "明示的許可を得た Source",
  direct_post: "企業直接掲載"
};

export const SOURCE_GRADE_LABELS: Record<SourceGrade, string> = {
  A: "A（API / RSS / Open Data / 明示的利用許可）",
  B: "B（直接許可 / 提携 / 企業直接投稿）",
  C: "C（公式だが自動取得・再利用条件が不明確）",
  D: "D（利用不可）"
};

export const SAFETY_FLAG_LABELS: Record<string, string> = {
  unverified_entity: "募集主体を確認できていない",
  vague_work: "仕事内容の記載が薄い",
  missing_location: "勤務地の記載を確認できない",
  missing_contact: "連絡先の記載を確認できない",
  suspicious_contact_channel: "連絡手段に注意が必要",
  high_pay_low_detail: "報酬が高い割に情報が少ない",
  sns_only: "SNS のみでの募集"
};

/** V0.1 では人間が付与する editorial tag (D-009) */
export const PURPOSE_TAGS = [
  "外に出たい",
  "身体を使いたい",
  "何も考えたくない",
  "普段やらないことをしたい",
  "誰かの役に立ちたい"
] as const;

const JP_DATE = new Intl.DateTimeFormat("ja-JP", {
  month: "numeric",
  day: "numeric",
  weekday: "short",
  timeZone: "UTC"
});

export function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  const date = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return null;
  return JP_DATE.format(date);
}

export function formatVerifiedAt(iso: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return JP_DATE.format(date);
}

/**
 * 日程の表示文字列 (D-005 / docs/04_EDITORIAL.md §4)。
 *
 * recurring / registration を「今週末に働ける」と読ませないための関数。
 * ここを経由せずに日付を表示しないこと。
 */
export function scheduleText(
  listing: Pick<
    ListingRow,
    "availability_type" | "event_date" | "event_end_date" | "work_hours_text" | "weekend_available"
  >
): string {
  const hours = listing.work_hours_text ? ` ${listing.work_hours_text}` : "";

  if (listing.availability_type === "fixed_date" && listing.event_date) {
    const start = formatDate(listing.event_date);
    const end = listing.event_end_date ? formatDate(listing.event_end_date) : null;
    const range = end && end !== start ? `${start}〜${end}` : start;
    return `${range}${hours}`;
  }

  // weekend_available は「土日のいずれかに働けると Source に記載がある」ことしか意味しない。
  // 「土曜のみ実施」も true になるので、「土日」と断定しない
  const weekend = listing.weekend_available
    ? "週末の勤務について記載あり。今週末の募集状況は公式サイトで確認"
    : "募集状況は公式サイトで確認";

  if (listing.availability_type === "recurring") return `定期募集。${weekend}${hours}`;
  if (listing.availability_type === "registration") return `登録制。${weekend}${hours}`;
  return `日程の記載を確認できず。公式サイトで確認${hours}`;
}

/** 報酬の表示文字列。Source にある表記をそのまま出す。 */
export function rewardText(
  listing: Pick<ListingRow, "reward_type" | "pay_text" | "expenses_provided">
): string {
  const parts: string[] = [];
  if (listing.reward_type === "paid") {
    parts.push(listing.pay_text ?? "有給（金額の記載を確認できず）");
  } else if (listing.reward_type === "volunteer") {
    parts.push("無償");
  } else {
    parts.push(REWARD_LABELS.unknown);
  }
  if (listing.expenses_provided === true) parts.push("交通費支給");
  if (listing.expenses_provided === false) parts.push("交通費支給なし");
  return parts.join(" / ");
}

/** 勤務地の表示文字列 */
export function locationText(
  listing: Pick<ListingRow, "prefecture" | "city" | "nearest_station" | "station_walk_minutes">
): string {
  const place = [listing.prefecture, listing.city].filter(Boolean).join("");
  const station = listing.nearest_station
    ? `${listing.nearest_station}${
        listing.station_walk_minutes ? ` 徒歩${listing.station_walk_minutes}分` : ""
      }`
    : null;
  return [place || "勤務地の記載を確認できず", station].filter(Boolean).join(" / ");
}

/** 資格の表示文字列。明示がなければ断定しない (D-011) */
export function qualificationText(
  listing: Pick<ListingRow, "qualification_required" | "required_qualifications">
): string {
  if (listing.qualification_required === true) {
    return listing.required_qualifications.length > 0
      ? `必要：${listing.required_qualifications.join(" / ")}`
      : "資格が必要（詳細は公式サイトで確認）";
  }
  if (listing.qualification_required === false) return "資格不要（Source 記載）";
  return "資格要件の記載を確認できず";
}

export function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}
