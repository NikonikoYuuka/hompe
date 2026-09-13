import Link from "next/link";
import { AdSlot } from "./_components/ad-slot";
import { ListingCard } from "./_components/listing-card";
import { CATEGORY_ENTRIES } from "../lib/labels";
import { fetchWeekendListings, fetchPublicListings } from "../lib/listings";

/**
 * TOP は Brand Layer。尖ったコピーはここに置く。
 * ただし個別案件の事実は必ず ListingCard（Fact Layer）経由で出す (D-006)。
 */

export const revalidate = 300;

export default async function HomePage() {
  const [weekend, latest] = await Promise.all([
    fetchWeekendListings(4),
    fetchPublicListings({}, 6)
  ]);

  return (
    <div className="mx-auto max-w-5xl px-5">
      {/* ---- Brand Layer ---- */}
      <section className="py-14 sm:py-20">
        <p className="text-sm text-sweat-400">週末、肉体副業。</p>
        <h1 className="mt-4 text-3xl font-bold leading-tight text-ink-50 sm:text-5xl">
          休日にスマホ6時間。
          <br />
          それ、休めてる？
        </h1>
        <p className="mt-6 max-w-xl text-base leading-relaxed text-ink-200">
          平日は、頭で稼ぐ。週末は、身体で稼ぐ。
          <br />
          PC閉じて、汗かいて、ついでにお金ももらう。
        </p>
        <p className="mt-4 max-w-xl text-sm leading-relaxed text-ink-400">
          週末に身体を使ってできる仕事・アルバイト・ボランティア・地域活動を、
          公式の募集ページから集めています。応募はそれぞれの公式サイトで。
        </p>
        <div className="mt-8">
          <Link
            href="/listings"
            className="inline-flex items-center rounded-md bg-ink-50 px-5 py-3 text-base font-bold text-ink-950 transition hover:bg-white"
          >
            案件をさがす
          </Link>
        </div>
      </section>

      {/* ---- カテゴリ入口 ---- */}
      <section className="border-t border-ink-800 py-12">
        <h2 className="text-lg font-bold text-ink-50">どっち方向に疲れたい？</h2>
        <ul className="mt-6 grid gap-3 sm:grid-cols-2">
          {CATEGORY_ENTRIES.map((entry) => (
            <li key={entry.key}>
              <Link
                href={`/listings?category=${entry.key}`}
                className="block rounded-lg border border-ink-800 bg-ink-900 p-5 transition hover:border-sweat-500"
              >
                <span className="text-base font-bold text-ink-50">{entry.label}</span>
                <span className="mt-1 block text-sm text-ink-400">{entry.lead}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* ---- 今週末（日付が確定しているものだけ） ---- */}
      {weekend.length > 0 && (
        <section className="border-t border-ink-800 py-12">
          <h2 className="text-lg font-bold text-ink-50">今週末、日付が決まっているもの</h2>
          <p className="mt-1 text-sm text-ink-400">
            開催日が公式ページに明記されている案件だけを出しています。
          </p>
          <ul className="mt-6 grid gap-3 sm:grid-cols-2">
            {weekend.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </ul>
        </section>
      )}

      {/* ---- 最近の掲載 ---- */}
      <section className="border-t border-ink-800 py-12">
        <h2 className="text-lg font-bold text-ink-50">最近の掲載</h2>
        {latest.length === 0 ? (
          <p className="mt-4 text-sm text-ink-400">
            いま出せる案件がありません。木曜に更新しています。
          </p>
        ) : (
          <>
            <ul className="mt-6 grid gap-3 sm:grid-cols-2">
              {latest.map((listing) => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </ul>
            <p className="mt-6">
              <Link href="/listings" className="text-sm text-sweat-400 underline underline-offset-4">
                すべての案件を見る
              </Link>
            </p>
          </>
        )}
      </section>

      <AdSlot placement="top" />
    </div>
  );
}
