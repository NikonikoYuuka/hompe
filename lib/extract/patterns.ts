import { extracted, type Extracted } from "../types";

/**
 * 正規表現による Fact 抽出。
 *
 * 原則: **確信できない場合は推論しない。null を返す。**
 * 推定に留まるものは confidence: "low" を付け、呼び出し側で review_required にする。
 *
 * 「すべての公式採用サイトに対応する汎用 extractor」を目標にしない (spec §25)。
 */

const PREFECTURES = [
  "北海道","青森県","岩手県","宮城県","秋田県","山形県","福島県","茨城県","栃木県","群馬県",
  "埼玉県","千葉県","東京都","神奈川県","新潟県","富山県","石川県","福井県","山梨県","長野県",
  "岐阜県","静岡県","愛知県","三重県","滋賀県","京都府","大阪府","兵庫県","奈良県","和歌山県",
  "鳥取県","島根県","岡山県","広島県","山口県","徳島県","香川県","愛媛県","高知県","福岡県",
  "佐賀県","長崎県","熊本県","大分県","宮崎県","鹿児島県","沖縄県"
];

export const PREFECTURE_LIST = PREFECTURES;

function snippet(text: string, index: number, length: number): string {
  const start = Math.max(0, index - 30);
  const end = Math.min(text.length, index + length + 30);
  return text.slice(start, end).replace(/\s+/g, " ").trim();
}

// ---------------------------------------------------------------------------
// 報酬
// ---------------------------------------------------------------------------

export interface PayFacts {
  text: string;
  min: number | null;
  max: number | null;
  unit: "hourly" | "daily" | "per_task" | null;
}

const PAY_UNIT_WORDS: Array<[RegExp, PayFacts["unit"]]> = [
  [/時給/, "hourly"],
  [/日給|日当/, "daily"],
  [/1\s*回|一回|報酬/, "per_task"]
];

/** 「時給1,200円〜1,500円」「日給10,000円」等。単位が書かれていない金額は拾わない。 */
export function extractPay(text: string): Extracted<PayFacts> | null {
  const pattern =
    /(時給|日給|日当|報酬)\s*[:：]?\s*([0-9,]{3,9})\s*円?\s*(?:[〜~\-ー–]\s*([0-9,]{3,9})\s*円?)?/;
  const match = pattern.exec(text);
  if (!match) return null;

  const toNumber = (raw: string | undefined) =>
    raw ? Number(raw.replace(/,/g, "")) : null;

  const min = toNumber(match[2]);
  const max = toNumber(match[3]);
  if (min === null || Number.isNaN(min)) return null;

  let unit: PayFacts["unit"] = null;
  for (const [word, value] of PAY_UNIT_WORDS) {
    if (word.test(match[1])) {
      unit = value;
      break;
    }
  }

  const evidence = snippet(text, match.index, match[0].length);
  // 単位が「報酬」止まりのときは何の単位か確定しないので low
  const confidence = unit === "hourly" || unit === "daily" ? "high" : "low";
  return extracted(
    { text: match[0].replace(/\s+/g, ""), min, max, unit },
    confidence,
    evidence
  );
}

/** 無償・ボランティアであることが明示されているか */
export function extractVolunteer(text: string): Extracted<true> | null {
  const pattern = /(無償ボランティア|無報酬|報酬なし|謝礼なし|無償)/;
  const match = pattern.exec(text);
  if (!match) return null;
  return extracted(true, "high", snippet(text, match.index, match[0].length));
}

/** 交通費支給の明示。「交通費なし」と書かれている場合は false を返す。 */
export function extractExpenses(text: string): Extracted<boolean> | null {
  const negative = /交通費\s*(?:は)?\s*(支給なし|なし|自己負担)/.exec(text);
  if (negative) {
    return extracted(false, "high", snippet(text, negative.index, negative[0].length));
  }
  const positive = /(交通費\s*(?:全額)?支給|交通費支給あり|旅費支給)/.exec(text);
  if (positive) {
    return extracted(true, "high", snippet(text, positive.index, positive[0].length));
  }
  return null;
}

