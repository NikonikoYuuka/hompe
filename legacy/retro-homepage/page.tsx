import Link from "next/link";

const navItems = [
  { href: "/signup", label: "サインアップ" },
  { href: "/login", label: "ログイン" },
  { href: "/dashboard", label: "ダッシュボード" }
];

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col items-center justify-center gap-8 px-6 text-center">
      <section className="rounded-3xl border border-emerald-400/40 bg-black/40 p-10 shadow-xl backdrop-blur">
        <h1 className="text-3xl font-bold text-retroPink md:text-5xl">
          Retro Homepage Builder
        </h1>
        <p className="mt-4 text-slate-200">
          2000年代の個人ほむぺ体験を最短で再現できるSaaS。テンプレートを選んで、
          プロフィールと日記を公開するだけで懐かしさ満点のサイトをつくれます。
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-full border border-retroPink/60 px-4 py-2 text-retroPink transition hover:bg-retroPink hover:text-black"
            >
              {item.label}
            </Link>
          ))}
        </div>
      </section>
      <section className="grid w-full gap-4 md:grid-cols-3">
        <FeatureCard
          title="テンプレート選択"
          description="cute pink / cool blue など4種類のレトロテーマをベースにカスタマイズ。"
        />
        <FeatureCard
          title="日記エディタ"
          description="Unicode絵文字や画像1枚を添えて2,000文字まで投稿可能。"
        />
        <FeatureCard
          title="軽量公開ページ"
          description="最新10件の日記とプロフィールをガラケーでも読みやすい形で配信。"
        />
      </section>
    </main>
  );
}

function FeatureCard({
  title,
  description
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-700/60 bg-slate-900/60 p-6 text-left shadow-lg">
      <h2 className="text-xl font-semibold text-retroYellow">{title}</h2>
      <p className="mt-3 text-sm text-slate-200">{description}</p>
    </div>
  );
}
