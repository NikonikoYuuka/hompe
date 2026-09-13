import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import type { Metadata } from "next";
import { ADMIN_COOKIE, adminTokenConfigured, verifyAdminToken } from "../../../lib/admin-auth";

export const metadata: Metadata = { title: "管理ログイン", robots: { index: false } };

/** V0.1 の管理画面は共有トークン1つで入る (D-015) */
export default async function AdminLoginPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const tokenConfigured = await adminTokenConfigured();

  async function login(formData: FormData) {
    "use server";
    const token = String(formData.get("token") ?? "");
    if (!(await verifyAdminToken(token))) {
      // 総当たりを Workers Logs から検知できるようにする（本命は Cloudflare の Rate Limiting）
      console.warn("[admin] ログイン失敗");
      redirect("/admin/login?error=1");
    }
    (await cookies()).set(ADMIN_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/admin",
      maxAge: 60 * 60 * 12
    });
    redirect("/admin");
  }

  return (
    <div className="mx-auto max-w-sm px-5 py-16">
      <h1 className="text-xl font-bold text-ink-50">管理ログイン</h1>

      {!tokenConfigured && (
        <p className="mt-4 rounded border border-sweat-500 p-3 text-sm text-sweat-400">
          ADMIN_TOKEN が設定されていません。`wrangler secret put ADMIN_TOKEN` で登録してください。
        </p>
      )}

      <form action={login} className="mt-6 space-y-4">
        <label className="block text-sm">
          <span className="text-ink-400">トークン</span>
          <input
            type="password"
            name="token"
            autoComplete="off"
            required
            className="mt-1 w-full rounded border border-ink-700 bg-ink-950 px-3 py-2 text-ink-50"
          />
        </label>
        {error && (
          <p className="text-sm text-sweat-400">トークンが違います。</p>
        )}
        <button
          type="submit"
          className="w-full rounded bg-ink-50 px-4 py-2 text-sm font-bold text-ink-950 hover:bg-white"
        >
          ログイン
        </button>
      </form>
    </div>
  );
}
