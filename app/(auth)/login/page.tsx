export const metadata = {
  title: "ログイン | Retro Homepage Builder"
};

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 px-6">
      <h1 className="text-3xl font-bold text-retroBlue">ログイン</h1>
      <p className="text-slate-200">
        Supabase Auth を利用したメールリンク認証をここに実装します。現時点では
        UI の骨組みだけを用意しています。
      </p>
    </main>
  );
}
