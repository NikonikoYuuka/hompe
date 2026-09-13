import { defineCloudflareConfig } from "@opennextjs/cloudflare";

/**
 * OpenNext (Cloudflare) の設定。
 *
 * V0.1 では incrementalCache / queue / tagCache を使わない。
 * 公開ページは force-dynamic で D1 から直接読むため、追加の KV 等を必要としない
 * （docs/08_ARCHITECTURE.md）。必要になったら R2 / KV を足す。
 */
export default defineCloudflareConfig();
