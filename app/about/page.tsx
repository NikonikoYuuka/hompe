import type { Metadata } from "next";

export const metadata: Metadata = { title: "このサイトについて" };

/**
 * 法的・Source 表示に必要な最低限 (spec §31)。
 * ここは Fact Layer に準じて、正確に・真面目に書く。
 */
export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-10">
      <h1 className="text-2xl font-bold text-ink-50">このサイトについて</h1>

      <section className="mt-8 space-y-3 text-sm leading-relaxed text-ink-200">
        <h2 className="text-base font-bold text-ink-50">なにをしているサイトか</h2>
        <p>
          肉体副業は、週末に身体を使ってできる仕事・アルバイト・ボランティア・地域活動を、
          公開されている募集情報から集めて紹介する編集・まとめメディアです。
        </p>
        <p>
          平日はPCの前にいる人が、休日にPCとスマートフォンから離れる選択肢を見つけられることを
          目的にしています。
        </p>
      </section>

      <section className="mt-8 space-y-3 text-sm leading-relaxed text-ink-200">
        <h2 className="text-base font-bold text-ink-50">やっていないこと</h2>
        <p>当サイトは求人・求職の申込み受付、仲介、あっせんを行いません。具体的には次のことを行いません。</p>
        <ul className="list-disc space-y-1 pl-5 text-ink-400">
          <li>サイト内での応募受付、履歴書の受付</li>
          <li>候補者の選定、求職者と募集主体の仲介</li>
          <li>閲覧者の情報を募集主体へ送信すること</li>
          <li>適性判定、マッチング、チャット、決済</li>
        </ul>
        <p>
          詳細と応募は、各案件ページの「公式サイトで詳細を見る」から、情報提供元の公式ページで
          行ってください。
        </p>
      </section>

      <section className="mt-8 space-y-3 text-sm leading-relaxed text-ink-200">
        <h2 className="text-base font-bold text-ink-50">情報の集め方</h2>
        <ul className="list-disc space-y-1 pl-5 text-ink-400">
          <li>
            掲載する事実は、原則として雇用主・団体の公式サイト、公式採用ページ、自治体、公的機関、
            NPO、主催者など、募集主体自身が公開している情報から取得しています。
          </li>
          <li>
            第三者の求人サービスは、会社・団体を知るきっかけとしてのみ参照し、掲載する募集内容の
            取得元にはしていません。
          </li>
          <li>
            取得にあたっては、各サイトの利用規約・取得条件を確認しています。条件が不明確な場合は
            自動掲載せず、内容を確認したうえで掲載しています。
          </li>
          <li>
            各案件ページには、情報元と最終確認日を表示しています。
          </li>
        </ul>
      </section>

      <section className="mt-8 space-y-3 text-sm leading-relaxed text-ink-200">
        <h2 className="text-base font-bold text-ink-50">案件情報の書き方</h2>
        <p>
          募集情報の欄には、情報提供元のページに記載されていた事実のみを掲載しています。
          記載のない労働環境、効果、感想などを補って書くことはしません。
        </p>
        <p>
          「肉体副業メモ」が付いている場合、それは編集部が書いたものであり、募集内容そのものでは
          ありません。
        </p>
      </section>

      <section className="mt-8 space-y-3 text-sm leading-relaxed text-ink-200">
        <h2 className="text-base font-bold text-ink-50">免責事項</h2>
        <ul className="list-disc space-y-1 pl-5 text-ink-400">
          <li>
            掲載内容は、最終確認日時点で情報提供元のページに公開されていた内容です。その後に募集が
            終了・変更されている場合があります。最新の情報は公式ページで確認してください。
          </li>
          <li>
            当サイトは募集主体と閲覧者の間の契約に関与しません。応募・就業に関するトラブルについて
            責任を負いません。
          </li>
          <li>労働条件、安全管理、保険の有無などは、募集主体に直接確認してください。</li>
        </ul>
      </section>

      <section className="mt-8 space-y-3 text-sm leading-relaxed text-ink-200">
        <h2 className="text-base font-bold text-ink-50">掲載の削除・修正について</h2>
        <p>
          掲載内容の修正・削除のご依頼、掲載を希望されない場合は、情報元のURLを添えてご連絡ください。
          確認のうえ対応します。
        </p>
        <p className="text-ink-400">連絡先：（公開時に記載）</p>
      </section>

      <section className="mt-8 space-y-3 text-sm leading-relaxed text-ink-200">
        <h2 className="text-base font-bold text-ink-50">アクセス解析について</h2>
        <p>
          どのページが見られ、どの案件から公式サイトへ移動されたかを把握するため、
          ページの閲覧とリンクのクリックを記録しています。氏名、メールアドレス、IPアドレスなどの
          個人を特定する情報は保存していません。
        </p>
      </section>
    </div>
  );
}
