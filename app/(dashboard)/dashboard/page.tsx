export const metadata = {
  title: "ダッシュボード | Retro Homepage Builder"
};

const checklist = [
  "プロフィールを設定",
  "テンプレートを選択",
  "最初の日記を保存"
];

export default function DashboardPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 px-6 py-12">
      <header>
        <h1 className="text-3xl font-bold text-retroPink">ダッシュボード</h1>
        <p className="mt-2 text-slate-200">
          ここでプロフィール・デザイン・日記をまとめて管理します。
        </p>
      </header>
      <section className="rounded-2xl border border-retroPink/40 bg-slate-900/60 p-6">
        <h2 className="text-xl font-semibold text-retroYellow">スタートガイド</h2>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-slate-100">
          {checklist.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>
    </main>
  );
}
