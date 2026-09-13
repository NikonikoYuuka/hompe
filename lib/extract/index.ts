import { normalizeContent, extractHeadings, factHash } from "../normalize";
import { judgeEligibility } from "../eligibility";
import { judgeSafety } from "../safety";
import { judgeSideJobFit } from "../side-job";
import { extractFromJsonLd } from "./jsonld";
import {
  extractDeadline,
  extractEventDate,
  extractExpenses,
  extractLocation,
  extractNearestStation,
  extractPay,
  extractQualification,
  extractVolunteer,
  extractWeekendMention,
  extractWorkHours,
  type PayFacts
} from "./patterns";
import type {
  AvailabilityType,
  Extracted,
  ListingCategory,
  RewardType,
  SourceGrade
} from "../types";

/**
 * Rule extraction のオーケストレーション (spec §25)。
 *
 * 順序は「構造化データ → 正規表現 → 諦めて review_required」。
 * **AI は使わない。確信できない場合は推論せず review に回す。**
 */

export interface ExtractedListing {
  title: string;
  description: string | null;
  workType: string | null;
  category: ListingCategory | null;
  physicalWork: boolean | null;
  eligibilityReason: string;

  rewardType: RewardType;
  payText: string | null;
  payMin: number | null;
  payMax: number | null;
  payUnit: string | null;
  expensesProvided: boolean | null;

  prefecture: string | null;
  city: string | null;
  address: string | null;
  nearestStation: string | null;

  qualificationRequired: boolean | null;
  requiredQualifications: string[];

  availabilityType: AvailabilityType;
  eventDate: string | null;
  eventEndDate: string | null;
  applicationDeadline: string | null;
  workHoursText: string | null;
  weekendAvailable: boolean | null;

  safetyFlags: string[];
  factHash: string;

  /** 人間が確認すべき理由。空なら自動公開の候補にできる。 */
  reviewReasons: string[];
  /** 監査用: どの Fact をどこから取ったか */
  evidence: Record<string, string>;
}

function take<T>(
  primary: Extracted<T> | null,
  fallback: Extracted<T> | null
): Extracted<T> | null {
  return primary ?? fallback ?? null;
}

/**
 * availability_type の判定 (D-005)。
 *
 * 「土日勤務可能」しか書かれていないものを fixed_date にしない。
 */
function judgeAvailability(
  text: string,
  eventDate: string | null
): { type: AvailabilityType; reason: string | null } {
  if (eventDate) return { type: "fixed_date", reason: null };

  if (/(登録制|登録者募集|スタッフ登録|登録後|事前登録)/.test(text)) {
    return { type: "registration", reason: null };
  }
  if (/(週\s*[1-7１-７]\s*回|毎週|随時募集|シフト制|定期的に)/.test(text)) {
    return { type: "recurring", reason: null };
  }
  return {
    type: "unknown",
    reason: "開催日も募集形態（登録制 / 定期）も特定できなかった"
  };
}

export interface ExtractInput {
  html: string;
  /** Source に紐づく募集主体名。safety 判定に使う */
  entityName: string | null;
  /** grade C は rule 抽出が成功しても自動公開しない (docs/03_SOURCE_POLICY.md) */
  grade: SourceGrade;
}

