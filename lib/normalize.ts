import { createHash } from "node:crypto";

/**
 * HTML を「意味のある本文」に落としてから hash する。
 *
 * 目的は変更検知だけ。DOM パーサは入れない（依存を増やさない / 汎用 crawler を作らない D-013）。
 * noise が落ちきらずに changed が多発する Source が出た場合は、
 * sources.content_selector を使って adapter 側で本文領域を絞る。
 */

/** hash 対象から丸ごと落とすタグ */
const DROPPED_BLOCKS = [
  "script",
  "style",
  "noscript",
  "template",
  "svg",
  "iframe",
  "nav",
  "header",
  "footer"
];

/** 毎回変わるが意味を持たない文字列（CSRF トークン / ビルドID / 現在時刻表示など） */
const DYNAMIC_NOISE: RegExp[] = [
  /\b[0-9a-f]{32,}\b/gi, // 長い16進トークン
  /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, // UUID
  /\?(?:v|ver|version|t|ts|cb|_)=\d+/gi, // cache buster クエリ
  /\b\d{4}[-/]\d{1,2}[-/]\d{1,2}[ T]\d{1,2}:\d{2}(?::\d{2})?\b/g, // 現在日時表示
  /\b\d{1,2}:\d{2}:\d{2}\b/g
];

export function stripHtml(html: string): string {
  let out = html;

  // コメント
  out = out.replace(/<!--[\s\S]*?-->/g, " ");

  // 丸ごと落とすブロック
  for (const tag of DROPPED_BLOCKS) {
    out = out.replace(new RegExp(`<${tag}\\b[^>]*>[\\s\\S]*?</${tag}>`, "gi"), " ");
    out = out.replace(new RegExp(`<${tag}\\b[^>]*/?>`, "gi"), " ");
  }

  // 残りのタグ
  out = out.replace(/<[^>]+>/g, " ");

  // 主要な HTML entity のみ戻す（表示用ではなく比較用なので最小限）
  out = out
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'");

  return out;
}

/** hash 比較用に正規化した本文テキストを返す */
export function normalizeContent(html: string): string {
  let out = stripHtml(html);
  for (const pattern of DYNAMIC_NOISE) {
    out = out.replace(pattern, " ");
  }
  return out.replace(/\s+/g, " ").trim();
}

export function contentHash(html: string): string {
  return createHash("sha256").update(normalizeContent(html), "utf8").digest("hex");
}

/** 任意のオブジェクトを安定した順序で hash する（Fact Cache 用 D-014） */
export function factHash(facts: Record<string, unknown>): string {
  const stable = Object.keys(facts)
    .sort()
    .map((key) => `${key}=${JSON.stringify(facts[key] ?? null)}`)
    .join("\n");
  return createHash("sha256").update(stable, "utf8").digest("hex");
}

/** <script type="application/ld+json"> の中身をそのまま取り出す（正規化前の HTML に対して使う） */
export function extractJsonLdBlocks(html: string): string[] {
  const blocks: string[] = [];
  const pattern =
    /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(html)) !== null) {
    blocks.push(match[1].trim());
  }
  return blocks;
}

/** <title> と <h1> を取り出す（タイトル抽出のフォールバック） */
export function extractHeadings(html: string): { title: string | null; h1: string | null } {
  const titleMatch = /<title\b[^>]*>([\s\S]*?)<\/title>/i.exec(html);
  const h1Match = /<h1\b[^>]*>([\s\S]*?)<\/h1>/i.exec(html);
  const clean = (raw: string | undefined) =>
    raw ? stripHtml(raw).replace(/\s+/g, " ").trim() || null : null;
  return { title: clean(titleMatch?.[1]), h1: clean(h1Match?.[1]) };
}
