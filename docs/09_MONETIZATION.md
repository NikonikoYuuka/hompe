# 09. MONETIZATION / ADSENSE

> spec §47。V0.1 は **広告収益最大化システムではなく、
> AdSense を安全に設置・変更できる構造** を作る。

---

## 1. 実装前に確認した要件

AdSense を入れる前に、事実として確認した事項。

### 1-1. EEA / UK / スイスへの配信には Google 認定 CMP が必須

2024年1月16日以降、AdSense / Ad Manager / AdMob で EEA・UK のユーザーへ広告を
配信する場合、**Google 認定かつ IAB TCF 連携済みの CMP** の利用が必須。
満たさない場合、パーソナライズ広告の配信対象外になる。

**対応方針（V0.1）**: AdSense 管理画面の「プライバシーとメッセージ」から
Google 自身の CMP メッセージを有効化する。これは Google 認定 CMP であり、
**AdSense のタグ経由で配信されるためサイト側の追加実装を必要としない**。

→ つまり、この要件はコードではなく **AdSense 管理画面の設定**で満たす。
　 自前の同意バナーを実装すると、認定 CMP の要件を満たさないまま
　 「対応したつもり」になる危険があるので実装しない。

出典:
- [New Google consent management requirements for publishers serving ads in the EEA and UK (AdSense Help)](https://support.google.com/adsense/answer/13866773)
- [Google consent management requirements for serving ads in the EEA, the UK, and Switzerland (AdSense Help)](https://support.google.com/adsense/answer/13554116?hl=en)
- [Publish my European regulations message for me using Google's CMP (AdSense Help)](https://support.google.com/adsense/answer/13790256?hl=en)

### 1-2. プライバシーポリシーでの開示

AdSense のポリシー上、第三者配信事業者が Cookie を使用して広告を配信すること、
およびユーザーが Google の広告設定で無効化できることの開示が必要。

**対応**: `/privacy` を新規作成し、開示文とオプトアウト導線を設置済み。

### 1-3. 改正電気通信事業法（外部送信規律）

2023年6月16日施行。日本のサイト運営者は、利用者の端末情報を外部へ送信する場合、
その内容を通知または公表する義務がある。AdSense のような広告タグも対象。

**対応**: `/privacy` に「外部送信について」の表（送信先 / 送信される情報 /
利用目的 / 停止方法）を設置済み。広告が未設定のときは AdSense の行を表示しない。

出典:
- [総務省: 自分に関する情報が第三者に送信される場合、自身で確認できるようになります](https://www.soumu.go.jp/main_sosiki/joho_tsusin/d_syohi/gaibusoushin_kiritsu.html)

### 1-4. hosting の利用規約

**Vercel Hobby（無料）は AdSense を掲載できない。**
Vercel の Fair Use Guidelines が Hobby を非商用の個人利用に限定し、
広告掲載（Google AdSense を名指し）を commercial usage として例示している。

→ **Cloudflare Workers + D1 の無料枠を採用した（D-020）。**
Cloudflare の無料枠には一般的な商用利用禁止条項がないため、AdSense を掲載できる。

出典:
- [Vercel Fair Use Guidelines](https://vercel.com/docs/limits/fair-use-guidelines)
- [Vercel Hobby Plan](https://vercel.com/docs/plans/hobby)

---

## 2. 実装したもの

### 2-1. 設定はすべて環境変数

ID を一切ハードコードしていない（`lib/ads.ts`）。

| 変数 | 内容 |
| --- | --- |
| `NEXT_PUBLIC_ADSENSE_CLIENT` | パブリッシャー ID（`ca-pub-...`）。公開値なので secret ではない |
| `NEXT_PUBLIC_ADS_ENABLED` | `"true"` のときだけ配信。**production 環境にのみ設定する** |
| `NEXT_PUBLIC_ADSENSE_SLOT_TOP` | TOP の広告ユニット |
| `NEXT_PUBLIC_ADSENSE_SLOT_LISTING_LIST` | 一覧の広告ユニット |
| `NEXT_PUBLIC_ADSENSE_SLOT_LISTING_DETAIL` | 詳細の広告ユニット |
| `NEXT_PUBLIC_ADSENSE_SLOT_ARTICLE` | 将来の記事ページ用 |

### 2-2. 環境ガード

```
配信する  = NODE_ENV === "production"
          && NEXT_PUBLIC_ADS_ENABLED === "true"
          && パブリッシャー ID が ca-pub- 形式
          && その枠のスロット ID が設定されている
```

- development では配信せず、枠の位置を示す点線のプレースホルダのみ表示する
  （レイアウト確認用。`NEXT_PUBLIC_ADS_ENABLED=true` のときのみ）
- preview / staging では `NEXT_PUBLIC_ADS_ENABLED` を設定しないことで
  production 広告の誤表示を防ぐ
- 何も設定しなければ広告関連の DOM も script も一切出ない

### 2-3. component

| ファイル | 役割 |
| --- | --- |
| `lib/ads.ts` | 設定と判断のみ。**listings / DB を import しない**（§48 rule 13、テストで検証） |
| `app/_components/ad-script.tsx` | AdSense script を root layout で **1回だけ** 読み込む |
| `app/_components/ad-slot.tsx` | 再利用可能な広告枠。Listing のデータを受け取らない |
| `app/ads.txt/route.ts` | ads.txt を環境変数から生成。未設定なら 404 |

`AdSlot` から script を読み込まないことをテストで固定している。

### 2-4. CLS 対策

枠ごとに予約高さ（`RESERVED_HEIGHT`）を持ち、読み込み前から
`min-height` で場所を確保する。広告が来なくても高さが確保されるだけで、
レイアウトは崩れない。

`strategy="afterInteractive"` で読み込むため、初期表示をブロックしない。

### 2-5. 誤認防止（重要）

- 一覧では **`<ul>` の中に広告を入れない**。グリッドの外、下に1枠だけ置く
- Listing カードとは異なる見た目にする（枠線・背景・角丸を合わせない）
- すべての枠に `広告` ラベルと `aria-label="広告"` を付ける
- 詳細ページでは CTA ボタンから離し、ページ最下部に置く（誤クリック防止）

### 2-6. 掲載位置（V0.1）

| ページ | 位置 | 枠数 |
| --- | --- | --- |
| TOP | 「最近の掲載」の下 | 1 |
| Listing 一覧 | 一覧グリッドの下 | 1 |
| Listing 詳細 | 情報元・最終確認の下（CTA から離す） | 1 |
| 記事ページ | 未実装。component は準備済み | 0 |

**広告だらけにしない。** V0.1 は1ページ1枠まで。

---

## 3. 有効化の手順

1. Cloudflare へデプロイする（`docs/08_ARCHITECTURE.md` §4.2）
2. AdSense でサイトを追加し、審査を通す
3. AdSense 管理画面 →「プライバシーとメッセージ」→ 欧州の規制に関する
   メッセージを有効化（Google の CMP を使う）
4. 広告ユニットを作成し、スロット ID を控える
5. `/privacy` の連絡先を実際の窓口に書き換える
6. `NEXT_PUBLIC_ADSENSE_*` と `NEXT_PUBLIC_ADS_ENABLED=true` を
   **ビルド時の環境変数**として設定し、デプロイし直す
   （`NEXT_PUBLIC_*` はビルドに焼き込まれるので Worker の変数にしても効かない）
7. `/ads.txt` が 200 を返すことを確認する

コードの変更は不要。

---

## 4. 将来の収益化候補（V0.1 では実装しない）

`docs/06_FUTURE_DESIGN.md` にも記載。

- 交通 / 宿泊 / レンタカー / 仕事用品等の Affiliate
- PR / Featured Listing
- Employer direct listing
- B2B
- その他適法な Referral

**PR / Featured Listing を入れる場合の注意**: 通常の Listing と見分けが付く表示が
必須になる。Fact Layer と Brand Layer の分離（D-006）と同じ理由で、
「広告である案件」と「編集として選んだ案件」を混ぜない。

---

## 5. 守ること

- AdSense 実装によって Product Validation を妨げない。
  **`official_source_click` が下がるような配置にしない。**
  詳細ページの広告を CTA の上に置かないのはこのため
- 自分でクリックしない
- 広告を Listing に見せかけない
- 1ページの枠を増やしたくなったら、まず `official_source_click` への影響を見る
