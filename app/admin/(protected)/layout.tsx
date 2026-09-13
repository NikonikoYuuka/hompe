import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "../../../lib/admin-auth";

export const dynamic = "force-dynamic";

const NAV = [
  { href: "/admin", label: "概要" },
  { href: "/admin/review", label: "要確認" },
  { href: "/admin/listings", label: "Listing" },
  { href: "/admin/sources", label: "Source" }
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  if (!(await isAdminAuthenticated())) redirect("/admin/login");

  return (
    <div className="mx-auto max-w-5xl px-5 py-8">
      <nav className="flex flex-wrap gap-4 border-b border-ink-800 pb-4 text-sm">
        {NAV.map((item) => (
          <Link key={item.href} href={item.href} className="text-ink-400 hover:text-ink-50">
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="pt-6">{children}</div>
    </div>
  );
}
