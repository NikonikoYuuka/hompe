import type { ListingCategory } from "./types";

/**
 * Work eligibility の判定 (D-007)。
 *
 * **場所ではなく実際の仕事内容で判断する。**
 * キャンプ場勤務でも、電話＋受付＋PC 入力中心なら原則対象外。
 *
 * 曖昧な場合は true/false を決めつけず null を返し、review_required にする。
 */

interface WorkTypeRule {
  /** DB に保存する詳細 work_type */
  workType: string;
  /** 公開側の4カテゴリ (D-008) */
  category: ListingCategory;
  keywords: string[];
}

/** Include 候補（spec §14） */
const INCLUDE_RULES: WorkTypeRule[] = [
  { workType: "agriculture", category: "nature_outdoor", keywords: ["農作業", "農業", "農園", "田植え", "農家"] },
  { workType: "harvest", category: "nature_outdoor", keywords: ["収穫", "もぎ取り", "選果", "摘果"] },
  { workType: "grass_cutting", category: "nature_outdoor", keywords: ["草刈り", "草刈", "除草"] },
  { workType: "forest_maintenance", category: "nature_outdoor", keywords: ["森林整備", "間伐", "枝打ち", "植林", "里山"] },
  { workType: "campground_maintenance", category: "nature_outdoor", keywords: ["キャンプ場", "サイト整備", "薪割り"] },
  { workType: "moving", category: "move_build_clear", keywords: ["引越", "引っ越し", "移転作業"] },
  { workType: "carrying", category: "move_build_clear", keywords: ["搬入", "搬出", "荷役", "荷積み", "荷下ろし", "運搬"] },
  { workType: "event_setup", category: "move_build_clear", keywords: ["設営", "会場設営", "ステージ設営", "什器"] },
  { workType: "event_removal", category: "move_build_clear", keywords: ["撤去", "撤収", "バラシ"] },
  { workType: "cleaning", category: "move_build_clear", keywords: ["清掃", "掃除", "ハウスクリーニング", "洗浄"] },
  { workType: "estate_sorting", category: "move_build_clear", keywords: ["遺品整理", "生前整理", "不用品回収", "片付け"] },
  { workType: "care", category: "help_people", keywords: ["介護", "介助", "デイサービス", "訪問入浴", "身体介護"] },
  { workType: "welfare", category: "help_people", keywords: ["福祉", "障がい者支援", "生活支援", "見守り"] },
  { workType: "environmental_activity", category: "volunteer_local", keywords: ["清掃活動", "ビーチクリーン", "河川清掃", "環境保全"] },
  { workType: "community_activity", category: "volunteer_local", keywords: ["地域活動", "自治会", "お祭り", "祭り運営", "町内会", "ボランティア"] }
];

/** Exclude（spec §14） */
const EXCLUDE_KEYWORDS = [
  "データ入力",
  "コールセンター",
  "テレアポ",
  "電話対応のみ",
  "受付のみ",
  "在宅ワーク",
  "リモートワーク",
  "フルリモート",
  "一般事務",
  "オフィスワーク",
  "PC作業がメイン",
  "パソコン入力"
];

/** PC / 電話中心を示す語。include と同時に出た場合は曖昧として扱う。 */
const DESK_SIGNALS = ["PC入力", "パソコン操作", "電話応対", "受付業務", "事務作業", "Excel"];

export interface EligibilityResult {
  /** true: 対象 / false: 対象外 / null: 判定できない → review_required */
  physicalWork: boolean | null;
  workType: string | null;
  category: ListingCategory | null;
  /** 判定根拠。監査と review 画面での説明に使う */
  reason: string;
}

export function judgeEligibility(text: string): EligibilityResult {
  const excluded = EXCLUDE_KEYWORDS.filter((word) => text.includes(word));
  const matched = INCLUDE_RULES.filter((rule) =>
    rule.keywords.some((keyword) => text.includes(keyword))
  );
  const deskSignals = DESK_SIGNALS.filter((word) => text.includes(word));

  if (matched.length === 0) {
    if (excluded.length > 0) {
      return {
        physicalWork: false,
        workType: null,
        category: null,
        reason: `除外キーワード: ${excluded.join(" / ")}`
      };
    }
    return {
      physicalWork: null,
      workType: null,
      category: null,
      reason: "身体を使う仕事に該当するキーワードが見つからなかった"
    };
  }

  // 該当キーワードが複数カテゴリにまたがる場合は人間が決める
  const categories = new Set(matched.map((rule) => rule.category));
  const primary = matched[0];

  if (excluded.length > 0 || deskSignals.length > 0) {
    return {
      physicalWork: null,
      workType: primary.workType,
      category: categories.size === 1 ? primary.category : null,
      reason:
        `身体作業の語 (${matched.map((r) => r.workType).join(" / ")}) と ` +
        `デスクワークの語 (${[...excluded, ...deskSignals].join(" / ")}) が同居している。` +
        "仕事内容の主従を人間が判断する必要がある"
    };
  }

  if (categories.size > 1) {
    return {
      physicalWork: true,
      workType: primary.workType,
      category: null,
      reason: `複数カテゴリに該当: ${[...categories].join(" / ")}。カテゴリは人間が決める`
    };
  }

  return {
    physicalWork: true,
    workType: primary.workType,
    category: primary.category,
    reason: `該当キーワード: ${primary.keywords.filter((k) => text.includes(k)).join(" / ")}`
  };
}
