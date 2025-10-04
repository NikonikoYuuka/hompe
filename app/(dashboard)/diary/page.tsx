export const metadata = {
  title: "日記一覧 | Retro Homepage Builder"
};

const mockEntries = [
  { title: "初めての日記", status: "draft", updatedAt: "2024-02-01" },
  { title: "公開テスト", status: "published", updatedAt: "2024-02-10" }
];

export default function DiaryPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-6 px-6 py-12">
      <header className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-retroBlue">日記管理</h1>
          <p className="text-slate-200">ドラフトと公開済みの記事をこちらで管理します。</p>
        </div>
        <button className="rounded-full border border-retroPink px-4 py-2 text-retroPink transition hover:bg-retroPink hover:text-black">
          新しい日記を書く
        </button>
      </header>
      <section className="space-y-3">
        {mockEntries.map((entry) => (
          <article
            key={entry.title}
            className="flex flex-col justify-between rounded-xl border border-slate-700/60 bg-slate-900/60 p-5 sm:flex-row"
          >
            <div>
              <h2 className="text-lg font-semibold text-retroYellow">{entry.title}</h2>
              <p className="text-sm text-slate-300">最終更新日: {entry.updatedAt}</p>
            </div>
            <span className="mt-2 inline-flex w-fit rounded-full border px-3 py-1 text-sm text-slate-100 sm:mt-0">
              {entry.status === "draft" ? "下書き" : "公開中"}
            </span>
          </article>
        ))}
      </section>
    </main>
  );
}
