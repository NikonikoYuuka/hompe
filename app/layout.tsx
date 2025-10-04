import "../styles/globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Retro Homepage Builder",
  description:
    "Create nostalgic 2000s-style personal homepages with modern tooling."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className="min-h-screen bg-slate-950 text-slate-100">
        {children}
      </body>
    </html>
  );
}
