import type { PayFacts } from "./extract/patterns";
import type { ListingCategory, RewardType } from "./types";

/**
 * 副業として成立する働き方かの判定 (D-026)。
 *
 * `lib/eligibility.ts` が「仕事の中身」を見る軸なのに対し、こちらは「働き方」の軸。
 * 2つは直交する。介護は正社員でも介護なので、中身の判定だけでは
 * 転職案件が「週末の肉体副業」として載ってしまう。
 *
 * **既定は「載せない」。** Source が副業として成立する雇用形態を明示していない限り、
 * 掲載しない。「たぶんアルバイトだろう」と推論しない（事実を増やさない）。
 */

/**
 * 本業を置き換える働き方。これが書かれていたら対象外。
 *
 * - 「正社員登用あり」はアルバイトの福利なので除外しない
 * - 「非常勤」は常勤ではないので除外しない
 * - 「無期雇用派遣」「紹介予定派遣」は派遣と書かれていても実質フルタイムなので、
 *   ここに入れて「派遣」と衝突させ、review に回す
 */
const FULLTIME_PATTERNS: Array<[string, RegExp]> = [
  ["正社員", /正社員(?!登用)/],
  ["正規雇用", /正規雇用/],
  ["常勤", /(?<!非)常勤/],
  ["フルタイム", /フルタイム/],
  ["週5日勤務", /週\s*[5５]\s*日/],
  ["無期雇用", /無期雇用/],
  ["紹介予定", /紹介予定/]
];

/** 掲載しないと決めた雇用形態 (D-026) */
const NOT_CARRIED_PATTERNS: Array<[string, RegExp]> = [
  ["契約社員", /契約社員/],
  ["業務委託", /業務委託/]
];

/** 副業として成立すると Source が明示している働き方 */
const SIDE_JOB_PATTERNS: Array<[string, RegExp]> = [
  ["単発", /単発/],
  ["スポット", /スポット/],
  ["短期", /短期/],
  ["日雇", /日雇/],
  ["副業可", /副業/],
  ["Wワーク", /(?:W|Ｗ|ダブル)ワーク/],
  ["掛け持ち", /掛け持ち|かけもち/],
  ["週1日から", /週\s*[1１]\s*日?\s*(?:から|〜|~)/],
  ["登録制", /登録制|スタッフ登録/],
  ["アルバイト", /アルバイト|バイト/],
  ["パート", /パート(?!ナー)/],
  ["派遣", /派遣/]
];

export interface SideJobFit {
  /** true: 副業として掲載可 / false: 対象外 / null: 判断できない → review */
  suitable: boolean | null;
  /** 判定根拠。監査と review 画面での説明に使う */
  reason: string;
}

function matched(text: string, patterns: Array<[string, RegExp]>): string[] {
  return patterns.filter(([, pattern]) => pattern.test(text)).map(([label]) => label);
}

export interface SideJobContext {
  category: ListingCategory | null;
  rewardType: RewardType;
  /** 報酬の単位。日給・日当は単発の仕事の指標として扱う (D-026) */
  payUnit: PayFacts["unit"];
}

export function judgeSideJobFit(text: string, context: SideJobContext): SideJobFit {
  const fulltime = matched(text, FULLTIME_PATTERNS);
  const notCarried = matched(text, NOT_CARRIED_PATTERNS);
  const sideJob = matched(text, SIDE_JOB_PATTERNS);

  /**
   * 日給・日当で募集しているものは単発の仕事とみなす。
   *
   * 「日給月給制」は建設業などの正社員の給与制度なので、これに含めてはいけない。
   * extractPay は「日給月給」を daily と判定しない（単位語の直後に金額が来ないため）ので、
   * ここで payUnit を見る限り取り違えない。
   */
  if (context.payUnit === "daily") sideJob.push("日給");

  // 複数の雇用形態が書かれている（例:「正社員・アルバイト同時募集」）。
  // どれが主かをコードでは決められない
  if ((fulltime.length > 0 || notCarried.length > 0) && sideJob.length > 0) {
    return {
      suitable: null,
      reason:
        `複数の雇用形態の記載が同居している: ${[...fulltime, ...notCarried].join(" / ")}` +
        ` と ${sideJob.join(" / ")}。どの募集かを人間が確認する必要がある`
    };
  }

  if (fulltime.length > 0) {
    return {
      suitable: false,
      reason: `本業を置き換える働き方の記載: ${fulltime.join(" / ")}`
    };
  }

  if (notCarried.length > 0) {
    return {
      suitable: false,
      reason: `掲載対象にしていない雇用形態: ${notCarried.join(" / ")}`
    };
  }

  if (sideJob.length > 0) {
    return {
      suitable: true,
      reason: `副業として成立する記載: ${sideJob.join(" / ")}`
    };
  }

  // ボランティア・地域活動は雇用ではないので、この軸の判定対象外
  if (context.category === "volunteer_local" || context.rewardType === "volunteer") {
    return { suitable: true, reason: "ボランティア・地域活動のため雇用形態の判定対象外" };
  }

  return {
    suitable: false,
    reason: "副業として成立する雇用形態の記載が見つからなかった（記載がなければ推論しない）"
  };
}
