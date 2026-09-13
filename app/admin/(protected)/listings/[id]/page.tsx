import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { fetchAdminListing } from "../../../../../lib/admin-data";
import {
  AVAILABILITY_LABELS,
  CATEGORY_LABELS,
  PURPOSE_TAGS,
  REWARD_LABELS,
  SAFETY_FLAG_LABELS,
  STATUS_LABELS
} from "../../../../../lib/labels";
import type { ListingStatus } from "../../../../../lib/types";
import { setListingStatus, updateListing } from "./actions";

export const metadata: Metadata = { title: "Listing 編集", robots: { index: false } };
export const dynamic = "force-dynamic";

const STATUS_ACTIONS: ListingStatus[] = [
  "active",
  "review_required",
  "draft",
  "expired",
  "closed"
];

function Field({
  label,
  name,
  defaultValue,
  type = "text",
  hint
}: {
  label: string;
  name: string;
  defaultValue: string | number | null;
  type?: string;
  hint?: string;
}) {
  return (
    <label className="block text-sm">
      <span className="text-ink-400">{label}</span>
      <input
        type={type}
        name={name}
        defaultValue={defaultValue ?? ""}
        className="mt-1 w-full rounded border border-ink-700 bg-ink-950 px-3 py-2 text-ink-50"
      />
      {hint && <span className="mt-1 block text-xs text-ink-400">{hint}</span>}
    </label>
  );
}

function TriState({
  label,
  name,
  value,
  hint
}: {
  label: string;
  name: string;
  value: boolean | null;
  hint?: string;
}) {
  const current = value === null ? "" : String(value);
  return (
    <label className="block text-sm">
      <span className="text-ink-400">{label}</span>
      <select
        name={name}
        defaultValue={current}
        className="mt-1 w-full rounded border border-ink-700 bg-ink-950 px-3 py-2 text-ink-50"
      >
        <option value="">記載を確認できず</option>
        <option value="true">はい</option>
        <option value="false">いいえ</option>
      </select>
      {hint && <span className="mt-1 block text-xs text-ink-400">{hint}</span>}
    </label>
  );
}

