import { before, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

/**
 * 広告設定のガード (spec §47)。
 *
 * Next.js では NEXT_PUBLIC_* はビルド時に定数として埋め込まれる。
 * ここでは「どの条件で配信するか」というガードの判断を検証する。
 */

// スロット ID はモジュール読み込み時に確定するので、import より先に設定する。
process.env.NEXT_PUBLIC_ADSENSE_SLOT_TOP = "1234567890";
delete process.env.NEXT_PUBLIC_ADSENSE_SLOT_ARTICLE;

type Ads = typeof import("../lib/ads");
let ads: Ads;

before(async () => {
  ads = (await import("../lib/ads")) as Ads;
});

/** 呼び出し時に読まれる環境変数だけを差し替える */
function setEnv(env: {
  nodeEnv?: string;
  enabled?: string;
  client?: string;
}) {
  // NODE_ENV は型定義上 readonly なので、可変な view 経由で差し替える
  const mutable = process.env as Record<string, string | undefined>;

  if (env.nodeEnv === undefined) delete mutable.NODE_ENV;
  else mutable.NODE_ENV = env.nodeEnv;

  if (env.enabled === undefined) delete process.env.NEXT_PUBLIC_ADS_ENABLED;
  else process.env.NEXT_PUBLIC_ADS_ENABLED = env.enabled;

  if (env.client === undefined) delete process.env.NEXT_PUBLIC_ADSENSE_CLIENT;
  else process.env.NEXT_PUBLIC_ADSENSE_CLIENT = env.client;
}

const VALID_CLIENT = "ca-pub-0000000000000000";

test("未設定なら広告を描画しない（レイアウトは壊れない）", () => {
  setEnv({ nodeEnv: "production" });
  assert.equal(ads.adsEnabled(), false);
  assert.equal(ads.shouldRenderAd("top"), false);
});

test("development では production 広告を配信しない", () => {
  setEnv({ nodeEnv: "development", enabled: "true", client: VALID_CLIENT });
  assert.equal(ads.adsEnabled(), false, "配信しない");
  assert.equal(ads.adsPlaceholderVisible(), true, "枠の位置だけは確認できる");
});

test("production かつ明示的に有効化された場合だけ配信する", () => {
  setEnv({ nodeEnv: "production", enabled: "true", client: VALID_CLIENT });
  assert.equal(ads.adsEnabled(), true);
  assert.equal(ads.shouldRenderAd("top"), true);
  // スロット ID を設定していない枠は描画しない
  assert.equal(ads.shouldRenderAd("article"), false);
});

test("有効化フラグがなければ production でも配信しない", () => {
  setEnv({ nodeEnv: "production", client: VALID_CLIENT });
  assert.equal(ads.adsEnabled(), false);
  assert.equal(ads.shouldRenderAd("top"), false);
});

test("不正な形式のパブリッシャー ID を受け付けない", () => {
  setEnv({ nodeEnv: "production", enabled: "true", client: "pub-0000000000000000" });
  assert.equal(ads.adsenseClientId(), undefined);
  assert.equal(ads.adsEnabled(), false);
});

test("ads.txt 用の ID は ca- を外した形になる", () => {
  setEnv({ client: "ca-pub-1234567890123456" });
  assert.equal(ads.adsensePublisherId(), "pub-1234567890123456");
});

test("広告設定は Listing の domain logic を import しない (§48 rule 13)", () => {
  const source = readFileSync(new URL("../lib/ads.ts", import.meta.url), "utf8");
  assert.ok(!/from ["'][^"']*listings["']/.test(source), "listings を import していない");
  assert.ok(!/from ["'][^"']*supabase["']/.test(source), "supabase を import していない");
});

test("詳細ページの広告は CTA より後ろに置く（誤クリック防止 / spec §47）", () => {
  const page = readFileSync(new URL("../app/listings/[id]/page.tsx", import.meta.url), "utf8");
  const cta = page.indexOf("<OfficialSourceLink");
  const ad = page.indexOf('<AdSlot placement="listing_detail"');
  assert.ok(cta > 0 && ad > 0, "CTA と広告枠の両方がある");
  assert.ok(ad > cta, "広告は CTA より後ろ");
});

test("一覧の広告は Listing のリストの外に置く（案件と誤認させない / spec §47）", () => {
  const page = readFileSync(new URL("../app/listings/page.tsx", import.meta.url), "utf8");
  const insideList = /<ul[^>]*>[\s\S]*?<AdSlot[\s\S]*?<\/ul>/.test(page);
  assert.equal(insideList, false, "<ul> の中に広告を入れない");
  assert.ok(page.includes('<AdSlot placement="listing_list" />'));
});

test("AdSense script は root layout の1箇所からしか読み込まない (spec §47)", () => {
  const slot = readFileSync(new URL("../app/_components/ad-slot.tsx", import.meta.url), "utf8");
  assert.ok(
    !slot.includes("pagead2.googlesyndication.com"),
    "AdSlot から script を読み込まない"
  );

  const layout = readFileSync(new URL("../app/layout.tsx", import.meta.url), "utf8");
  assert.ok(layout.includes("<AdScript />"), "root layout で1回だけ読み込む");
});