export function extractListing(input: ExtractInput): ExtractedListing | null {
  const { html, entityName, grade } = input;
  const text = normalizeContent(html);
  if (text.length < 40) return null;

  const jsonLd = extractFromJsonLd(html);
  const headings = extractHeadings(html);
  const reviewReasons: string[] = [];
  const evidence: Record<string, string> = {};

  const note = (key: string, value: Extracted<unknown> | null) => {
    if (value) evidence[key] = `${value.evidence} (${value.confidence})`;
    if (value && value.confidence === "low") {
      reviewReasons.push(`${key} が推定値のため要確認: ${value.evidence}`);
    }
  };

  // ---- title (必須) ----
  const title = jsonLd.title?.value ?? headings.h1 ?? headings.title;
  if (!title) return null;
  note("title", jsonLd.title);

  // ---- description ----
  const description = jsonLd.description?.value ?? text.slice(0, 600);
  if (!jsonLd.description) {
    reviewReasons.push("構造化データが無く、仕事内容を本文先頭から仮置きしている");
  }

  // ---- eligibility (D-007) ----
  const eligibility = judgeEligibility(text);
  if (eligibility.physicalWork === null) {
    reviewReasons.push(`身体作業かどうか判定できない: ${eligibility.reason}`);
  } else if (eligibility.physicalWork === false) {
    // 対象外と判定できたものは listing にしない
    return null;
  }
  if (eligibility.category === null) {
    reviewReasons.push(`カテゴリを特定できない: ${eligibility.reason}`);
  }

  // ---- reward ----
  const pay = extractPay(text);
  const volunteer = extractVolunteer(text);
  note("pay", pay);
  note("volunteer", volunteer);

  let rewardType: RewardType = "unknown";
  if (pay) rewardType = "paid";
  else if (volunteer) rewardType = "volunteer";
  else reviewReasons.push("報酬の有無を特定できない");

  const expenses = extractExpenses(text);
  note("expenses", expenses);

  // ---- 副業として成立する働き方か (D-026) ----
  // 仕事の中身（physicalWork）とは直交する軸。正社員の介護は「介護」だが副業ではない
  const sideJob = judgeSideJobFit(text, {
    category: eligibility.category,
    rewardType,
    payUnit: pay?.value.unit ?? null
  });
  if (sideJob.suitable === false) {
    // 対象外と確定したものは listing にしない（PC 中心の仕事と同じ扱い）
    return null;
  }
  if (sideJob.suitable === null) {
    reviewReasons.push(`副業として成立するか判定できない: ${sideJob.reason}`);
  }

  // ---- location ----
  const location = take(
    jsonLd.prefecture
      ? {
          value: {
            prefecture: jsonLd.prefecture.value,
            city: jsonLd.city?.value ?? null,
            address: jsonLd.address?.value ?? null
          },
          confidence: "high" as const,
          evidence: jsonLd.prefecture.evidence
        }
      : null,
    extractLocation(text)
  );
  note("location", location);
  if (!location) reviewReasons.push("勤務地（都道府県）を特定できない");

  const station = extractNearestStation(text);
  note("nearestStation", station);

  // ---- qualification (D-011) ----
  const qualification = extractQualification(text);
  note("qualification", qualification);
  if (!qualification) {
    reviewReasons.push("資格要件の記載を特定できない（無資格可と推論しない）");
  }

  // ---- schedule ----
  const eventDate = take(jsonLd.eventDate, extractEventDate(text));
  const eventEndDate = jsonLd.eventEndDate;
  const deadline = take(jsonLd.deadline, extractDeadline(text));
  const hours = extractWorkHours(text);
  const weekend = extractWeekendMention(text);
  note("eventDate", eventDate);
  note("eventEndDate", eventEndDate);
  note("deadline", deadline);
  note("workHours", hours);
  note("weekend", weekend);

  const availability = judgeAvailability(text, eventDate?.value ?? null);
  if (availability.reason) reviewReasons.push(availability.reason);

  // ---- safety ----
  const safetyFlags = judgeSafety({
    text,
    entityName,
    description: jsonLd.description?.value ?? null,
    prefecture: location?.value.prefecture ?? null,
    pay: (pay?.value as PayFacts | undefined) ?? null
  });
  if (safetyFlags.length > 0) {
    reviewReasons.push(`safety flag: ${safetyFlags.join(" / ")}`);
  }

  // grade C は条件が不明確なので、抽出が全部通っても自動公開しない
  if (grade === "C") {
    reviewReasons.push("Source grade C（自動取得・再利用条件が不明確）のため自動公開しない");
  }

  const facts: ExtractedListing = {
    title,
    description,
    workType: eligibility.workType,
    category: eligibility.category,
    physicalWork: eligibility.physicalWork,
    eligibilityReason: `${eligibility.reason} / 働き方: ${sideJob.reason}`,

    rewardType,
    payText: pay?.value.text ?? null,
    payMin: pay?.value.min ?? null,
    payMax: pay?.value.max ?? null,
    payUnit: pay?.value.unit ?? null,
    expensesProvided: expenses?.value ?? null,

    prefecture: location?.value.prefecture ?? null,
    city: location?.value.city ?? null,
    address: location?.value.address ?? null,
    nearestStation: station?.value ?? null,

    qualificationRequired: qualification?.value.required ?? null,
    requiredQualifications: qualification?.value.names ?? [],

    availabilityType: availability.type,
    eventDate: eventDate?.value ?? null,
    eventEndDate: eventEndDate?.value ?? null,
    applicationDeadline: deadline?.value ?? null,
    workHoursText: hours?.value ?? null,
    weekendAvailable: weekend?.value ?? null,

    safetyFlags,
    factHash: "",
    reviewReasons,
    evidence
  };

  // Fact Cache 用の hash は「事実」だけで作る。review 理由や evidence は含めない (D-014)
  const { reviewReasons: _r, evidence: _e, factHash: _f, ...factsOnly } = facts;
  facts.factHash = factHash(factsOnly as Record<string, unknown>);

  return facts;
}
