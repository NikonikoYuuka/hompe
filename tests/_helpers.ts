import assert from "node:assert/strict";
import {
  extractListing,
  type ExtractInput,
  type ExtractedListing,
  type RejectGate
} from "../lib/extract";

/**
 * テスト用の薄いラッパ。
 *
 * `extractListing` は「Listing」か「却下＋理由」を返すので、
 * どちらを期待しているかをテスト側で明示する。
 * 失敗時に却下理由がそのままメッセージに出る。
 */

export function expectListing(input: ExtractInput): ExtractedListing {
  const outcome = extractListing(input);
  if (outcome.kind !== "listing") {
    assert.fail(`掲載対象になるはずが却下された: [${outcome.gate}] ${outcome.reason}`);
  }
  return outcome.facts;
}

export function expectRejected(input: ExtractInput): { gate: RejectGate; reason: string } {
  const outcome = extractListing(input);
  if (outcome.kind !== "rejected") {
    assert.fail(`却下されるはずが掲載対象になった: ${outcome.facts.title}`);
  }
  return outcome;
}
