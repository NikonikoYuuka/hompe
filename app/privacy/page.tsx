import Link from "next/link";
import type { Metadata } from "next";
import { adsenseClientId } from "../../lib/ads";

export const metadata: Metadata = { title: "プライバシーポリシー" };

/**
 * プライバシーポリシー / Cookie / 外部送信の公表 (spec §47)。
 *
 * 満たしている要件:
 *   - AdSense のポリシーが求める、第三者配信事業者による Cookie 利用の開示
 *   - 改正電気通信事業法（外部送信規律）が求める外部送信の公表
 *   - オプトアウト手段の案内
 *
 * EEA / UK / スイスへの配信には Google 認定 CMP が別途必要（docs/09_MONETIZATION.md）。
 */
export default function PrivacyPage() {
  const adsConfigured = Boolean(adsenseClientId());

  return (
    <div className="mx-auto max-w-3xl px-5 py-10">
      <h1 className="text-2xl font-bold text-ink-50">プライバシーポリシー</h1>

      <section className="mt-8 space-y-3 text-sm leading-relaxed text-ink-200">
        <h2 className="text-base font-bold text-ink-50">取得する情報</h2>
        <p>
          肉体副業はアカウント登録を必要としません。氏名、メールアドレス、電話番号などを
          入力していただく仕組みはなく、保存もしていません。
        </p>
        <p>
          どのページが見られ、どの案件から公式サイトへ移動されたかを把握するため、
          ページの閲覧とリンクのクリックを記録しています。記録するのは、
          閲覧されたページのパス、案件の識別子、ブラウザのタブごとに発行されるランダムな文字列
          だけです。IPアドレスやブラウザの情報は保存していません。
        </p>
        <p>
          このランダムな文字列は、ブラウザのタブを閉じると消えます（sessionStorage）。
          他のサイトでの行動を追跡する目的には使用しません。
        </p>
      </section>

      <section className="mt-8 space-y-3 text-sm leading-relaxed text-ink-200">
        <h2 className="text-base font-bold text-ink-50">広告について</h2>
        {adsConfigured ? (
          <>
            <p>
              当サイトは第三者配信の広告サービス「Google AdSense」を利用しています。
            </p>
            <p>
              Google を含む第三者配信事業者は、Cookie を使用して、ユーザーが当サイトや
              他のサイトに過去にアクセスした際の情報に基づいて広告を配信することがあります。
            </p>
            <p>
              Google が広告 Cookie を使用することにより、ユーザーは
              <a
                href="https://adssettings.google.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-ink-50"
              >
                広告設定
              </a>
              でパーソナライズ広告を無効にできます。詳細は
              <a
                href="https://policies.google.com/technologies/ads"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-ink-50"
              >
                「広告 – ポリシーと規約 – Google」
              </a>
              をご確認ください。
            </p>
          </>
        ) : (
          <p>現在、当サイトは広告を配信していません。</p>
        )}
      </section>

      <section className="mt-8 space-y-3 text-sm leading-relaxed text-ink-200">
        <h2 className="text-base font-bold text-ink-50">外部送信について</h2>
        <p>
          電気通信事業法に基づき、当サイトから利用者の端末情報が外部へ送信される場合について
          公表します。
        </p>
        <div className="overflow-x-auto">
          <table className="mt-2 w-full min-w-[520px] border-collapse text-xs">
            <thead>
              <tr className="border-b border-ink-700 text-left text-ink-400">
                <th className="py-2 pr-4 font-normal">送信先</th>
                <th className="py-2 pr-4 font-normal">送信される情報</th>
                <th className="py-2 pr-4 font-normal">利用目的</th>
                <th className="py-2 font-normal">停止方法</th>
              </tr>
            </thead>
            <tbody className="text-ink-200">
              {adsConfigured && (
                <tr className="border-b border-ink-800 align-top">
                  <td className="py-3 pr-4">Google LLC（Google AdSense）</td>
                  <td className="py-3 pr-4">Cookie、閲覧ページの URL、ブラウザの情報</td>
                  <td className="py-3 pr-4">広告の配信および効果測定</td>
                  <td className="py-3">
                    <a
                      href="https://adssettings.google.com/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline"
                    >
                      Google 広告設定
                    </a>
                    、またはブラウザの Cookie 設定
                  </td>
                </tr>
              )}
              <tr className="align-top">
                <td className="py-3 pr-4">肉体副業（当サイト）</td>
                <td className="py-3 pr-4">
                  閲覧ページのパス、案件の識別子、タブごとのランダムな文字列
                </td>
                <td className="py-3 pr-4">どの案件が見られているかの把握</td>
                <td className="py-3">ブラウザの JavaScript を無効にする</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-8 space-y-3 text-sm leading-relaxed text-ink-200">
        <h2 className="text-base font-bold text-ink-50">お問い合わせ</h2>
        <p className="text-ink-400">連絡先：（公開時に記載）</p>
        <p>
          サービスの内容については
          <Link href="/about" className="underline hover:text-ink-50">
            このサイトについて
          </Link>
          をご覧ください。
        </p>
      </section>
    </div>
  );
}