export default async function AdminListingDetailPage({ params }: { params: { id: string } }) {
  const listing = await fetchAdminListing(params.id);
  if (!listing) notFound();

  const save = updateListing.bind(null, listing.id);

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="text-xl font-bold text-ink-50">Listing 編集</h1>
        <span className="rounded bg-ink-800 px-2 py-0.5 text-xs text-ink-200">
          {STATUS_LABELS[listing.status]}
        </span>
      </div>

      <p className="mt-2 break-all text-xs text-ink-400">
        情報元：
        <a
          href={listing.source_url}
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-ink-200"
        >
          {listing.source_url}
        </a>
      </p>

      {listing.review_reason && (
        <div className="mt-4 rounded border border-sweat-500 p-4">
          <h2 className="text-sm font-bold text-sweat-400">確認が必要な理由</h2>
          <pre className="mt-2 whitespace-pre-wrap text-xs leading-relaxed text-ink-200">
            {listing.review_reason}
          </pre>
        </div>
      )}

      {/* ---- status 変更 ---- */}
      <div className="mt-6 flex flex-wrap gap-2">
        {STATUS_ACTIONS.map((status) => (
          <form key={status} action={setListingStatus.bind(null, listing.id, status)}>
            <button
              type="submit"
              disabled={listing.status === status}
              className="rounded border border-ink-700 px-3 py-1 text-sm text-ink-200 hover:border-ink-400 disabled:opacity-30"
            >
              {status === "active" ? "公開する" : `${STATUS_LABELS[status]} にする`}
            </button>
          </form>
        ))}
      </div>

      {/* ---- Fact 編集 ---- */}
      <form action={save} className="mt-8 space-y-6">
        <section className="space-y-4 rounded-lg border border-ink-800 bg-ink-900 p-5">
          <h2 className="text-sm font-bold text-ink-50">事実（Source にある内容のみ）</h2>

          <Field label="タイトル" name="title" defaultValue={listing.title} />

          <label className="block text-sm">
            <span className="text-ink-400">仕事内容</span>
            <textarea
              name="description"
              rows={6}
              defaultValue={listing.description ?? ""}
              className="mt-1 w-full rounded border border-ink-700 bg-ink-950 px-3 py-2 text-ink-50"
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="work_type" name="work_type" defaultValue={listing.work_type} />
            <label className="block text-sm">
              <span className="text-ink-400">カテゴリ</span>
              <select
                name="category"
                defaultValue={listing.category ?? ""}
                className="mt-1 w-full rounded border border-ink-700 bg-ink-950 px-3 py-2 text-ink-50"
              >
                <option value="">未設定</option>
                {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <TriState
            label="身体を使う仕事か"
            name="physical_work"
            value={listing.physical_work}
            hint="場所ではなく仕事内容で判断する"
          />
        </section>

        <section className="space-y-4 rounded-lg border border-ink-800 bg-ink-900 p-5">
          <h2 className="text-sm font-bold text-ink-50">報酬</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="text-ink-400">種別</span>
              <select
                name="reward_type"
                defaultValue={listing.reward_type}
                className="mt-1 w-full rounded border border-ink-700 bg-ink-950 px-3 py-2 text-ink-50"
              >
                {Object.entries(REWARD_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <Field
              label="表記（Source のまま）"
              name="pay_text"
              defaultValue={listing.pay_text}
            />
            <Field label="下限" name="pay_min" defaultValue={listing.pay_min} type="number" />
            <Field label="上限" name="pay_max" defaultValue={listing.pay_max} type="number" />
            <Field
              label="単位"
              name="pay_unit"
              defaultValue={listing.pay_unit}
              hint="hourly / daily / per_task"
            />
            <TriState
              label="交通費支給"
              name="expenses_provided"
              value={listing.expenses_provided}
            />
          </div>
          <Field
            label="食事・宿泊など"
            name="benefits_text"
            defaultValue={listing.benefits_text}
          />
        </section>

        <section className="space-y-4 rounded-lg border border-ink-800 bg-ink-900 p-5">
          <h2 className="text-sm font-bold text-ink-50">日程・募集形態</h2>
          <label className="block text-sm">
            <span className="text-ink-400">募集形態</span>
            <select
              name="availability_type"
              defaultValue={listing.availability_type}
              className="mt-1 w-full rounded border border-ink-700 bg-ink-950 px-3 py-2 text-ink-50"
            >
              {Object.entries(AVAILABILITY_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
            <span className="mt-1 block text-xs text-ink-400">
              「土日勤務可能」しか書かれていないものを fixed_date にしない
            </span>
          </label>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="開催日" name="event_date" defaultValue={listing.event_date} type="date" />
            <Field
              label="終了日"
              name="event_end_date"
              defaultValue={listing.event_end_date}
              type="date"
            />
            <Field
              label="応募締切"
              name="application_deadline"
              defaultValue={listing.application_deadline}
              type="date"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="時間帯"
              name="work_hours_text"
              defaultValue={listing.work_hours_text}
              hint="例: 09:00–12:00"
            />
            <TriState
              label="土日に働けると Source に記載がある"
              name="weekend_available"
              value={listing.weekend_available}
            />
          </div>
          <Field label="日程の補足" name="schedule_note" defaultValue={listing.schedule_note} />
        </section>

        <section className="space-y-4 rounded-lg border border-ink-800 bg-ink-900 p-5">
          <h2 className="text-sm font-bold text-ink-50">場所・資格</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="都道府県" name="prefecture" defaultValue={listing.prefecture} />
            <Field label="市区町村" name="city" defaultValue={listing.city} />
            <Field label="住所" name="address" defaultValue={listing.address} />
            <Field label="最寄駅" name="nearest_station" defaultValue={listing.nearest_station} />
            <Field label="集合場所" name="meeting_point" defaultValue={listing.meeting_point} />
          </div>
          <TriState
            label="資格が必要か"
            name="qualification_required"
            value={listing.qualification_required}
            hint="Source に明示がない場合は「記載を確認できず」のままにする"
          />
          <Field
            label="必要な資格"
            name="required_qualifications"
            defaultValue={listing.required_qualifications.join("、")}
            hint="読点・改行区切り"
          />
        </section>

        <section className="space-y-4 rounded-lg border border-ink-800 bg-ink-900 p-5">
          <h2 className="text-sm font-bold text-sweat-400">編集（肉体副業メモ）</h2>
          <p className="text-xs text-ink-400">
            Source にない効能・感想を事実として書かない。書くなら「編集部の視点」として書く。
          </p>
          <textarea
            name="editorial_note"
            rows={4}
            defaultValue={listing.editorial_note ?? ""}
            className="w-full rounded border border-ink-700 bg-ink-950 px-3 py-2 text-ink-50"
          />
          <Field
            label="purpose tags"
            name="purpose_tags"
            defaultValue={listing.purpose_tags.join("、")}
            hint={`候補: ${PURPOSE_TAGS.join(" / ")}`}
          />
          <Field
            label="safety flags"
            name="safety_flags"
            defaultValue={listing.safety_flags.join("、")}
            hint={Object.keys(SAFETY_FLAG_LABELS).join(" / ")}
          />
          <Field
            label="確認が必要な理由（解消したら空にする）"
            name="review_reason"
            defaultValue={listing.review_reason}
          />
        </section>

        <div className="flex items-center gap-4">
          <button
            type="submit"
            className="rounded bg-ink-50 px-5 py-2 text-sm font-bold text-ink-950 hover:bg-white"
          >
            保存する
          </button>
          <Link href="/admin/listings" className="text-sm text-ink-400 underline underline-offset-4">
            一覧に戻る
          </Link>
        </div>
      </form>
    </div>
  );
}
