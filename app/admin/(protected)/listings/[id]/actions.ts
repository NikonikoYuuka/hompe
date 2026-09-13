"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "../../../../../lib/admin-auth";
import { supabaseService } from "../../../../../lib/supabase";
import type { ListingStatus } from "../../../../../lib/types";

/**
 * Fact 修正 / status 変更 / publish・unpublish (spec §32)。
 *
 * 人間が触ったものは extraction_method = 'human' になる。
 * 削除は行わない。取り下げは status を closed にする (D-004)。
 */

const NULLABLE_TEXT = [
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
  "review_reason"
] as const;

const NULLABLE_DATE = ["event_date", "event_end_date", "application_deadline"] as const;

const TRISTATE = [
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

function requireAdmin() {
  if (!isAdminAuthenticated()) redirect("/admin/login");
}

export async function updateListing(id: string, formData: FormData) {
  requireAdmin();

  const patch: Record<string, unknown> = {
    extraction_method: "human"
  };

  for (const key of NULLABLE_TEXT) patch[key] = text(formData, key);
  for (const key of NULLABLE_DATE) patch[key] = text(formData, key);
  for (const key of TRISTATE) patch[key] = tristate(formData, key);

  patch.category = text(formData, "category");
  patch.availability_type = text(formData, "availability_type") ?? "unknown";
  patch.reward_type = text(formData, "reward_type") ?? "unknown";
  patch.required_qualifications = list(formData, "required_qualifications");
  patch.purpose_tags = list(formData, "purpose_tags");
  patch.safety_flags = list(formData, "safety_flags");

  const payMin = text(formData, "pay_min");
  const payMax = text(formData, "pay_max");
  patch.pay_min = payMin ? Number(payMin) : null;
  patch.pay_max = payMax ? Number(payMax) : null;

  // 人間が確認した時点を「最終確認」とする
  patch.last_verified_at = new Date().toISOString();

  const { error } = await supabaseService().from("listings").update(patch).eq("id", id);
  if (error) throw new Error(`更新に失敗しました: ${error.message}`);

  revalidatePath(`/admin/listings/${id}`);
  revalidatePath("/admin/review");
  revalidatePath(`/listings/${id}`);
}

export async function setListingStatus(id: string, status: ListingStatus) {
  requireAdmin();

  const patch: Record<string, unknown> = { status };
  if (status === "active") {
    patch.published_at = new Date().toISOString();
    patch.last_verified_at = new Date().toISOString();
  }
  if (status === "closed") {
    patch.closed_at = new Date().toISOString();
  }

  const { error } = await supabaseService().from("listings").update(patch).eq("id", id);
  if (error) throw new Error(`status の変更に失敗しました: ${error.message}`);

  revalidatePath(`/admin/listings/${id}`);
  revalidatePath("/admin/listings");
  revalidatePath("/admin/review");
  revalidatePath("/listings");
  revalidatePath(`/listings/${id}`);
}
