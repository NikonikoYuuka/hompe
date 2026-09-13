import { hasContactInfo, usesOnlySnsContact } from "./extract/patterns";
import type { PayFacts } from "./extract/patterns";
import type { SafetyFlag } from "./types";

/**
 * Safety flags (docs/03_SOURCE_POLICY.md §6)。
 *
 * 高報酬だけを理由に危険と判断しない。**透明性を評価する。**
 */

export interface SafetyInput {
  text: string;
  entityName: string | null;
  description: string | null;
  prefecture: string | null;
  pay: PayFacts | null;
}

/** この日給を超え、かつ仕事内容の記述が薄い場合に high_pay_low_detail を立てる */
const HIGH_DAILY_PAY = 20_000;
const HIGH_HOURLY_PAY = 3_000;
const MIN_DESCRIPTION_LENGTH = 80;

export function judgeSafety(input: SafetyInput): SafetyFlag[] {
  const flags: SafetyFlag[] = [];
  const description = input.description ?? "";

  if (!input.entityName) flags.push("unverified_entity");
  if (description.length < MIN_DESCRIPTION_LENGTH) flags.push("vague_work");
  if (!input.prefecture) flags.push("missing_location");
  if (!hasContactInfo(input.text)) flags.push("missing_contact");
  if (usesOnlySnsContact(input.text)) {
    flags.push("sns_only", "suspicious_contact_channel");
  }

  const pay = input.pay;
  if (pay && description.length < MIN_DESCRIPTION_LENGTH) {
    const amount = pay.max ?? pay.min ?? 0;
    const high =
      (pay.unit === "daily" && amount >= HIGH_DAILY_PAY) ||
      (pay.unit === "hourly" && amount >= HIGH_HOURLY_PAY);
    if (high) flags.push("high_pay_low_detail");
  }

  return [...new Set(flags)];
}

/** 自動公開してはいけない flag（匿名 SNS のみの募集等） */
const BLOCKING_FLAGS: SafetyFlag[] = [
  "sns_only",
  "suspicious_contact_channel",
  "unverified_entity",
  "high_pay_low_detail"
];

export function blocksAutoPublish(flags: string[]): SafetyFlag[] {
  return BLOCKING_FLAGS.filter((flag) => flags.includes(flag));
}