// ---------------------------------------------------------------------------
// 日程
// ---------------------------------------------------------------------------

/**
 * 日付抽出。
 *
 * 年が書かれていない場合（「9月19日」「9/19」）は **推論ではあるが必要** なので、
 * 「今日以降で最も近い同月日」を採用したうえで confidence: "low" を返す。
 * low は review_required になるので、人間が確認するまで公開されない。
 */
export function extractDate(text: string, label?: RegExp): Extracted<string> | null {
  const scope = label ? sliceAroundLabel(text, label) : text;
  if (!scope) return null;

  const withYear = /(20\d{2})\s*[年/\-.]\s*(\d{1,2})\s*[月/\-.]\s*(\d{1,2})\s*日?/.exec(scope);
  if (withYear) {
    const iso = toIso(Number(withYear[1]), Number(withYear[2]), Number(withYear[3]));
    if (iso) return extracted(iso, "high", snippet(scope, withYear.index, withYear[0].length));
  }

  const withoutYear = /(?<!\d)(\d{1,2})\s*[月/]\s*(\d{1,2})\s*日?(?!\d)/.exec(scope);
  if (withoutYear) {
    const month = Number(withoutYear[1]);
    const day = Number(withoutYear[2]);
    const iso = nextOccurrence(month, day);
    if (iso) {
      return extracted(iso, "low", snippet(scope, withoutYear.index, withoutYear[0].length));
    }
  }

  return null;
}

/** ラベル（「応募締切」等）の周辺だけを切り出す */
function sliceAroundLabel(text: string, label: RegExp): string | null {
  const match = label.exec(text);
  if (!match) return null;
  return text.slice(match.index, match.index + match[0].length + 60);
}

export const DEADLINE_LABEL = /(応募締切|募集締切|申込締切|締切|応募期限|申込期限)/;
export const EVENT_DATE_LABEL = /(開催日|実施日|活動日|作業日|勤務日|日時)/;

export function extractDeadline(text: string): Extracted<string> | null {
  return extractDate(text, DEADLINE_LABEL);
}

export function extractEventDate(text: string): Extracted<string> | null {
  return extractDate(text, EVENT_DATE_LABEL);
}

function toIso(year: number, month: number, day: number): string | null {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return date.toISOString().slice(0, 10);
}

/** 年の記載がない月日について、今日以降で最も近い年を返す */
function nextOccurrence(month: number, day: number, today = new Date()): string | null {
  const year = today.getUTCFullYear();
  const thisYear = toIso(year, month, day);
  if (!thisYear) return null;
  const todayIso = today.toISOString().slice(0, 10);
  return thisYear >= todayIso ? thisYear : toIso(year + 1, month, day);
}

/** 「9:00〜12:00」「9時〜12時」 */
export function extractWorkHours(text: string): Extracted<string> | null {
  const pattern =
    /(\d{1,2})\s*(?::|時)\s*(\d{2})?\s*分?\s*[〜~\-ー–]\s*(\d{1,2})\s*(?::|時)\s*(\d{2})?\s*分?/;
  const match = pattern.exec(text);
  if (!match) return null;
  const start = `${match[1].padStart(2, "0")}:${match[2] ?? "00"}`;
  const end = `${match[3].padStart(2, "0")}:${match[4] ?? "00"}`;
  return extracted(`${start}–${end}`, "high", snippet(text, match.index, match[0].length));
}

/**
 * 「土日勤務可能」等の記載を検出する。
 *
 * これは **「今週末に働ける」ことを意味しない** (D-005)。
 * 呼び出し側は availability_type と合わせて表示を決めること。
 */
