import Link from "next/link";
import type { Metadata } from "next";
import { ListingCard } from "../_components/listing-card";
import { CATEGORY_LABELS } from "../../lib/labels";
import {
  fetchAvailablePrefectures,
  fetchPublicListings,
  type ListingFilters
} from "../../lib/listings";
import type { ListingCategory } from "../../lib/types";

/**
 * Listing 一覧。
 *
 * フィルタは DB query で足りる最小限 (spec §33)。
 * 複雑な search engine もユーザー適性スコアリングも作らない。
 */

export const metadata: Metadata = { title: "案件をさがす" };
export const revalidate = 300;

type SearchParams = Record<string, string | string[] | undefined>;

const CATEGORY_KEYS = Object.keys(CATEGORY_LABELS) as ListingCategory[];

const AVAILABILITY_OPTIONS = [
  { value: "fixed_date", label: "日付が決まっている" },
  { value: "recurring", label: "定期募集" },
  { value: "registration", label: "登録制" }
] as const;

const REWARD_OPTIONS = [
  { value: "paid", label: "有給" },
  { value: "volunteer", label: "無償" }
] as const;

function single(params: SearchParams, key: string): string | undefined {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

function parseFilters(params: SearchParams): ListingFilters {
  const category = single(params, "category");
  const availability = single(params, "availability");
  const reward = single(params, "reward");
  const prefecture = single(params, "area");
  const qualification = single(params, "qualification");

  return {
    category: CATEGORY_KEYS.includes(category as ListingCategory)
      ? (category as ListingCategory)
      : undefined,
    availability: AVAILABILITY_OPTIONS.some((o) => o.value === availability)
      ? (availability as ListingFilters["availability"])
      : undefined,
    reward: REWARD_OPTIONS.some((o) => o.value === reward)
      ? (reward as ListingFilters["reward"])
      : undefined,
    prefecture: prefecture || undefined,
    qualification: qualification === "none" ? "none" : undefined
  };
}

export default async function ListingsPage({
  searchParams
}: {
  searchParams: SearchParams;
}) {
  const filters = parseFilters(searchParams);
  const [listings, prefectures] = await Promise.all([
    fetchPublicListings(filters),
    fetchAvailablePrefectures()
  ]);

  const hasFilter = Object.values(filters).some(Boolean);

  return (
    <div className="mx-auto max-w-5xl px-5 py-10">
      <h1 className="text-2xl font-bold text-ink-50">案件をさがす</h1>
      <p className="mt-2 text-sm text-ink-400">
        公式の募集ページから集めた案件です。応募・詳細は各公式サイトで確認してください。
      </p>

      <form method="get" className="mt-8 rounded-lg border border-ink-800 bg-ink-900 p-5">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block text-sm">
            <span className="text-ink-400">カテゴリ</span>
            <select
              name="category"
              defaultValue={filters.category ?? ""}
              className="mt-1 w-full rounded border border-ink-700 bg-ink-950 px-3 py-2 text-ink-50"
            >
              <option value="">指定なし</option>
              {CATEGORY_KEYS.map((key) => (
                <option key={key} value={key}>
                  {CATEGORY_LABELS[key]}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm">
            <span className="text-ink-400">エリア</span>
            <select
              name="area"
              defaultValue={filters.prefecture ?? ""}
              className="mt-1 w-full rounded border border-ink-700 bg-ink-950 px-3 py-2 text-ink-50"
            >
              <option value="">指定なし</option>
              {prefectures.map((prefecture) => (
                <option key={prefecture} value={prefecture}>
                  {prefecture}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm">
            <span className="text-ink-400">募集形態</span>
            <select
              name="availability"
              defaultValue={filters.availability ?? ""}
              className="mt-1 w-full rounded border border-ink-700 bg-ink-950 px-3 py-2 text-ink-50"
            >
              <option value="">指定なし</option>
              {AVAILABILITY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm">
            <span className="text-ink-400">報酬</span>
            <select
              name="reward"
              defaultValue={filters.reward ?? ""}
              className="mt-1 w-full rounded border border-ink-700 bg-ink-950 px-3 py-2 text-ink-50"
            >
              <option value="">指定なし</option>
              {REWARD_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 text-sm text-ink-200">
            <input
              type="checkbox"
              name="qualification"
              value="none"
              defaultChecked={filters.qualification === "none"}
              className="h-4 w-4 rounded border-ink-700 bg-ink-950"
            />
            資格不要と明記されているものだけ
          </label>

          <button
            type="submit"
            className="rounded bg-ink-50 px-4 py-2 text-sm font-bold text-ink-950 hover:bg-white"
          >
            絞り込む
          </button>

          {hasFilter && (
            <Link href="/listings" className="text-sm text-ink-400 underline underline-offset-4">
              条件をクリア
            </Link>
          )}
        </div>
      </form>

      <p className="mt-8 text-sm text-ink-400">{listings.length}件</p>

      {listings.length === 0 ? (
        <p className="mt-4 text-sm text-ink-200">
          条件に合う案件がありません。条件を減らすか、来週また見にきてください。
        </p>
      ) : (
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {listings.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </ul>
      )}
    </div>
  );
}
