export const metadata = {
  title: "サインアップ | Retro Homepage Builder"
};

export default function SignupPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 px-6">
      <h1 className="text-3xl font-bold text-retroPink">サインアップ</h1>
      <p className="text-slate-200">
        新規登録フォーム。メール・パスワード登録とSupabaseメール確認を組み込む予定です。
      </p>
    </main>
  );
}