export function extractWeekendMention(text: string): Extracted<true> | null {
  const pattern = /(土日|週末|土曜|日曜|土・日|土日祝)[^。\n]{0,12}(勤務|可能|歓迎|のみ|開催|実施|活動)/;
  const match = pattern.exec(text);
  if (!match) return null;
  return extracted(true, "high", snippet(text, match.index, match[0].length));
}

// ---------------------------------------------------------------------------
// 場所
// ---------------------------------------------------------------------------

export interface LocationFacts {
  prefecture: string | null;
  city: string | null;
  address: string | null;
}

export function extractLocation(text: string): Extracted<LocationFacts> | null {
  for (const prefecture of PREFECTURES) {
    const index = text.indexOf(prefecture);
    if (index === -1) continue;

    const tail = text.slice(index, index + 60);
    const cityMatch = /^(?:[^\s]{2,3}[都道府県])([^\s、。]{1,8}?[市区町村])/.exec(tail);
    const addressMatch = /^([^\s、。]{2,40})/.exec(tail);

    return extracted(
      {
        prefecture,
        city: cityMatch?.[1] ?? null,
        address: addressMatch?.[1] ?? null
      },
      cityMatch ? "high" : "low",
      snippet(text, index, prefecture.length)
    );
  }
  return null;
}

export function extractNearestStation(text: string): Extracted<string> | null {
  const pattern = /(?:最寄(?:り)?駅)\s*[:：]?\s*([^\s、。]{2,20}駅)/;
  const match = pattern.exec(text);
  if (!match) return null;
  return extracted(match[1], "high", snippet(text, match.index, match[0].length));
}

// ---------------------------------------------------------------------------
// 資格
// ---------------------------------------------------------------------------

/** 資格名の候補。Source に出てきたものだけを返す。 */
const QUALIFICATION_WORDS = [
  "介護職員初任者研修",
  "介護福祉士",
  "実務者研修",
  "普通自動車運転免許",
  "普通免許",
  "中型免許",
  "大型免許",
  "フォークリフト",
  "玉掛け",
  "保育士",
  "看護師",
  "調理師",
  "危険物取扱者"
];

export interface QualificationFacts {
  required: boolean;
  names: string[];
}

/**
 * 資格要件。
 *
 * Source が「資格不要 / 未経験可 / 初心者可」と **明示している場合のみ** required=false。
 * 明示がなければ null を返し、無資格可と推論しない (D-011)。
 */
export function extractQualification(text: string): Extracted<QualificationFacts> | null {
  const names = QUALIFICATION_WORDS.filter((word) => text.includes(word));
  if (names.length > 0) {
    const index = text.indexOf(names[0]);
    return extracted({ required: true, names }, "high", snippet(text, index, names[0].length));
  }

  const noneRequired = /(資格不要|資格・経験不問|無資格(?:可|OK)|未経験(?:者)?(?:可|歓迎|OK)|初心者(?:可|歓迎|OK)|経験不問)/.exec(
    text
  );
  if (noneRequired) {
    return extracted(
      { required: false, names: [] },
      "high",
      snippet(text, noneRequired.index, noneRequired[0].length)
    );
  }

  return null;
}

// ---------------------------------------------------------------------------
// 連絡手段（safety 用）
// ---------------------------------------------------------------------------

export function hasContactInfo(text: string): boolean {
  const tel = /(?:0\d{1,4}-\d{1,4}-\d{3,4}|TEL|電話)/i.test(text);
  const mail = /[\w.+-]+@[\w-]+\.[\w.-]+/.test(text);
  const form = /(お問い合わせ|問合せ|応募フォーム|エントリーフォーム)/.test(text);
  return tel || mail || form;
}

export function usesOnlySnsContact(text: string): boolean {
  const sns = /(LINE\s*(?:ID|で応募)|Telegram|DM(?:で|にて)(?:応募|連絡)|X（旧Twitter）のDM)/i.test(text);
  return sns && !hasContactInfo(text);
}
