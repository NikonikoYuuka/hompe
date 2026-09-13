"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "../../../../../lib/admin-auth";
import { getDb, nowIso } from "../../../../../lib/db";
import { fromBool, fromList } from "../../../../../lib/db/rows";
import type { ListingStatus } from "../../../../../lib/types";

/**
 * Fact 修正 / status 変更 / publish・unpublish (spec §32)。
 *
 * 人間が触ったものは extraction_method = 'human' になる。
 * 削除は行わない。取り下げは status を closed にする (D-004)。
 */

const TEXT_FIELDS = [
  "title",
  "description",
  "work_type",
  "pay_text",
  "pay_unit",
  "benefits_text",
  "prefecture",
  "city",
  "address",
  "nearest_station",
  "meeting_point",
  "schedule_note",
  "work_hours_text",
  "editorial_note",
  "review_reason",
  "event_date",
  "event_end_date",
  "application_deadline",
  "category"
] as const;

const BOOL_FIELDS = [
  "physical_work",
  "expenses_provided",
  "qualification_required",
  "weekend_available"
] as const;

function text(formData: FormData, key: string): string | null {
  const value = formData.get(key);
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function tristate(formData: FormData, key: string): boolean | null {
  const value = formData.get(key);
  if (value === "true") return true;
  if (value === "false") return false;
  return null;
}

function list(formData: FormData, key: string): string[] {
  const value = text(formData, key);
  if (!value) return [];
  return value
    .split(/[,、\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

async function requireAdmin() {
  if (!(await isAdminAuthenticated())) redirect("/admin/login");
}

export async function updateListing(id: string, formData: FormData) {
  await requireAdmin();

  const columns: string[] = [];
  const params: unknown[] = [];

  const set = (column: string, value: unknown) => {
    columns.push(`${column} = ?`);
    params.push(value);
  };

  for (const field of TEXT_FIELDS) set(field, text(formData, field));
  for (const field of BOOL_FIELDS) set(field, fromBool(tristate(formData, field)));

  set("availability_type", text(formData, "availability_type") ?? "unknown");
  set("reward_type", text(formData, "reward_type") ?? "unknown");
  set("required_qualifications", fromList(list(formData, "required_qualifications")));
  set("purpose_tags", fromList(list(formData, "purpose_tags")));
  set("safety_flags", fromList(list(formData, "safety_flags")));

  const payMin = text(formData, "pay_min");
  const payMax = text(formData, "pay_max");
  set("pay_min", payMin ? Number(payMin) : null);
  set("pay_max", payMax ? Number(payMax) : null);

  set("extraction_method", "human");
  // 人間が確認した時点を「最終確認」とする
  set("last_verified_at", nowIso());

  params.push(id);

  const db = await getDb();
  await db.run(`update listings set ${columns.join(", ")} where id = ?`, params);

  revalidatePath(`/admin/listings/${id}`);
  revalidatePath("/admin/review");
  revalidatePath(`/listings/${id}`);
}

export async function setListingStatus(id: string, status: ListingStatus) {
  await requireAdmin();

  const columns = ["status = ?"];
  const params: unknown[] = [status];

  if (status === "active") {
    columns.push("published_at = ?", "last_verified_at = ?");
    params.push(nowIso(), nowIso());
  }
  if (status === "closed") {
    columns.push("closed_at = ?");
    params.push(nowIso());
  }
  params.push(id);

  const db = await getDb();
  await db.run(`update listings set ${columns.join(", ")} where id = ?`, params);

  revalidatePath(`/admin/listings/${id}`);
  revalidatePath("/admin/listings");
  revalidatePath("/admin/review");
  revalidatePath("/listings");
  revalidatePath(`/listings/${id}`);
}
