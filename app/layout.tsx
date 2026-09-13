import "../styles/globals.css";
import type { Metadata } from "next";
import Link from "next/link";
import { AdScript } from "./_components/ad-script";
import { PageViewTracker } from "./_components/page-view-tracker";

export const metadata: Metadata = {
  title: {
    default: "肉体副業",
    template: "%s｜肉体副業"
  },
  description:
    "週末に身体を使ってできる仕事・アルバイト・ボランティア・地域活動を、公式の募集情報から集めて紹介するメディアです。"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className="flex min-h-screen flex-col bg-ink-950 font-sans text-ink-200">
        <header className="border-b border-ink-800">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4">
            <Link href="/" className="text-lg font-bold tracking-tight text-ink-50">
              肉体副業
            </Link>
            <nav className="flex items-center gap-5 text-sm">
              <Link href="/listings" className="hover:text-sweat-400">
                案件をさがす
              </Link>
              <Link href="/about" className="hover:text-sweat-400">
                このサイトについて
              </Link>
            </nav>
          </div>
        </header>

        <main className="flex-1">{children}</main>

        <footer className="border-t border-ink-800">
          <div className="mx-auto max-w-5xl px-5 py-8 text-xs text-ink-400">
            <p>
              肉体副業は、公開されている募集情報を集めて紹介する編集メディアです。
              応募の受付・仲介は行っていません。詳細と応募は各情報提供元の公式ページで確認してください。
            </p>
            <p className="mt-3 flex flex-wrap gap-4">
              <Link href="/about" className="underline hover:text-ink-200">
                掲載方針・免責事項
              </Link>
              <Link href="/privacy" className="underline hover:text-ink-200">
                プライバシーポリシー
              </Link>
            </p>
          </div>
        </footer>

        <PageViewTracker />
        <AdScript />
      </body>
    </html>
  );
}
